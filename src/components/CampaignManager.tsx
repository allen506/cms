"use client";

import { useCallback, useEffect, useState } from "react";

interface CampaignOrderRow {
  order_number: string;
  order_status: string;
  member_email: string | null;
  product_name: string | null;
  design: string | null;
  size: string | null;
  fit: string | null;
  quantity: number;
  price_usd: number;
  price_crc: number;
  created_at: string;
}

interface Campaign {
  id: string;
  status: "open" | "closed" | "submitted";
  bac_payment_link: string | null;
  closed_at: string | null;
  submitted_at: string | null;
}

interface CampaignResponse {
  campaign: Campaign | null;
  orderingOpen: boolean;
  isCaptain: boolean;
  orders: CampaignOrderRow[];
  totals: { quantity: number; usd: number; crc: number };
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
};

export default function CampaignManager({ teamName }: { teamName: string }) {
  const slug = teamName.toLowerCase();
  const [data, setData] = useState<CampaignResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bacLink, setBacLink] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/team/campaign", {
        headers: { "x-tenant-slug": slug },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to load campaign");
      }
      const json: CampaignResponse = await res.json();
      setData(json);
      setBacLink(json.campaign?.bac_payment_link || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/team/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-slug": slug },
        body: JSON.stringify({ action, ...extra }),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  const { campaign, orders, totals } = data || {
    campaign: null,
    orders: [],
    totals: { quantity: 0, usd: 0, crc: 0 },
  };
  const status = campaign?.status ?? "open";
  const isCaptain = !!data?.isCaptain;

  // Read-only view for regular team members: status + how to pay + orders.
  if (!isCaptain) {
    return (
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Order Campaign</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                STATUS_BADGE[status] || "bg-gray-100 text-gray-600"
              }`}
            >
              {status}
            </span>
          </div>
          {status === "open" ? (
            <p className="text-sm text-gray-500 mt-3">
              Ordering is open — add your items before your captain closes the
              campaign.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-3">
              This campaign is {status}. No new orders can be added.
            </p>
          )}
        </div>

        {campaign?.bac_payment_link && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Team Order Deposit (BAC)
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Payment is handled at the team level — your captain coordinates a
              single 50% deposit for the whole order with CMS. You don&apos;t pay
              individually here. This is the team&apos;s payment link for reference:
            </p>
            <a
              href={campaign.bac_payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              View Team Payment Link
            </a>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Team Items</p>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Qty</p>
            <p className="text-2xl font-bold text-gray-900">{totals.quantity}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Status + actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Order Campaign</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                STATUS_BADGE[status] || "bg-gray-100 text-gray-600"
              }`}
            >
              {status}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === "open" && (
              <button
                onClick={() => {
                  if (confirm("Close this campaign? Members will no longer be able to add orders.")) {
                    act("close");
                  }
                }}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Close Campaign
              </button>
            )}
            {status === "closed" && (
              <>
                <button
                  onClick={() => act("reopen")}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  Re-open
                </button>
                <button
                  onClick={() => {
                    if (confirm("Submit this order to CMS for fulfilment?")) act("submit");
                  }}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Submit to CMS
                </button>
              </>
            )}
            <a
              href="/api/team/campaign/export"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700"
            >
              Download CSV
            </a>
          </div>
        </div>

        {status === "open" && (
          <p className="text-sm text-gray-500 mt-3">
            Ordering is open. Team members can add their items. Close the campaign
            when everyone has ordered, then download the CSV or submit to CMS.
          </p>
        )}
        {status === "closed" && (
          <p className="text-sm text-gray-500 mt-3">
            Campaign closed — no new orders can be added. Download the CSV to email
            CMS, or submit it through the system.
          </p>
        )}
        {status === "submitted" && (
          <p className="text-sm text-gray-500 mt-3">
            Submitted to CMS. An admin will take it from here.
          </p>
        )}
      </div>

      {/* Team-level BAC deposit link (captain-managed) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          Team Order Payment Link (BAC)
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          One BAC link for the whole team order&apos;s 50% deposit. After CMS
          confirms the total, paste their link here. The team pays a single
          deposit for the entire order — members do not pay individually.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={bacLink}
            onChange={(e) => setBacLink(e.target.value)}
            placeholder="https://…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => act("set-bac-link", { link: bacLink })}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save Link
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Line Items</p>
          <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Qty</p>
          <p className="text-2xl font-bold text-gray-900">{totals.quantity}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total USD</p>
          <p className="text-2xl font-bold text-gray-900">
            ${totals.usd.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Design</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Gender/Fit</th>
                <th className="px-4 py-3 text-center">Qty</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">{r.member_email || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{r.product_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{r.design || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{r.size || "—"}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{r.fit || "—"}</td>
                    <td className="px-4 py-3 text-center text-gray-900">{r.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
