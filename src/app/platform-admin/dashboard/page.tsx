'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OrdersManager from '@/components/OrdersManager';
import BreakdownViewer from '@/components/BreakdownViewer';
import PerPersonViewer from '@/components/PerPersonViewer';
import PricingTierManager from '@/components/PricingTierManager';
import CatalogManager from '@/components/CatalogManager';
import PaymentsManager from '@/components/PaymentsManager';
import CampaignAdmin from '@/components/CampaignAdmin';
import TeamDesignsAdmin from '@/components/TeamDesignsAdmin';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  admin_email: string;
  status: 'active' | 'suspended';
  created_at: string;
}

type DashboardSection = 'overview' | 'settings' | 'catalog' | 'designs' | 'campaigns' | 'orders' | 'payments' | 'pricing';

export default function PlatformAdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/platform-admin/tenants');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/platform-admin/login');
          return;
        }
        throw new Error('Failed to fetch teams');
      }
      const data = await response.json();
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;

  const handleLogout = async () => {
    await fetch('/api/platform-admin/logout', { method: 'POST' });
    router.push('/platform-admin/login');
  };

  const sectionItems: Array<{ key: DashboardSection; label: string; icon: string }> = [
    { key: 'overview', label: 'Overview', icon: '🏠' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
    { key: 'catalog', label: 'Catalog', icon: '📦' },
    { key: 'designs', label: 'Designs', icon: '🎨' },
    { key: 'campaigns', label: 'Campaigns', icon: '🗂️' },
    { key: 'orders', label: 'Orders', icon: '📋' },
    { key: 'payments', label: 'Payments', icon: '💳' },
    { key: 'pricing', label: 'Pricing', icon: '💰' },
  ];

  const renderSectionContent = () => {
    if (!selectedTenantId && !selectedTenant) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-600">Select a team to manage its catalog, orders, pricing, campaigns, and settings.</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Team status</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{selectedTenant?.status ?? 'active'}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Portal URL</p>
                <p className="mt-2 text-lg font-semibold text-blue-700 break-all">/custom/{selectedTenant?.slug}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Admin email</p>
                <p className="mt-2 text-lg font-semibold text-gray-900 break-all">{selectedTenant?.admin_email ?? '—'}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick actions</h3>
              <div className="flex flex-wrap gap-3">
                <Link href={`/platform-admin/tenants/${selectedTenantId}`} className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Manage team settings
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveSection('catalog')}
                  className="inline-flex items-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
                >
                  Manage catalog
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('orders')}
                  className="inline-flex items-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
                >
                  View orders
                </button>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Team settings</h3>
              <p className="text-gray-600">Manage the selected team’s profile, portal URL, and team captain access.</p>
              <div className="mt-5 flex gap-3">
                <Link href={`/platform-admin/tenants/${selectedTenantId}`} className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Open team settings
                </Link>
              </div>
            </div>
          </div>
        );

      case 'catalog':
        return <CatalogManager />;

      case 'designs':
        return <TeamDesignsAdmin selectedTenantId={selectedTenantId} />;

      case 'campaigns':
        return (
          <div className="space-y-6">
            <CampaignAdmin selectedTenantId={selectedTenantId} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <BreakdownViewer selectedTenantId={selectedTenantId} />
              <PerPersonViewer selectedTenantId={selectedTenantId} />
            </div>
          </div>
        );

      case 'orders':
        return <OrdersManager selectedTenantId={selectedTenantId} />;

      case 'payments':
        return <PaymentsManager />;

      case 'pricing':
        return (
          <PricingTierManager
            productsEndpoint="/api/platform-admin/products"
            pricingTiersEndpoint="/api/platform-admin/pricing-tiers"
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Platform admin</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Teams dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedTenantId ?? 'all'}
              onChange={(event) => setSelectedTenantId(event.target.value === 'all' ? null : event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All teams</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>

            <Link href="/platform-admin/tenants/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + New team
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">All teams</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{tenants.length}</span>
              </div>

              <div className="space-y-2">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => {
                      setSelectedTenantId(tenant.id);
                      setActiveSection('overview');
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedTenantId === tenant.id
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{tenant.name}</p>
                        <p className="text-xs text-slate-500">/{tenant.slug}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        tenant.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {tenant.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedTenant && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selected team</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{selectedTenant.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{selectedTenant.slug}</p>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>Admin: {selectedTenant.admin_email}</p>
                  <p>Status: {selectedTenant.status}</p>
                </div>
                <div className="mt-4">
                  <Link href={`/platform-admin/tenants/${selectedTenant.id}`} className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    Manage team settings
                  </Link>
                </div>
              </div>
            )}
          </aside>

          <section className="space-y-6">
            {selectedTenant ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Active team</p>
                      <h2 className="mt-2 text-3xl font-bold text-slate-900">{selectedTenant.name}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                        selectedTenant.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedTenant.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {sectionItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveSection(item.key)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          activeSection === item.key
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {renderSectionContent()}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                <p className="text-lg font-semibold text-slate-900">No team selected</p>
                <p className="mt-2 text-slate-600">Choose a team from the left panel to access settings, catalog, campaigns, orders, pricing, and payments.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
