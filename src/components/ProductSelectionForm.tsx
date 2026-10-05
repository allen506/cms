"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  locked?: boolean;
  hasOverride: boolean;
  adjustment?: Adjustment | null;
  pricing: PricingTier[];
  addons?: Addon[];
}

interface SelectedItem {
  productId: string;
  quantity: number;
  priceCrc: number;
  priceUsd: number;
  addonIds: string[];
  designId?: string;
  designName?: string;
  sizeId?: string;
  fit?: string;
}

// Approved design for the team (image comes from the approved design request).
interface ApprovedDesign {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
}

interface CatalogSize {
  id: string;
  name: string;
  sort_order?: number;
}

interface CatalogProductType {
  id: string;
  category: string;
  fit_options?: string | null;
}

interface ProductSelectionFormProps {
  teamName: string;
  designRequestId?: string;
  onSuccess?: (orderId: string) => void;
}

export default function ProductSelectionForm({
  teamName,
  designRequestId,
  onSuccess,
}: ProductSelectionFormProps) {
  const router = useRouter();
  const { t, formatMoney, fxFecha, fxIsFallback, rate } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Catalog data used for per-member design / size / gender selection.
  const [designs, setDesigns] = useState<ApprovedDesign[]>([]);
  const [sizes, setSizes] = useState<CatalogSize[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const productsRes = await fetch("/api/team/products", {
          headers: {
            "x-tenant-slug": teamName.toLowerCase(),
          },
        });

        if (!productsRes.ok) {
          throw new Error("Failed to load products");
        }

        const productsData = await productsRes.json();
        setProducts(productsData.products || []);

        // Approved designs (with preview images) available to this team.
        const designsRes = await fetch("/api/team/approved-designs", {
          headers: { "x-tenant-slug": teamName.toLowerCase() },
        });
        if (designsRes.ok) {
          const d = await designsRes.json();
          setDesigns(d.designs || []);
        }

        // Catalog for sizes + fit options.
        const catalogRes = await fetch("/api/catalog");
        if (catalogRes.ok) {
          const catalog = await catalogRes.json();
          setSizes(catalog.sizes || []);
          setCatalogProducts(catalog.productTypes || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamName]);

  // Gender/fit options for a product (unisex when unset or single option).
  const getFitOptions = (productId: string): string[] => {
    const meta = catalogProducts.find((p) => p.id === productId);
    if (!meta?.fit_options) return ["unisex"];
    try {
      const parsed = JSON.parse(meta.fit_options);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ["unisex"];
    } catch {
      return ["unisex"];
    }
  };

  // Approved designs available for a product (matched by unlock category; a
  // design with no category applies to all products).
  const getDesignsForProduct = (productId: string): ApprovedDesign[] => {
    const meta = catalogProducts.find((p) => p.id === productId);
    const category = meta?.category;
    if (!category) return designs;
    return designs.filter((d) => !d.category || d.category === category);
  };

  // Update a per-item attribute (size or gender/fit).
  const updateItemField = (
    productId: string,
    field: "sizeId" | "fit",
    value: string
  ) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, [field]: value } : item
      )
    );
  };

  // Select the design (by id) for a product line, snapshotting its name too.
  const selectDesign = (productId: string, design: ApprovedDesign) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, designId: design.id, designName: design.name }
          : item
      )
    );
  };

  const updateQuantity = async (
    productId: string,
    quantity: number,
    addonIds?: string[]
  ) => {
    const existingItem = selectedItems.find((i) => i.productId === productId);
    const selectedAddonIds = addonIds ?? existingItem?.addonIds ?? [];

    if (quantity < 1) {
      // Remove item
      setSelectedItems((prev) =>
        prev.filter((item) => item.productId !== productId)
      );
      return;
    }

    try {
      const response = await fetch("/api/team/products/calculate-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": teamName.toLowerCase(),
        },
        body: JSON.stringify({
          productId,
          quantity,
          addonIds: selectedAddonIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate price");
      }

      const data = await response.json();

      setSelectedItems((prev) => {
        const existing = prev.find((item) => item.productId === productId);
        if (existing) {
          return prev.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity,
                  priceCrc: data.priceCrc,
                  priceUsd: data.priceUsd,
                  addonIds: selectedAddonIds,
                }
              : item
          );
        } else {
          const avail = getDesignsForProduct(productId);
          const soleDesign = avail.length === 1 ? avail[0] : undefined;
          return [
            ...prev,
            {
              productId,
              quantity,
              priceCrc: data.priceCrc,
              priceUsd: data.priceUsd,
              addonIds: selectedAddonIds,
              // Auto-pick the only available design.
              designId: soleDesign?.id,
              designName: soleDesign?.name,
              // Auto-pick gender when the product has a single fit option.
              fit: getFitOptions(productId).length === 1
                ? getFitOptions(productId)[0]
                : undefined,
            },
          ];
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Price calculation failed");
    }
  };

  const toggleAddon = (product: Product, addonId: string) => {
    const existing = selectedItems.find((i) => i.productId === product.id);
    const current = existing?.addonIds ?? [];
    const next = current.includes(addonId)
      ? current.filter((id) => id !== addonId)
      : [...current, addonId];
    const quantity = existing?.quantity ?? 1;
    updateQuantity(product.id, quantity, next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      setError(t("products.selectAtLeastOne"));
      return;
    }

    // Each selected product needs a design, a size, and a gender/fit.
    for (const item of selectedItems) {
      const product = products.find((p) => p.id === item.productId);
      const label = product?.name || item.productId;
      if (!item.designId) {
        setError(`Please choose a design for ${label}.`);
        return;
      }
      if (!item.sizeId) {
        setError(`Please choose a size for ${label}.`);
        return;
      }
      if (getFitOptions(item.productId).length > 1 && !item.fit) {
        setError(`Please choose a gender/fit for ${label}.`);
        return;
      }
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
          items: selectedItems,
          designRequestId: designRequestId || null,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const data = await response.json();

      setSuccess(t("products.orderSuccess"));

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(data.orderId);
        } else {
          router.push(`/custom/${teamName}/order/payment/${data.orderId}`);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce(
      (sum, item) => ({
        crc: sum.crc + item.priceCrc * item.quantity,
        usd: sum.usd + item.priceUsd * item.quantity,
      }),
      { crc: 0, usd: 0 }
    );
  };

  const total = calculateTotal();

  const getPricingDisplay = (product: Product, quantity: number = 0) => {
    const adj = product.adjustment;

    if (product.pricing.length > 0) {
      // Which tier the current quantity falls into.
      const activeIdx = quantity > 0
        ? product.pricing.findIndex(
            (tier) =>
              quantity >= tier.min_qty &&
              (tier.max_qty == null || quantity <= tier.max_qty)
          )
        : -1;
      return (
        <div className="text-sm">
          {adj && (
            <div className="mb-2 inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
              {adj.label
                ? adj.label
                : adj.type === "percent"
                ? `${adj.value}% ${t("products.discountApplied")}`
                : t("products.specialPricing")}
            </div>
          )}
          <p className="font-semibold text-gray-700 mb-2">
            {t("products.pricingTiers")}
          </p>
          {product.pricing.map((tier, idx) => {
            const discounted =
              tier.original_crc != null &&
              Math.round(tier.original_crc) !== Math.round(tier.price_crc);
            const active = idx === activeIdx;
            return (
              <p
                key={idx}
                className={`flex items-center gap-2 rounded px-1 ${
                  active ? "bg-blue-50 text-blue-900 font-semibold" : "text-gray-600"
                }`}
              >
                <span>
                  {tier.min_qty}-{tier.max_qty || "+"}:{" "}
                  {discounted && (
                    <span className="text-gray-400 line-through mr-1">
                      {formatMoney(tier.original_crc!)}
                    </span>
                  )}
                  <span className={discounted && !active ? "font-semibold text-green-700" : ""}>
                    {formatMoney(tier.price_crc)}
                  </span>
                </span>
                {active && (
                  <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Your tier
                  </span>
                )}
              </p>
            );
          })}
        </div>
      );
    }

    return <p className="text-red-600">{t("products.noPricing")}</p>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">{t("products.loading")}</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">{t("products.none")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        {/* Products Grid */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {t("products.selectProducts")}
          </h2>

          {(fxFecha || fxIsFallback) && (
            <p className="mb-4 text-xs text-gray-500">
              {t("fx.reference")} ₡{Math.round(rate).toLocaleString()}/USD
              {fxFecha ? ` ${t("fx.asOf")} ${fxFecha}` : ""}
              {fxIsFallback ? ` (${t("fx.estimated")})` : ""}
            </p>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {products.map((product) => {
              const selectedItem = selectedItems.find(
                (item) => item.productId === product.id
              );
              const quantity = selectedItem?.quantity || 0;

              return (
                <div
                  key={product.id}
                  className={`border border-gray-200 rounded-lg p-6 transition-shadow ${
                    product.locked ? "opacity-60" : "hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {product.name}
                    </h3>
                    {product.locked && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
                        🔒 {t("products.locked")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {product.description}
                  </p>

                  {product.locked ? (
                    <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                      {t("products.lockedHint")}
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        {getPricingDisplay(product, quantity)}
                      </div>

                      {product.addons && product.addons.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            {t("products.addons")}
                          </p>
                          <div className="space-y-1">
                            {product.addons.map((addon) => {
                              const checked =
                                selectedItem?.addonIds?.includes(addon.id) ??
                                false;
                              return (
                                <label
                                  key={addon.id}
                                  className="flex items-center gap-2 text-sm text-gray-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleAddon(product, addon.id)}
                                    disabled={isSubmitting}
                                  />
                                  <span>
                                    {addon.name} (+{formatMoney(addon.price_crc)})
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-sm font-medium text-gray-700 mb-2 block">
                            {t("products.quantity")}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) =>
                              updateQuantity(
                                product.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isSubmitting}
                          />
                        </label>

                        {quantity > 0 && selectedItem && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-900">
                              <span className="font-semibold">
                                {t("products.unitPrice")}
                              </span>{" "}
                              {formatMoney(selectedItem.priceCrc)}
                            </p>
                            <p className="text-sm text-blue-900 mt-1">
                              <span className="font-semibold">
                                {t("products.subtotal")}
                              </span>{" "}
                              {formatMoney(selectedItem.priceCrc * quantity)}
                            </p>
                          </div>
                        )}

                        {quantity > 0 && selectedItem && (
                          <div className="space-y-3 pt-1">
                            {/* Design — visual picker from approved designs */}
                            <div>
                              <span className="text-sm font-medium text-gray-700 mb-1 block">
                                Design *
                              </span>
                              {getDesignsForProduct(product.id).length === 0 ? (
                                <span className="text-xs text-amber-600 block">
                                  No approved design available for this product yet.
                                </span>
                              ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {getDesignsForProduct(product.id).map((d) => {
                                    const selected = selectedItem.designId === d.id;
                                    return (
                                      <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => selectDesign(product.id, d)}
                                        disabled={isSubmitting}
                                        className={`relative rounded-lg overflow-hidden border-2 text-left transition-all ${
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
                                          {selected && (
                                            <span className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                              ✓
                                            </span>
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

                            {/* Size */}
                            <label className="block">
                              <span className="text-sm font-medium text-gray-700 mb-1 block">
                                Size *
                              </span>
                              <select
                                value={selectedItem.sizeId || ""}
                                onChange={(e) =>
                                  updateItemField(product.id, "sizeId", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isSubmitting}
                              >
                                <option value="">Select a size…</option>
                                {sizes.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            {/* Gender / fit — only when the product offers a choice */}
                            {getFitOptions(product.id).length > 1 && (
                              <div>
                                <span className="text-sm font-medium text-gray-700 mb-1 block">
                                  Gender / Fit *
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {getFitOptions(product.id).map((opt) => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        updateItemField(product.id, "fit", opt)
                                      }
                                      disabled={isSubmitting}
                                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize border transition-colors ${
                                        selectedItem.fit === opt
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
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-2 block">
              {t("products.notesLabel")}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("products.notesPlaceholder")}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </label>
        </div>

        {/* Order Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t("products.orderSummary")}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {t("products.itemsSelected")}
                </span>
                <span className="font-semibold text-gray-900">
                  {selectedItems.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {t("products.totalQuantity")}
                </span>
                <span className="font-semibold text-gray-900">
                  {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="border-t border-blue-300 pt-3 mt-3">
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-gray-900">
                    {t("products.total")}
                  </span>
                  <span className="font-bold text-blue-600">
                    {formatMoney(total.crc)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || selectedItems.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          {isSubmitting
            ? t("products.creatingOrder")
            : `${t("products.continuePayment")} (${
                selectedItems.length > 0
                  ? formatMoney(total.crc)
                  : t("products.selectItems")
              })`}
        </button>
      </form>
    </div>
  );
}
