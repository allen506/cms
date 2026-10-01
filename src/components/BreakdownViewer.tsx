"use client";

import { useState, useEffect } from "react";

interface BreakdownViewerProps {
  selectedTenantId: string | null;
}

export default function BreakdownViewer({ selectedTenantId }: BreakdownViewerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"product" | "design" | "size" | "fit" | "user">("product");

  useEffect(() => {
    fetchBreakdown();
  }, [selectedTenantId]);

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTenantId) params.append("tenant_id", selectedTenantId);

      const res = await fetch(`/api/platform-admin/breakdown?${params}`);
      if (!res.ok) return;
      const breakdown = await res.json();
      setData(breakdown);
    } catch (error) {
      console.error("Failed to fetch breakdown:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-8 text-center text-gray-500">Loading breakdown...</div>;
  }

  const renderTable = (items: any[], columns: string[]) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 text-sm text-gray-900">
                  {item[col.toLowerCase().replace(" ", "_")] || item[col.toLowerCase()] || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">{data.summary.totalOrders?.count || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">Total Items</p>
          <p className="text-3xl font-bold text-gray-900">{data.summary.totalItems?.total || 0}</p>
        </div>
      </div>

      {/* Breakdown Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 p-4 flex gap-4 overflow-x-auto">
          {(["product", "design", "size", "fit", "user"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "product"
                ? "By Product"
                : tab === "design"
                ? "By Design"
                : tab === "size"
                ? "By Size"
                : tab === "fit"
                ? "By Fit"
                : "By User"}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === "product" &&
            renderTable(data.byProduct, ["Name", "Order Count", "Total Qty"])}
          {activeTab === "design" &&
            renderTable(data.byDesign, ["Name", "Order Count", "Total Qty"])}
          {activeTab === "size" && renderTable(data.bySize, ["Name", "Order Count", "Total Qty"])}
          {activeTab === "fit" &&
            renderTable(data.byFit.map((item: any) => ({ ...item, fit: item.fit || "unspecified" })), [
              "Fit",
              "Order Count",
              "Total Qty",
            ])}
          {activeTab === "user" &&
            renderTable(data.byUser, ["User Name", "Order Count", "Total Qty", "Completed Qty"])}
        </div>
      </div>
    </div>
  );
}
