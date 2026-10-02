"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TeamPortalNav from "@/components/TeamPortalNav";
import DesignRequestsList from "@/components/DesignRequestsList";

export default function DesignRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const teamname = params.teamname as string;
  
  const [isCaptain, setIsCaptain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is team captain from session
    const checkCaptainStatus = async () => {
      try {
        // Get user ID from cookie
        const userIdCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('tenant_user_id='));
        
        if (!userIdCookie) {
          router.push(`/custom/${teamname}/login`);
          return;
        }

        const id = userIdCookie.split('=')[1];
        setUserId(id);

        // Fetch user data to check captain status
        const response = await fetch(`/api/tenant/user/profile`, {
          headers: {
            'x-tenant-slug': teamname,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();
        setIsCaptain(data.user?.isCaptain || false);
      } catch (error) {
        console.error('Error checking captain status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkCaptainStatus();
  }, [teamname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <TeamPortalNav />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-8 text-sm text-gray-600">
            <Link href={`/custom/${teamname}`} className="hover:text-gray-900">
              {teamname}
            </Link>
            {" / "}
            <span className="text-gray-900 font-semibold">Design Requests</span>
          </div>

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Design Requests
              </h1>
              <p className="text-gray-600">
                View and manage all your custom design requests
              </p>
            </div>
            {isCaptain && (
              <Link
                href={`/custom/${teamname}/order/design-requests/new`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                + New Request
              </Link>
            )}
          </div>

          {!isCaptain && (
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                ℹ️ Team Captain Access Required
              </h3>
              <p className="text-amber-800">
                Only team captains can submit design requests. If you believe you should have captain access, please contact your team administrator.
              </p>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <DesignRequestsList teamName={teamname} userId={userId} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Info Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  How It Works
                </h3>
                <ol className="space-y-3 text-sm text-gray-600">
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Submit your design requirements</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Our designers create proposals</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Review and provide feedback</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">4.</span>
                    <span>Approve your favorite design</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">5.</span>
                    <span>Select products and order</span>
                  </li>
                </ol>
              </div>

              {/* Status Guide */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Request Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                    <span className="text-sm text-gray-700">
                      <span className="font-semibold">Pending</span> - Awaiting
                      designer review
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full" />
                    <span className="text-sm text-gray-700">
                      <span className="font-semibold">In Design</span> - Designers
                      working
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full" />
                    <span className="text-sm text-gray-700">
                      <span className="font-semibold">Approved</span> - Ready to
                      order
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                    <span className="text-sm text-gray-700">
                      <span className="font-semibold">Rejected</span> - Requesting
                      changes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
