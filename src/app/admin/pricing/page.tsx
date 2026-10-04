"use client";

import { useState, useEffect, useCallback } from "react";
import PasswordGate from "@/components/PasswordGate";

interface Team {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

interface Override {
  id: string;
  team_id: string;
  product_type_id: string;
  adjustment_type: "percent" | "fixed";
  discount_percent: number | null;
  price_crc: number | null;
  label: string | null;
  team_name: string | null;
  product_name: string | null;
}

export default function AdminPricingPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [teamId, setTeamId] = useState("");
  const [productId, setProductId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"percent" | "fixed">("percent");
  const [discountPercent, setDiscountPercent] = useState("");
  const [priceCrc, setPriceCrc] = useState("");
  const [label, setLabel] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/price-overrides");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setTeams(json.teams || []);
      setProducts(json.products || []);
      setOverrides(json.overrides || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/price-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          product_type_id: productId,
          adjustment_type: adjustmentType,
          discount_percent:
            adjustmentType === "percent" ? parseFloat(discountPercent) : null,
          price_crc: adjustmentType === "fixed" ? parseFloat(priceCrc) : null,
          label: label || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setMessage("Price adjustment saved.");
      setDiscountPercent("");
      setPriceCrc("");
      setLabel("");
      await fetchData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this price adjustment?")) return;
    try {
      const res = await fetch(`/api/admin/price-overrides?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <PasswordGate>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Customer Price Adjustments
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Set a percentage discount or a fixed price for a specific customer and
          product. Customers see the original price struck through with your
          reason/label.
        </p>

        {message && (
          <div className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-blue-800 text-sm">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="bg-white rounded-lg shadow p-6 mb-8 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Customer / Team</span>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select a team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Product</span>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="adjType"
                checked={adjustmentType === "percent"}
                onChange={() => setAdjustmentType("percent")}
              />
              Percentage discount
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="adjType"
                checked={adjustmentType === "fixed"}
                onChange={() => setAdjustmentType("fixed")}
              />
              Fixed unit price
            </label>
          </div>

          {adjustmentType === "percent" ? (
            <label className="block max-w-xs">
              <span className="text-sm font-medium text-gray-700">Discount %</span>
              <input
                type="number"
                min="0.01"
                max="99.99"
                step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                required
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                placeholder="e.g. 10"
              />
            </label>
          ) : (
            <label className="block max-w-xs">
              <span className="text-sm font-medium text-gray-700">
                Fixed unit price (₡ CRC)
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={priceCrc}
                onChange={(e) => setPriceCrc(e.target.value)}
                required
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                placeholder="e.g. 25000"
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Reason / label (shown to customer)
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g. Loyalty discount, Team sponsorship"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded"
          >
            {saving ? "Saving…" : "Save adjustment"}
          </button>
        </form>

        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Active adjustments
        </h2>
        {loading ? (
          <p className="text-gray-600">Loading…</p>
        ) : overrides.length === 0 ? (
          <p className="text-gray-600">No adjustments configured yet.</p>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {overrides.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">
                    {o.team_name} — {o.product_name}
                  </p>
                  <p className="text-gray-600">
                    {o.adjustment_type === "percent"
                      ? `${o.discount_percent}% discount`
                      : `Fixed ₡${Number(o.price_crc).toLocaleString()} / unit`}
                    {o.label ? ` · ${o.label}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(o.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PasswordGate>
  );
}
