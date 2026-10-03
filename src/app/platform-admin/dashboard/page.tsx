'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TenantSelector from '@/components/TenantSelector';
import OrdersManager from '@/components/OrdersManager';
import BreakdownViewer from '@/components/BreakdownViewer';
import PerPersonViewer from '@/components/PerPersonViewer';
import PricingTierManager from '@/components/PricingTierManager';
import CatalogManager from '@/components/CatalogManager';
import PaymentsManager from '@/components/PaymentsManager';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  admin_email: string;
  status: 'active' | 'suspended';
  created_at: string;
}

type DashboardTab = 'tenants' | 'catalog' | 'orders' | 'breakdown' | 'per-person' | 'payments' | 'pricing' | 'designers';

export default function PlatformAdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<DashboardTab>('tenants');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/platform-admin/tenants');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/platform-admin/login');
          return;
        }
        throw new Error('Failed to fetch tenants');
      }
      const data = await response.json();
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/platform-admin/logout', { method: 'POST' });
    router.push('/platform-admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Global management for all teams and orders</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8 flex gap-4 overflow-x-auto">
          {(['tenants', 'catalog', 'orders', 'breakdown', 'per-person', 'payments', 'pricing', 'designers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'tenants'
                ? '👥 Teams'
                : tab === 'catalog'
                ? '📦 Catalog'
                : tab === 'orders'
                ? '📋 Orders'
                : tab === 'breakdown'
                ? '📊 Breakdown'
                : tab === 'per-person'
                ? '👤 Per-Person'
                : tab === 'payments'
                ? '💳 Payments'
                : tab === 'pricing'
                ? '💰 Pricing'
                : '🎨 Designers'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">Total Teams</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">{tenants.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">Active Teams</p>
                <p className="text-4xl font-bold text-green-600 mt-2">
                  {tenants.filter(t => t.status === 'active').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">Suspended Teams</p>
                <p className="text-4xl font-bold text-yellow-600 mt-2">
                  {tenants.filter(t => t.status === 'suspended').length}
                </p>
              </div>
            </div>

            {/* Create New Tenant Button */}
            <Link href="/platform-admin/tenants/new">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                + Create New Team
              </button>
            </Link>

            {/* Tenants Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Team Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">URL Slug</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Admin Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Created</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{tenant.name}</td>
                      <td className="px-6 py-4 text-gray-600">{tenant.slug}</td>
                      <td className="px-6 py-4 text-gray-600">{tenant.admin_email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            tenant.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/platform-admin/tenants/${tenant.id}`}>
                          <button className="text-blue-600 hover:text-blue-800 font-medium">
                            Manage
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {tenants.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">No teams yet. Create your first team to get started.</p>
                  <Link href="/platform-admin/tenants/new">
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Create First Team
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <CatalogManager />
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <TenantSelector onTenantSelect={setSelectedTenantId} selectedTenantId={selectedTenantId} />
            <OrdersManager selectedTenantId={selectedTenantId} />
          </div>
        )}

        {activeTab === 'breakdown' && (
          <div className="space-y-4">
            <TenantSelector onTenantSelect={setSelectedTenantId} selectedTenantId={selectedTenantId} />
            <BreakdownViewer selectedTenantId={selectedTenantId} />
          </div>
        )}

        {activeTab === 'per-person' && (
          <div className="space-y-4">
            <TenantSelector onTenantSelect={setSelectedTenantId} selectedTenantId={selectedTenantId} />
            <PerPersonViewer selectedTenantId={selectedTenantId} />
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <PaymentsManager />
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <TenantSelector onTenantSelect={setSelectedTenantId} selectedTenantId={selectedTenantId} />
            <PricingTierManager 
              productsEndpoint="/api/platform-admin/products"
              pricingTiersEndpoint="/api/platform-admin/pricing-tiers"
            />
          </div>
        )}

        {activeTab === 'designers' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">🎨 Designer Module</h3>
              <p className="text-blue-800 mb-4">
                Manage design requests and submissions from your teams
              </p>
              <div className="space-y-3">
                <Link href="/designer/login">
                  <button className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-center">
                    Access Designer Portal
                  </button>
                </Link>
                <p className="text-sm text-blue-700">
                  Login as a designer to view pending requests and submit proposals
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Designer Panel Features</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-blue-600 font-bold mr-2">•</span>
                    View all pending design requests
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 font-bold mr-2">•</span>
                    Submit design proposals with files
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 font-bold mr-2">•</span>
                    Track submission status
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 font-bold mr-2">•</span>
                    Receive team feedback
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Test Designer Account</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
                  <div>
                    <p className="font-semibold">Email:</p>
                    <p className="font-mono text-gray-600">designer@test.com</p>
                  </div>
                  <div>
                    <p className="font-semibold">Password:</p>
                    <p className="font-mono text-gray-600">TestDesigner123!</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Use these credentials to test the designer workflow
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
