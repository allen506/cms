import { query, execute } from "@/lib/db-async";

const PROXY_API_URL = "https://tipodecambio.paginasweb.cr/api";
const BCCR_WS_URL =
  "https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicos";
const BCCR_INDICATOR_BUY = "317"; // compra
const BCCR_INDICATOR_SELL = "318"; // venta
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface ExchangeRate {
  /** Canonical CRC->USD conversion rate (BCCR sell/venta). */
  rate: number;
  /** BCCR buy rate (compra). */
  compra: number;
  /** BCCR sell rate (venta) - used for customer pricing. */
  venta: number;
  /** Date the rate applies to (ISO yyyy-mm-dd). */
  fecha: string;
  /** Source of the rate: 'BCCR', 'cache', or 'fallback'. */
  source: string;
  cachedAt: string;
  isFallback?: boolean;
}

/** Fallback rate used if every source is unreachable. */
export const FALLBACK_RATE = 464.54;

/** Convert CRC to USD using the given rate (sell/venta). */
export function crcToUsd(crc: number, rate: number): number {
  return Math.round((crc / rate) * 100) / 100;
}

async function getSetting(key: string): Promise<string | null> {
  try {
    const rows = await query<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = $1 LIMIT 1",
      [key]
    );
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

/** Parse the first numeric NUM_VALOR from a BCCR WS XML response. */
function parseBccrValue(xml: string): number | null {
  const match = xml.match(/<NUM_VALOR>([\d.,]+)<\/NUM_VALOR>/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return isFinite(value) && value > 0 ? value : null;
}

function ddmmyyyy(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

/** Fetch a single BCCR indicator (official web service). Requires token + email. */
async function fetchBccrIndicator(
  indicator: string,
  email: string,
  token: string,
  name: string
): Promise<number | null> {
  const today = ddmmyyyy(new Date());
  const params = new URLSearchParams({
    Indicador: indicator,
    FechaInicio: today,
    FechaFinal: today,
    Nombre: name || "CMS",
    SubNiveles: "N",
    CorreoElectronico: email,
    Token: token,
  });
  const res = await fetch(`${BCCR_WS_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "cms-sportswear/1.0" },
  });
  if (!res.ok) throw new Error(`BCCR HTTP ${res.status}`);
  const xml = await res.text();
  return parseBccrValue(xml);
}

/** Try the official BCCR web service. Returns null if not configured or unavailable. */
async function fetchFromBccr(): Promise<{ compra: number; venta: number } | null> {
  const token = await getSetting("bccr_token");
  const email = await getSetting("bccr_email");
  const name = (await getSetting("bccr_name")) || "CMS";
  if (!token || !email) return null;

  try {
    const [compra, venta] = await Promise.all([
      fetchBccrIndicator(BCCR_INDICATOR_BUY, email, token, name),
      fetchBccrIndicator(BCCR_INDICATOR_SELL, email, token, name),
    ]);
    if (!venta) return null;
    return { compra: compra ?? venta, venta };
  } catch (err) {
    console.error("[exchange-rate] BCCR WS failed:", err);
    return null;
  }
}

/** Try the tipodecambio proxy (also BCCR-sourced). */
async function fetchFromProxy(): Promise<{
  compra: number;
  venta: number;
  fecha: string;
} | null> {
  try {
    const res = await fetch(PROXY_API_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "cms-sportswear/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: { compra: number; venta: number; fecha: string } =
      await res.json();
    const compra = Number(data.compra);
    const venta = Number(data.venta);
    if (!isFinite(venta) || venta <= 0) return null;
    return {
      compra: isFinite(compra) && compra > 0 ? compra : venta,
      venta,
      fecha: data.fecha,
    };
  } catch (err) {
    console.error("[exchange-rate] proxy fetch failed:", err);
    return null;
  }
}

async function readCache(): Promise<{
  buy_crc: number;
  sell_crc: number;
  fecha: string | null;
  created_at: string;
} | null> {
  try {
    const rows = await query<{
      buy_crc: number;
      sell_crc: number;
      fecha: string | null;
      created_at: string;
    }>(
      "SELECT buy_crc, sell_crc, fecha, created_at FROM exchange_rates ORDER BY id DESC LIMIT 1",
      []
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function writeCache(
  source: string,
  buy: number,
  sell: number,
  fecha: string
): Promise<void> {
  try {
    await execute(
      "INSERT INTO exchange_rates (source, buy_crc, sell_crc, fecha) VALUES ($1, $2, $3, $4)",
      [source, buy, sell, fecha || null]
    );
    await execute(
      "DELETE FROM exchange_rates WHERE id NOT IN (SELECT id FROM exchange_rates ORDER BY id DESC LIMIT 100)",
      []
    );
  } catch (err) {
    console.error("[exchange-rate] cache write failed:", err);
  }
}

/**
 * Returns the current CRC->USD exchange rate using the official BCCR sell (venta) rate.
 * Source priority: BCCR web service -> tipodecambio proxy -> DB cache -> FALLBACK_RATE.
 * Caches in the PostgreSQL exchange_rates table; refreshes when older than 6 hours.
 */
export async function getExchangeRate(
  forceRefresh = false
): Promise<ExchangeRate> {
  const cached = await readCache();

  if (cached && !forceRefresh) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime();
    if (ageMs < CACHE_TTL_MS) {
      const sell = Number(cached.sell_crc);
      return {
        rate: sell,
        compra: Number(cached.buy_crc),
        venta: sell,
        fecha: (cached.fecha || "").toString().slice(0, 10),
        source: "cache",
        cachedAt: cached.created_at,
      };
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  // 1) Official BCCR web service
  const bccr = await fetchFromBccr();
  if (bccr) {
    await writeCache("BCCR", bccr.compra, bccr.venta, todayIso);
    return {
      rate: bccr.venta,
      compra: bccr.compra,
      venta: bccr.venta,
      fecha: todayIso,
      source: "BCCR",
      cachedAt: new Date().toISOString(),
    };
  }

  // 2) Proxy (BCCR-sourced)
  const proxy = await fetchFromProxy();
  if (proxy) {
    const fecha = (proxy.fecha || todayIso).slice(0, 10);
    await writeCache("BCCR", proxy.compra, proxy.venta, fecha);
    return {
      rate: proxy.venta,
      compra: proxy.compra,
      venta: proxy.venta,
      fecha,
      source: "BCCR",
      cachedAt: new Date().toISOString(),
    };
  }

  // 3) Stale cache
  if (cached) {
    const sell = Number(cached.sell_crc);
    return {
      rate: sell,
      compra: Number(cached.buy_crc),
      venta: sell,
      fecha: (cached.fecha || "").toString().slice(0, 10),
      source: "cache",
      cachedAt: cached.created_at,
      isFallback: true,
    };
  }

  // 4) Hard fallback
  return {
    rate: FALLBACK_RATE,
    compra: FALLBACK_RATE,
    venta: FALLBACK_RATE,
    fecha: "",
    source: "fallback",
    cachedAt: "",
    isFallback: true,
  };
}
