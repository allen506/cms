"use client";

import { useState, useEffect } from "react";

interface PerPersonViewerProps {
  selectedTenantId: string | null;
}

export default function PerPersonViewer({ selectedTenantId }: PerPersonViewerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPerPersonData();
  }, [selectedTenantId]);

  const fetchPerPersonData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTenantId) params.append("tenant_id", selectedTenantId);

      const res = await fetch(`/api/platform-admin/per-person?${params}`);
      if (!res.ok) return;
      const perPerson = await res.json();
      setData(perPerson);
    } catch (error) {
      console.error("Failed to fetch per-person data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-8 text-center text-gray-500">Loading per-person data...</div>;
  }

  const filteredPeople = data.personTotals.filter(
    (person: any) =>
      person.user_id.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">Total Team Members</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats?.total_people || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats?.total_orders || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">Total Items</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats?.total_items || 0}</p>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">User ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Orders</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Total Items</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPeople.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  No team members found
                </td>
              </tr>
            ) : (
              filteredPeople.map((person: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{person.user_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{person.order_count}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{person.total_items}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
