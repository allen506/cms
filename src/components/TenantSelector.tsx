"use client";

import { useState, useEffect } from "react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
}

interface TenantSelectorProps {
  onTenantSelect: (tenantId: string | null) => void;
  selectedTenantId: string | null;
}

export default function TenantSelector({ onTenantSelect, selectedTenantId }: TenantSelectorProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/platform-admin/tenants");
      if (!res.ok) return;
      const data = await res.json();
      setTenants(data);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-2 text-gray-500 text-sm">Loading teams...</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">Filter by Team:</label>
      <select
        value={selectedTenantId || "all"}
        onChange={(e) => onTenantSelect(e.target.value === "all" ? null : e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Teams</option>
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name} ({tenant.slug})
          </option>
        ))}
      </select>
    </div>
  );
}
