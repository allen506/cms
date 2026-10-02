'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default function TenantEditPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showCaptainsForm, setShowCaptainsForm] = useState(false);

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const fetchTenant = async () => {
    try {
      const response = await fetch(`/api/platform-admin/tenants/${tenantId}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/platform-admin/login');
          return;
        }
        throw new Error('Failed to fetch tenant');
      }
      const data = await response.json();
      setTenant(data);
      setFormData({
        name: data.name,
        slug: data.slug,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const response = await fetch(`/api/platform-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update tenant');
      }

      setSuccess('Team updated successfully');
      setTimeout(() => {
        router.push('/platform-admin/dashboard');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/platform-admin/tenants/${tenantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tenant');
      }

      setSuccess('Team deleted successfully');
      setTimeout(() => {
        router.push('/platform-admin/dashboard');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant');
      setSaving(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await fetch(
        `/api/platform-admin/team-captains?tenant_id=${tenantId}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const data = await response.json();
      setTeamMembers(data.users || []);
    } catch (err) {
      console.error('Error fetching team members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleToggleCaptain = async (userId: string, email: string, currentStatus: boolean) => {
    try {
      setSaving(true);
      const response = await fetch('/api/platform-admin/team-captains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          tenantId,
          isCaptain: !currentStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update captain status');
      }

      // Refresh the list
      await fetchTeamMembers();
      setSuccess(`Captain status updated for ${email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update captain status');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/platform-admin/tenants/${tenantId}/password`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword: passwordData.newPassword,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update password');
      }

      setPasswordSuccess('Team password updated successfully');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Failed to update password'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team details...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Team not found</p>
          <Link href="/platform-admin/dashboard">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/platform-admin/dashboard">
                <button className="text-blue-600 hover:text-blue-800 mb-2 font-medium">
                  ← Back to Dashboard
                </button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Edit Team: {tenant.name}</h1>
              <p className="text-gray-600 mt-1">Manage team details and settings</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ThinkMTB"
              />
            </div>

            {/* URL Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL Slug *</label>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">custom.cmssportswear.us/custom/</span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., thinkmtb"
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">URL-friendly name (lowercase, no spaces)</p>
            </div>

            {/* Created Date (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Created Date</label>
              <input
                type="text"
                disabled
                value={new Date(tenant.created_at).toLocaleDateString()} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            {/* Team ID (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team ID</label>
              <input
                type="text"
                disabled
                value={tenant.id}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50"
              >
                Delete Team
              </button>
              <Link href="/platform-admin/dashboard">
                <button
                  type="button"
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Cancel
                </button>
              </Link>
            </div>
          </form>
        </div>

        {/* Team Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-blue-900 mb-3">Team Information</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-blue-800">Portal URL</dt>
              <dd className="text-blue-700 break-all">custom.cmssportswear.us/custom/{tenant.slug}</dd>
            </div>
            <div>
              <dt className="font-medium text-blue-800">Unlock URL</dt>
              <dd className="text-blue-700 break-all">custom.cmssportswear.us/custom/{tenant.slug}/unlock</dd>
            </div>
            <div>
              <dt className="font-medium text-blue-800">Created</dt>
              <dd className="text-blue-700">{new Date(tenant.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {/* Team Captains Management */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-blue-900">Team Captains</h3>
            {!showCaptainsForm && (
              <button
                onClick={() => {
                  fetchTeamMembers();
                  setShowCaptainsForm(true);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
              >
                Manage Captains
              </button>
            )}
          </div>

          {showCaptainsForm && (
            <div className="space-y-4">
              {loadingMembers ? (
                <p className="text-blue-800">Loading team members...</p>
              ) : teamMembers.length === 0 ? (
                <p className="text-blue-800">No team members found</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-white p-3 rounded border border-blue-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{member.email}</p>
                        <p className="text-sm text-gray-500">
                          {member.isCaptain ? '👑 Captain' : 'Team Member'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleCaptain(member.id, member.email, member.isCaptain)}
                        disabled={saving}
                        className={`px-4 py-2 rounded text-white font-semibold text-sm transition ${
                          member.isCaptain
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-green-600 hover:bg-green-700'
                        } disabled:opacity-50`}
                      >
                        {member.isCaptain ? 'Remove Captain' : 'Make Captain'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowCaptainsForm(false);
                  setTeamMembers([]);
                }}
                disabled={saving}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
              >
                Done
              </button>
            </div>
          )}

          {!showCaptainsForm && (
            <p className="text-sm text-blue-800">
              Only team captains can submit design requests. Manage who has captain access for this team.
            </p>
          )}
        </div>

        {/* Team Portal Password Management */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-yellow-900">Team Portal Password</h3>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition"
              >
                Change Password
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-red-800 text-sm">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                  <p className="text-green-800 text-sm">{passwordSuccess}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-yellow-900 mb-2">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter new password (min. 6 characters)"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-yellow-900 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Confirm password"
                  minLength={6}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-yellow-700 mt-3">
                💡 This password is used to unlock the team portal at{' '}
                <code className="bg-yellow-100 px-1 py-0.5 rounded">
                  custom.cmssportswear.us/custom/{tenant.slug}/unlock
                </code>
              </p>
            </form>
          )}

          {!showPasswordForm && (
            <p className="text-sm text-yellow-800">
              Use this to manage the password team members use to unlock the team portal.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
