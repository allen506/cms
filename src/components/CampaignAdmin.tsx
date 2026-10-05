"use client";

import { useCallback, useEffect, useState } from "react";

interface CampaignSummary {
  id: string;
  team_id: string;
  name: string | null;
  status: string;
  bac_payment_link: string | null;
  created_at: string;
  closed_at: string | null;
  submitted_at: string | null;
  line_items: number;
  total_qty: number;
}

interface OrderRow {
  member_email: string | null;
  product_name: string | null;
  design: string | null;
  size: string | null;
  fit: string | null;
  quantity: number;
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
};

export default function CampaignAdmin({
  selectedTenantId,
}: {
  selectedTenantId: string | null;
}) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [bacDrafts, setBacDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!selectedTenantId) {
      setCampaigns([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/platform-admin/campaigns?tenant_id=${encodeURIComponent(selectedTenantId)}`
      );
      if (!res.ok) throw new Error("Failed to load campaigns");
      const data = await res.json();
      const list: CampaignSummary[] = data.campaigns || [];
      setCampaigns(list);
      setBacDrafts(
        Object.fromEntries(list.map((c) => [c.id, c.bac_payment_link || ""]))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    load();
    setExpanded(null);
    setOrders([]);
  }, [load]);

  const viewOrders = async (campaignId: string) => {
    if (expanded === campaignId) {
      setExpanded(null);
      setOrders([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/platform-admin/campaigns?tenant_id=${encodeURIComponent(
          selectedTenantId!
        )}&campaign_id=${encodeURIComponent(campaignId)}`
      );
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(data.orders || []);
      setExpanded(campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    }
  };

  const act = async (campaignId: string, action: string, link?: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/platform-admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          campaign_id: campaignId,
          action,
          link,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Action failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (!selectedTenantId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-800">
        Select a team above to view its order campaigns.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-gray-500">
          No campaigns for this team yet.
        </div>
      ) : (
        campaigns.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                    STATUS_BADGE[c.status] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {c.status}
                </span>
                <span className="text-sm text-gray-500">Team {c.team_id}</span>
                <span className="text-sm text-gray-400">
                  {c.line_items} items · qty {c.total_qty}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => viewOrders(c.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {expanded === c.id ? "Hide" : "View"} Orders
                </button>
                <a
                  href={`/api/platform-admin/campaign-export?tenant_id=${encodeURIComponent(
                    selectedTenantId
                  )}&campaign_id=${encodeURIComponent(c.id)}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-700"
                >
                  CSV
                </a>
                {c.status === "open" && (
                  <button
                    onClick={() => act(c.id, "close")}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    Close
                  </button>
                )}
                {c.status === "closed" && (
                  <>
                    <button
                      onClick={() => act(c.id, "reopen")}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      Re-open
                    </button>
                    <button
                      onClick={() => act(c.id, "submit")}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Submit
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* BAC deposit link — only admins assign this for the team order */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Team Order Payment Link (BAC) — single deposit link for this order
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={bacDrafts[c.id] ?? ""}
                  onChange={(e) =>
                    setBacDrafts((d) => ({ ...d, [c.id]: e.target.value }))
                  }
                  placeholder="https://… (paste BAC link from CMS)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => act(c.id, "set-bac-link", bacDrafts[c.id] || "")}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {c.bac_payment_link ? "Update Link" : "Assign Link"}
                </button>
              </div>
            </div>

            {expanded === c.id && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2">Member</th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Design</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">Gender/Fit</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                          No orders.
                        </td>
                      </tr>
                    ) : (
                      orders.map((r, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-900">{r.member_email || "—"}</td>
                          <td className="px-3 py-2 text-gray-700">{r.product_name || "—"}</td>
                          <td className="px-3 py-2 text-gray-700">{r.design || "—"}</td>
                          <td className="px-3 py-2 text-gray-700">{r.size || "—"}</td>
                          <td className="px-3 py-2 text-gray-700 capitalize">{r.fit || "—"}</td>
                          <td className="px-3 py-2 text-center text-gray-900">{r.quantity}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
