"use client";

import { useState } from "react";
import { ProductType } from "@/lib/types";

const PRODUCT_ICONS: Record<string, string> = {
  "pro-jersey": "🚴",
  "enduro-jersey": "🏔️",
  "cycling-jersey": "🚴",
  "enduro-short": "🏔️",
  "enduro-long": "🏔️",
  jersey: "🚴",
  bib: "🧢",
  "bib-licra": "🧢",
  vest: "🧥",
  shorts: "🩳",
  socks: "🧦",
  gloves: "🧤",
};

const PRODUCT_TAGLINES: Record<string, string> = {
  "pro-jersey": "High-performance cycling jersey",
  "enduro-jersey": "Long sleeve MTB jersey",
  "enduro-short": "Short sleeve dry fit jersey",
  "wind-vest": "Lightweight windbreaker vest",
};

const PRODUCT_THUMBNAILS: Record<string, { bg: string; accent: string; icon: string }> = {
  jersey: { bg: "from-[#f5ead9] via-[#f9f2e9] to-[#f1e2c8]", accent: "text-[#a15b2a]", icon: "🚴" },
  bib: { bg: "from-[#f8e5ea] via-[#f9edf0] to-[#f3dce4]", accent: "text-[#9a4b5a]", icon: "�" },
  "bib-licra": { bg: "from-[#f8e5ea] via-[#f9edf0] to-[#f3dce4]", accent: "text-[#9a4b5a]", icon: "🧢" },
  vest: { bg: "from-[#e8edf3] via-[#f3f6f9] to-[#dde7ef]", accent: "text-[#4b5d74]", icon: "🧥" },
  "wind-vest": { bg: "from-[#e8edf3] via-[#f3f6f9] to-[#dde7ef]", accent: "text-[#4b5d74]", icon: "🧥" },
  shorts: { bg: "from-[#e7f4ea] via-[#edf8f1] to-[#dfeee4]", accent: "text-[#4d7c5d]", icon: "🩳" },
  socks: { bg: "from-[#e8eefc] via-[#eef4ff] to-[#dfeaf9]", accent: "text-[#4c698d]", icon: "🧦" },
  gloves: { bg: "from-[#f0ebfb] via-[#f7f3ff] to-[#e5def9]", accent: "text-[#5d4b8b]", icon: "🧤" },
  default: { bg: "from-[#f5efe7] via-[#faf5ee] to-[#efe2d2]", accent: "text-[#6d5b4a]", icon: "🧵" },
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

const CATEGORY_LABELS: Record<string, string> = {
  jersey: "Jerseys",
  "enduro-short": "Enduro MTB Short Sleeve",
  "enduro-long": "Enduro MTB Long Sleeve",
  "enduro-jersey": "Enduro MTB Jerseys",
  "cycling-jersey": "Cycling Jerseys",
  "pro-jersey": "Pro Jerseys",
  bib: "Bibs",
  "bib-licra": "Bib / Licra",
  vest: "Vests",
  gloves: "Gloves",
  shorts: "Shorts",
  socks: "Socks",
};

const CATEGORY_ICONS: Record<string, string> = {
  jersey: "🚴",
  "enduro-short": "🏄",
  "enduro-long": "🏄",
  "enduro-jersey": "🏄",
  "cycling-jersey": "🚴",
  "pro-jersey": "🚴",
  bib: "🩳",
  "bib-licra": "🩳",
  vest: "🧥",
  gloves: "🧤",
  shorts: "🩳",
  socks: "🧦",
};

const CAT_ORDER = ["jersey", "enduro-short", "enduro-long", "bib", "vest"];

interface ProductSelectorProps {
  productTypes: ProductType[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
}

export default function ProductSelector({
  productTypes,
  selectedProductId,
  onSelect,
}: ProductSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const normalizeCategory = (category?: string, productId?: string) => {
    const value = (category || "").toLowerCase();
    const productKey = (productId || category || "").toLowerCase();

    if (!value || value === "other") return "default";
    if (productKey === "enduro-jersey" || productKey === "enduro-short" || productKey === "enduro-long") return "enduro-jersey";
    if (productKey === "cycling-jersey" || productKey === "pro-jersey") return "cycling-jersey";
    if (value.includes("enduro") && (value.includes("short") || value.includes("long"))) return "enduro-jersey";
    if (value.includes("cycling") || value.includes("pro line") || (value.includes("jersey") && !value.includes("enduro"))) return "cycling-jersey";
    if (value.includes("bib")) return "bib";
    if (value.includes("vest")) return "vest";
    if (value.includes("glove")) return "gloves";
    if (value.includes("sock")) return "socks";
    if (value.includes("short")) return "shorts";
    if (value.includes("long")) return "jersey";
    return value;
  };

  // Group products by category, preserving sort_order within each group
  const grouped = productTypes.reduce<Record<string, ProductType[]>>((acc, pt) => {
    const cat = normalizeCategory(pt.category, pt.id);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(pt);
    return acc;
  }, {});

  // Keep category order stable: enduro jerseys → cycling jerseys → bibs → vests → everything else alphabetically
  const categoryOrder = ["enduro-jersey", "cycling-jersey", "bib", "vest"];
  const categories = [
    ...categoryOrder.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !categoryOrder.includes(c)).sort(),
  ];

  const getProductThumbSource = (pt: ProductType) => pt.example_url || pt.image_url || "";

  return (
    <div>
      <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">
        Step 2 — Select Your Product
      </h3>
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{CATEGORY_ICONS[cat] || "📦"}</span>
              <h4 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-wider">
                {CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
              </h4>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {grouped[cat].map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => onSelect(pt.id)}
                  onMouseEnter={() => setHoveredId(pt.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative rounded-[14px] overflow-hidden transition-all duration-200 text-left border-[1.5px] ${
                    selectedProductId === pt.id
                      ? "border-[#2d7ff9] ring-2 ring-[#dfeeff] shadow-[0_0_0_1px_rgba(45,127,249,0.1)]"
                      : hoveredId === pt.id
                      ? "border-[#dfe3ea] shadow-sm"
                      : "border-[#dfe3ea] shadow-sm bg-white"
                  }`}
                >
                  <div className="p-3 bg-white">
                    <div className="mb-3 rounded-[12px] overflow-hidden border border-[#dfe3ea] shadow-inner">
                      <div
                        className={`relative flex h-[116px] items-center justify-center bg-gradient-to-br ${
                          PRODUCT_THUMBNAILS[normalizeCategory(pt.category)]?.bg || PRODUCT_THUMBNAILS.default.bg
                        }`}
                      >
                        {isLikelyImageUrl(getProductThumbSource(pt)) ? (
                          <img
                            src={getProductThumbSource(pt)}
                            alt={pt.name}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              const target = event.currentTarget as HTMLImageElement;
                              target.style.display = "none";
                              target.parentElement?.setAttribute("data-fallback", "true");
                            }}
                          />
                        ) : null}
                        {!isLikelyImageUrl(getProductThumbSource(pt)) && (
                          <span className={`text-[52px] leading-none drop-shadow-sm ${PRODUCT_THUMBNAILS[normalizeCategory(pt.category)]?.accent || PRODUCT_THUMBNAILS.default.accent}`}>
                            {PRODUCT_ICONS[pt.id] || PRODUCT_ICONS[pt.category] || PRODUCT_THUMBNAILS[normalizeCategory(pt.category)]?.icon || PRODUCT_THUMBNAILS.default.icon}
                          </span>
                        )}
                        {selectedProductId === pt.id && (
                          <div className="absolute right-2 top-2 bg-[#2d7ff9] text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[15px] text-gray-800 leading-snug">{pt.name}</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                          {PRODUCT_TAGLINES[pt.id] || pt.description}
                        </p>
                      </div>
                    </div>
                    {pt.example_url && (
                      <a
                        href={pt.example_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center mt-3 text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View on CMS Sportswear ↗
                      </a>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
