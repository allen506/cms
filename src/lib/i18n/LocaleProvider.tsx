"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  Locale,
  Currency,
  translate,
} from "@/lib/i18n/dictionary";

interface LocaleContextValue {
  locale: Locale;
  currency: Currency;
  rate: number; // CRC per USD (BCCR sell)
  fxFecha: string | null;
  fxIsFallback: boolean;
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  t: (key: string) => string;
  /** Format an amount given in CRC into the active currency. */
  formatMoney: (amountCrc: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${oneYear}`;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [rate, setRate] = useState<number>(500);
  const [fxFecha, setFxFecha] = useState<string | null>(null);
  const [fxIsFallback, setFxIsFallback] = useState<boolean>(false);

  // Hydrate from cookies on mount
  useEffect(() => {
    const cookieLocale = readCookie("locale");
    if (cookieLocale === "en" || cookieLocale === "es") {
      setLocaleState(cookieLocale);
    }
    const cookieCurrency = readCookie("currency");
    if (cookieCurrency === "USD" || cookieCurrency === "CRC") {
      setCurrencyState(cookieCurrency);
    }
  }, []);

  // Fetch exchange rate once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/exchange-rate");
        if (res.ok) {
          const data = await res.json();
          if (data.rate) setRate(data.rate);
          if (data.fecha) setFxFecha(data.fecha);
          setFxIsFallback(Boolean(data.isFallback));
        }
      } catch {
        // keep default rate
      }
    })();
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    writeCookie("locale", l);
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    writeCookie("currency", c);
  }, []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const formatMoney = useCallback(
    (amountCrc: number) => {
      if (currency === "CRC") {
        return `₡${Math.round(amountCrc).toLocaleString(
          locale === "es" ? "es-CR" : "en-US"
        )}`;
      }
      const usd = rate > 0 ? amountCrc / rate : 0;
      return `$${usd.toLocaleString(locale === "es" ? "es-CR" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currency, rate, locale]
  );

  return (
    <LocaleContext.Provider
      value={{
        locale,
        currency,
        rate,
        fxFecha,
        fxIsFallback,
        setLocale,
        setCurrency,
        t,
        formatMoney,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
