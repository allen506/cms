'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

function TeamUnlockContent() {
  const params = useParams();
  const teamSlug = params.teamname as string;
  const [teamPassword, setTeamPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingTeam, setValidatingTeam] = useState(true);
  const [teamExists, setTeamExists] = useState(false);
  const router = useRouter();

  // Validate team exists on mount
  useEffect(() => {
    const validateTeam = async () => {
      try {
        const response = await fetch('/api/tenant/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamSlug,
            teamPassword: '', // Empty password, just checking if team exists
          }),
        });

        const data = await response.json();

        // If we get "Team not found", the team doesn't exist
        if (response.status === 404 && data.error === 'Team not found') {
          setTeamExists(false);
        } else {
          // Any other response means team exists (either password required or wrong password)
          setTeamExists(true);
        }
      } catch (err) {
        // Assume team exists if we can't validate (network error, etc.)
        setTeamExists(true);
      } finally {
        setValidatingTeam(false);
      }
    };

    validateTeam();
  }, [teamSlug]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/tenant/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamSlug,
          teamPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid team password');
        return;
      }

      setSuccess('✓ Team verified! Redirecting...');
      // Store verification in session/cookie and redirect
      document.cookie = `team_verified_${teamSlug}=true; path=/; secure; samesite=lax`;
      
      setTimeout(() => {
        router.push(`/custom/${teamSlug}/login`);
      }, 500);
    } catch (err) {
      setError('Failed to verify team password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while validating team
  if (validatingTeam) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#f5f5f7' }}
      >
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-gray-200 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Validating team...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if team doesn't exist
  if (!teamExists) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#f5f5f7' }}
      >
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-red-200">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-red-900 mb-2">Team Not Found</h1>
              <p className="text-red-700">
                The team "{teamSlug}" does not exist in our system.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">
                Please check the team name and try again, or contact your system administrator.
              </p>
            </div>

            <Link
              href="/custom"
              className="block text-center w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 mb-4"
            >
              ← Back to Portal Entry
            </Link>

            <div className="text-center">
              <p className="text-gray-600 text-sm">
                Team name: <code className="bg-gray-100 px-2 py-1 rounded">{teamSlug}</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#f5f5f7' }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-gray-200">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {teamSlug.charAt(0).toUpperCase() + teamSlug.slice(1)}
            </h1>
            <p className="text-gray-600">Team Portal Access</p>
          </div>

          {/* Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Password
              </label>
              <input
                type="password"
                value={teamPassword}
                onChange={(e) => {
                  setTeamPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter team password"
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 placeholder-gray-400"
              />
              <p className="text-sm text-gray-500 mt-2">
                Ask your team coordinator for the team password
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Verifying...' : 'Unlock Portal'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Password Reset Link */}
          <div className="text-center">
            <Link
              href={`/custom/${teamSlug}/forgot-password`}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Forgot team password?
            </Link>
          </div>

          {/* Back Button */}
          <div className="text-center mt-8">
            <Link
              href="/custom"
              className="text-gray-600 hover:text-gray-700 text-sm"
            >
              ← Back to portal entry
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-xs">
          <p>Secure portal for {teamSlug} team members</p>
        </div>
      </div>
    </div>
  );
}

export default function TeamUnlock() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <TeamUnlockContent />
    </Suspense>
  );
}
