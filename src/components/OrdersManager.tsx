"use client";

import { useState, useEffect } from "react";

interface Order {
  id: string;
  order_number: string;
  user_name: string;
  user_email: string | null;
  tenant_name: string;
  tenant_slug: string;
  status: string;
  item_count: number;
  created_at: string;
}

interface OrdersManagerProps {
  selectedTenantId: string | null;
}

export default function OrdersManager({ selectedTenantId }: OrdersManagerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  const [formData, setFormData] = useState({
    tenantId: selectedTenantId || "",
    userName: "",
    userEmail: "",
  });

  useEffect(() => {
    fetchOrders();
  }, [selectedTenantId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTenantId) params.append("tenant_id", selectedTenantId);
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/platform-admin/orders?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId || !formData.userName) return;

    try {
      const res = await fetch("/api/platform-admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ tenantId: selectedTenantId || "", userName: "", userEmail: "" });
        setShowCreate(false);
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to create order:", error);
    }
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header and Create Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Orders Management</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Create Order
        </button>
      </div>

      {/* Create Order Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Order</h3>
            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Team *</label>
                <input
                  type="text"
                  value={formData.tenantId}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Auto-filled from selection above</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Team Member Name *</label>
                <input
                  type="text"
                  required
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.userEmail}
                  onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Create Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search by name or order number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            fetchOrders();
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Team Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Team</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{order.order_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.user_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.tenant_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.item_count} items</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : order.status === "submitted"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
