"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PricingTier {
  min_qty: number;
  max_qty: number;
  price_crc: number;
  price_usd: number;
  original_crc?: number;
  original_usd?: number;
}

interface Adjustment {
  type: "percent" | "fixed";
  value: number;
  label: string | null;
}

interface Addon {
  id: string;
  name: string;
  price_crc: number;
  price_usd: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  sort_order: number;
  example_url?: string | null;
  image_url?: string | null;
  teamQty?: number;
  locked?: boolean;
  fit_options?: string | null;
  hasOverride: boolean;
  adjustment?: Adjustment | null;
  pricing: PricingTier[];
  addons?: Addon[];
}

interface CartItem {
  key: string;
  productId: string;
  productName: string;
  designId: string;
  designName: string;
  sizeId: string;
  sizeName: string;
  fit: string | null;
  quantity: number;
  unitCrc: number;
  unitUsd: number;
  addonIds: string[];
}

// Approved/assigned design for the team. categories = product categories it
// applies to (empty = all products).
interface ApprovedDesign {
  id: string;
  name: string;
  categories: string[];
  imageUrl: string | null;
}

interface CatalogSize {
  id: string;
  name: string;
  sort_order?: number;
}

interface ProductSelectionFormProps {
  teamName: string;
  designRequestId?: string;
  onSuccess?: (orderId: string) => void;
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export default function ProductSelectionForm({
  teamName,
  designRequestId,
  onSuccess,
}: ProductSelectionFormProps) {
  const { formatMoney, fxFecha, fxIsFallback, rate } = useLocale();

  const [products, setProducts] = useState<Product[]>([]);
  const [designs, setDesigns] = useState<ApprovedDesign[]>([]);
  const [sizes, setSizes] = useState<CatalogSize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);
  const [notes, setNotes] = useState("");

  // In-progress line-item builder.
  const [productId, setProductId] = useState("");
  const [designId, setDesignId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [fit, setFit] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addonIds, setAddonIds] = useState<string[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsRes = await fetch("/api/team/products", {
          headers: { "x-tenant-slug": teamName.toLowerCase() },
        });
        if (!productsRes.ok) throw new Error("Failed to load products");
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);

        const designsRes = await fetch("/api/team/approved-designs", {
          headers: { "x-tenant-slug": teamName.toLowerCase() },
        });
        if (designsRes.ok) {
          const d = await designsRes.json();
          setDesigns(d.designs || []);
        }

        const catalogRes = await fetch("/api/catalog");
        if (catalogRes.ok) {
          const catalog = await catalogRes.json();
          setSizes(catalog.sizes || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [teamName]);

  const availableProducts = products.filter((p) => !p.locked);
  const selectedProduct = products.find((p) => p.id === productId);

  const normalizeCategory = (category?: string) => {
    const value = (category || "").toLowerCase();
    if (!value || value === "other") return "other";
    if (value.includes("jersey")) return "jersey";
    if (value.includes("bib")) return "bib";
    if (value.includes("vest")) return "vest";
    if (value.includes("glove")) return "gloves";
    if (value.includes("sock")) return "socks";
    if (value.includes("short")) return "shorts";
    if (value.includes("long")) return "jersey";
    return value;
  };

  const categoryOrder = ["jersey", "enduro-short", "enduro-long", "bib", "vest", "gloves", "shorts", "socks", "other"];
  const categoryLabels: Record<string, string> = {
    jersey: "Jerseys",
    "enduro-short": "Enduro Short Sleeve",
    "enduro-long": "Enduro Long Sleeve",
    "enduro-jersey": "Enduro Jerseys",
    "cycling-jersey": "Cycling Jerseys",
    "pro-jersey": "Pro Jerseys",
    "wind-vest": "Wind Vests",
    bib: "Bibs",
    "bib-licra": "Bib / Licra",
    vest: "Vests",
    gloves: "Gloves",
    shorts: "Shorts",
    socks: "Socks",
    other: "Other",
  };
  const categoryIcons: Record<string, string> = {
    jersey: "🚴",
    "enduro-short": "👕",
    "enduro-long": "🏔️",
    "enduro-jersey": "🚴",
    "cycling-jersey": "🚴",
    "pro-jersey": "🚴",
    "wind-vest": "🧥",
    bib: "🩱",
    "bib-licra": "🩱",
    vest: "🧥",
    gloves: "🧤",
    shorts: "🩳",
    socks: "🧦",
    other: "🧵",
  };

  const categoryThumbStyles: Record<string, { bg: string; accent: string; icon: string }> = {
    jersey: { bg: "from-[#f5ead9] via-[#f9f2e9] to-[#f1e2c8]", accent: "text-[#a15b2a]", icon: "🚴" },
    "enduro-short": { bg: "from-[#f5ead9] via-[#f9f2e9] to-[#f1e2c8]", accent: "text-[#a15b2a]", icon: "👕" },
    "enduro-long": { bg: "from-[#f5ead9] via-[#f9f2e9] to-[#f1e2c8]", accent: "text-[#a15b2a]", icon: "🏔️" },
    "enduro-jersey": { bg: "from-[#f5ead9] via-[#f9f2e9] to-[#f1e2c8]", accent: "text-[#a15b2a]", icon: "🚴" },
    "cycling-jersey": { bg: "from-[#f5ead9] via-[#f9f2e9] to-[#f1e2c8]", accent: "text-[#a15b2a]", icon: "🚴" },
    "pro-jersey": { bg: "from-[#f5ead9] via-[#f9f2e9] to-[#f1e2c8]", accent: "text-[#a15b2a]", icon: "🚴" },
    "wind-vest": { bg: "from-[#e8edf3] via-[#f3f6f9] to-[#dde7ef]", accent: "text-[#4b5d74]", icon: "🧥" },
    bib: { bg: "from-[#f8e5ea] via-[#f9edf0] to-[#f3dce4]", accent: "text-[#9a4b5a]", icon: "🩱" },
    "bib-licra": { bg: "from-[#f8e5ea] via-[#f9edf0] to-[#f3dce4]", accent: "text-[#9a4b5a]", icon: "🩱" },
    vest: { bg: "from-[#e8edf3] via-[#f3f6f9] to-[#dde7ef]", accent: "text-[#4b5d74]", icon: "🧥" },
    gloves: { bg: "from-[#f0ebfb] via-[#f7f3ff] to-[#e5def9]", accent: "text-[#5d4b8b]", icon: "🧤" },
    shorts: { bg: "from-[#e7f4ea] via-[#edf8f1] to-[#dfeee4]", accent: "text-[#4d7c5d]", icon: "🩳" },
    socks: { bg: "from-[#e8eefc] via-[#eef4ff] to-[#dfeaf9]", accent: "text-[#4c698d]", icon: "🧦" },
    other: { bg: "from-[#f5efe7] via-[#faf5ee] to-[#efe2d2]", accent: "text-[#6d5b4a]", icon: "🧵" },
  };

  const isLikelyImageUrl = (value?: string | null) => {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    try {
      const url = new URL(trimmed);
      return /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(url.pathname) || /\/(images?|assets?)\//i.test(url.pathname);
    } catch {
      return /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(trimmed);
    }
  };

  const getProductThumb = (p: Product) => p.example_url || p.image_url || "";

  const groupedProducts = availableProducts.reduce<Record<string, Product[]>>((acc, product) => {
    const key = normalizeCategory(product.category);
    acc[key] = acc[key] || [];
    acc[key].push(product);
    return acc;
  }, {});

  const productCategories = [
    ...categoryOrder.filter((key) => groupedProducts[key]?.length),
    ...Object.keys(groupedProducts).filter((key) => !categoryOrder.includes(key)).sort(),
  ];

  // Gender/fit options for the selected product.
  const fitOptions: string[] = (() => {
    if (!selectedProduct?.fit_options) return ["unisex"];
    try {
      const parsed = JSON.parse(selectedProduct.fit_options);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ["unisex"];
    } catch {
      return ["unisex"];
    }
  })();

  // Designs available for the selected product (by its category).
  const designsForProduct: ApprovedDesign[] = selectedProduct
    ? designs.filter(
        (d) =>
          d.categories.length === 0 ||
          d.categories.includes(selectedProduct.category)
      )
    : [];

  // Unit price from the product's pricing tier. Volume pricing is team-wide, so
  // the tier is picked from the team's total quantity plus this line's quantity.
  const unitPriceFor = (product: Product, qty: number, addons: string[]) => {
    const tierQty = (product.teamQty || 0) + qty;
    const tier =
      product.pricing.find(
        (t) => tierQty >= t.min_qty && (t.max_qty == null || tierQty <= t.max_qty)
      ) || product.pricing[product.pricing.length - 1];
    let crc = tier ? tier.price_crc : 0;
    let usd = tier ? tier.price_usd : 0;
    for (const id of addons) {
      const a = product.addons?.find((x) => x.id === id);
      if (a) {
        crc += a.price_crc;
        usd += a.price_usd;
      }
    }
    return { crc, usd };
  };

  // Index of the pricing tier the team currently falls into for a product.
  const activeTierIndex = (product: Product, extraQty: number): number => {
    const q = (product.teamQty || 0) + extraQty;
    return product.pricing.findIndex(
      (t) => q >= t.min_qty && (t.max_qty == null || q <= t.max_qty)
    );
  };

  const resetBuilder = () => {
    setProductId("");
    setDesignId("");
    setSizeId("");
    setFit("");
    setQuantity(1);
    setAddonIds([]);
  };

  const selectProduct = (id: string) => {
    setProductId(id);
    setDesignId("");
    setSizeId("");
    setFit("");
    setQuantity(1);
    setAddonIds([]);
  };

  const canAdd =
    !!selectedProduct &&
    !!designId &&
    !!sizeId &&
    quantity > 0 &&
    (fitOptions.length <= 1 || !!fit);

  const addToCart = () => {
    if (!selectedProduct || !canAdd) return;
    const design = designs.find((d) => d.id === designId);
    const size = sizes.find((s) => s.id === sizeId);
    const price = unitPriceFor(selectedProduct, quantity, addonIds);
    setCart((prev) => [
      ...prev,
      {
        key: uid(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        designId,
        designName: design?.name || "",
        sizeId,
        sizeName: size?.name || "",
        fit: fitOptions.length > 1 ? fit : fitOptions[0] || null,
        quantity,
        unitCrc: price.crc,
        unitUsd: price.usd,
        addonIds,
      },
    ]);
    resetBuilder();
  };

  const removeFromCart = (key: string) =>
    setCart((prev) => prev.filter((i) => i.key !== key));

  const total = cart.reduce(
    (acc, i) => ({
      crc: acc.crc + i.unitCrc * i.quantity,
      usd: acc.usd + i.unitUsd * i.quantity,
    }),
    { crc: 0, usd: 0 }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError("Add at least one item to your order.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/create-with-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": teamName.toLowerCase(),
        },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            priceCrc: i.unitCrc,
            priceUsd: i.unitUsd,
            designId: i.designId,
            designName: i.designName,
            sizeId: i.sizeId,
            fit: i.fit,
            addonIds: i.addonIds,
          })),
          designRequestId: designRequestId || null,
          notes,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create order");
      }
      const data = await response.json();
      setCart([]);
      if (onSuccess) onSuccess(data.orderId);
      else setPlaced(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (placed) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Added to your team order
        </h2>
        <p className="text-gray-600 mb-8">
          Your items were added to the team order. Your captain will close the
          campaign and send everything to CMS, who will confirm the total. No
          payment is taken here.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setPlaced(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Add More Items
          </button>
          <Link
            href={`/custom/${teamName}/order/campaign`}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium"
          >
            View Team Order
          </Link>
        </div>
      </div>
    );
  }

  if (availableProducts.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-800">
        No products are available yet. Your team needs an approved or assigned
        design before products unlock.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(fxFecha || fxIsFallback) && (
        <p className="text-xs text-gray-500">
          Reference rate ₡{Math.round(rate).toLocaleString()}/USD
          {fxFecha ? ` as of ${fxFecha}` : ""}
          {fxIsFallback ? " (estimated)" : ""}
        </p>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Step 1 — Product */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">1. Choose a product</h3>
        <p className="text-sm text-gray-500 mb-4">Pick what you want to order.</p>

        <div className="space-y-6">
          {productCategories.map((categoryKey) => {
            const categoryProducts = groupedProducts[categoryKey] || [];
            if (!categoryProducts.length) return null;

            return (
              <div key={categoryKey}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{categoryIcons[categoryKey] || "📦"}</span>
                  <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-gray-700">
                    {categoryLabels[categoryKey] || categoryKey}
                  </h4>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryProducts.map((p) => {
                    const selected = p.id === productId;
                    const thumbUrl = getProductThumb(p);
                    const normalizedCategory = normalizeCategory(p.category);
                    const thumbnailStyle = categoryThumbStyles[normalizedCategory] || categoryThumbStyles.other;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProduct(p.id)}
                        className={`text-left rounded-[14px] border-[1.5px] p-3 transition-all ${
                          selected
                            ? "border-[#2d7ff9] ring-2 ring-[#dfeeff] bg-[#f7fbff]"
                            : "border-[#dfe3ea] hover:border-[#c8d1dc] bg-white"
                        }`}
                      >
                        <div className="mb-3 overflow-hidden rounded-[12px] border border-[#dfe3ea] bg-gradient-to-br shadow-inner">
                          <div className={`relative flex h-[116px] items-center justify-center bg-gradient-to-br ${thumbnailStyle.bg}`}>
                            {isLikelyImageUrl(thumbUrl) ? (
                              <img
                                src={thumbUrl}
                                alt={p.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className={`text-[52px] leading-none drop-shadow-sm ${thumbnailStyle.accent}`}>{thumbnailStyle.icon}</span>
                            )}
                            <span className="absolute right-2 top-2 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-700">
                              {p.teamQty || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {p.example_url && (
                          <div className="mt-2 text-[11px] font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2">
                            Product reference ↗
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product info + team pricing tier */}
      {selectedProduct && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                <span>{categoryIcons[normalizeCategory(selectedProduct.category)] || "P"}</span>
                {categoryLabels[normalizeCategory(selectedProduct.category)] || selectedProduct.category || "Product"}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-2">{selectedProduct.name}</h3>
            </div>
            {selectedProduct.example_url && (
              <a
                href={selectedProduct.example_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View product
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {selectedProduct.pricing.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-3 text-white">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-100">Team pricing</p>
                  <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                    Team qty {selectedProduct.teamQty || 0}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {selectedProduct.pricing.map((tier, idx) => {
                  const active = idx === activeTierIndex(selectedProduct, quantity);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between gap-3 px-4 py-3 ${
                        active ? "bg-amber-50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${active ? "text-amber-900" : "text-gray-800"}`}>
                          {tier.min_qty} - {tier.max_qty || "+"}
                        </span>
                        <span className="text-xs text-gray-500">qty</span>
                        {active && (
                          <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Current tier
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatMoney(tier.price_crc)} CRC
                        </div>
                        <div className="text-xs text-green-700 font-semibold">
                          ${tier.price_usd.toFixed(2)} USD
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600">No pricing configured for this product.</p>
          )}
        </div>
      )}

      {/* Step 2 — Design */}
      {selectedProduct && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">2. Choose a design</h3>
          <p className="text-sm text-gray-500 mb-4">
            Designs available for {selectedProduct.name}.
          </p>
          {designsForProduct.length === 0 ? (
            <p className="text-sm text-amber-600">
              No designs available for this product yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {designsForProduct.map((d) => {
                const selected = d.id === designId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDesignId(d.id)}
                    className={`rounded-lg overflow-hidden border-2 text-left transition-all ${
                      selected
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="aspect-square bg-gray-100">
                      {d.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.imageUrl}
                          alt={d.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1 text-xs font-medium text-gray-700 truncate">
                      {d.name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Size, gender, quantity */}
      {selectedProduct && designId && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">3. Size &amp; quantity</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Size *</span>
              <select
                value={sizeId}
                onChange={(e) => setSizeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              >
                <option value="">Select a size…</option>
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Quantity *</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </label>

            {fitOptions.length > 1 && (
              <div>
                <span className="text-sm font-medium text-gray-700 mb-1 block">Gender / Fit *</span>
                <div className="flex flex-wrap gap-2">
                  {fitOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFit(opt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize border transition-colors ${
                        fit === opt
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedProduct.addons && selectedProduct.addons.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700 mb-1 block">Add-ons</span>
              <div className="space-y-1">
                {selectedProduct.addons.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={addonIds.includes(a.id)}
                      onChange={(e) =>
                        setAddonIds((prev) =>
                          e.target.checked
                            ? [...prev, a.id]
                            : prev.filter((x) => x !== a.id)
                        )
                      }
                    />
                    {a.name} (+{formatMoney(a.price_crc)})
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-600">
              {quantity} ×{" "}
              {formatMoney(unitPriceFor(selectedProduct, quantity, addonIds).crc)} ={" "}
              <span className="font-semibold text-gray-900">
                {formatMoney(unitPriceFor(selectedProduct, quantity, addonIds).crc * quantity)}
              </span>
            </p>
            <button
              type="button"
              onClick={addToCart}
              disabled={!canAdd}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold px-5 py-2.5 rounded-lg"
            >
              + Add to Order
            </button>
          </div>
        </div>
      )}

      {/* Cart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Your items</h3>
        {cart.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nothing added yet. Build an item above and click “Add to Order”.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Design</th>
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3">Fit</th>
                  <th className="py-2 pr-3 text-center">Qty</th>
                  <th className="py-2 pr-3 text-right">Subtotal</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((i) => (
                  <tr key={i.key} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-900">{i.productName}</td>
                    <td className="py-2 pr-3 text-gray-700">{i.designName}</td>
                    <td className="py-2 pr-3 text-gray-700">{i.sizeName}</td>
                    <td className="py-2 pr-3 text-gray-700 capitalize">{i.fit || "—"}</td>
                    <td className="py-2 pr-3 text-center text-gray-900">{i.quantity}</td>
                    <td className="py-2 pr-3 text-right text-gray-900">
                      {formatMoney(i.unitCrc * i.quantity)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeFromCart(i.key)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cart.length > 0 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-blue-600">{formatMoney(total.crc)}</span>
          </div>
        )}
      </div>

      {/* Notes + submit */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block bg-white rounded-xl border border-gray-200 p-6">
          <span className="text-sm font-medium text-gray-700 mb-2 block">
            Notes (optional)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Anything CMS should know about your items"
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting || cart.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg"
        >
          {isSubmitting
            ? "Adding…"
            : `Add to Team Order${cart.length > 0 ? ` (${formatMoney(total.crc)})` : ""}`}
        </button>
      </form>
    </div>
  );
}
