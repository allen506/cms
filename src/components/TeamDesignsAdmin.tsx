"use client";

import { useCallback, useEffect, useState } from "react";

interface DesignRow {
  id: string;
  name: string;
  image_url: string | null;
  assigned_category: string | null;
  assigned: boolean;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All products" },
  { value: "enduro-jersey", label: "Enduro Jersey" },
  { value: "cycling-jersey", label: "Cycling Jersey" },
  { value: "bib-licra", label: "Bib / Licra" },
  { value: "kids", label: "Kids" },
];

export default function TeamDesignsAdmin({
  selectedTenantId,
}: {
  selectedTenantId: string | null;
}) {
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!selectedTenantId) {
      setDesigns([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/platform-admin/team-designs?tenant_id=${encodeURIComponent(selectedTenantId)}`
      );
      if (!res.ok) throw new Error("Failed to load designs");
      const data = await res.json();
      setDesigns(data.designs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load designs");
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/platform-admin/team-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: selectedTenantId, ...body }),
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
        Select a team above to manage its available designs.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Make designs available to this team. Assigned designs appear in the team&apos;s
        ordering page and unlock product selection — no design request needed.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : designs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-gray-500">
          No designs for this team&apos;s tenant yet. Add designs in the Catalog first.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border overflow-hidden bg-white ${
                d.assigned ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
              }`}
            >
              <div className="aspect-video bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/designs/${d.id}/image`}
                  alt={d.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-2">
                <p className="font-medium text-sm text-gray-900 truncate">{d.name}</p>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={d.assigned}
                      disabled={busy}
                      onChange={(e) =>
                        post({
                          design_id: d.id,
                          action: e.target.checked ? "assign" : "unassign",
                          category: d.assigned_category || "",
                        })
                      }
                    />
                    Available
                  </label>
                  <select
                    value={d.assigned_category || ""}
                    disabled={busy || !d.assigned}
                    onChange={(e) =>
                      post({
                        design_id: d.id,
                        action: "assign",
                        category: e.target.value,
                      })
                    }
                    className="ml-auto text-xs px-2 py-1 border border-gray-300 rounded-lg text-gray-900 disabled:opacity-50"
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
