"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DesignRequestsHeaderProps {
  teamname: string;
}

export default function DesignRequestsHeader({ teamname }: DesignRequestsHeaderProps) {
  const [isCaptain, setIsCaptain] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCaptainStatus = async () => {
      try {
        const response = await fetch(`/api/tenant/user/profile`, {
          headers: {
            'x-tenant-slug': teamname,
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setIsCaptain(data.user?.isCaptain || false);
        }
      } catch (error) {
        console.error('Error checking captain status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkCaptainStatus();
  }, [teamname]);

  return (
    <>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            Design Requests
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            View and manage all your custom design requests
          </p>
        </div>
        {!loading && isCaptain && (
          <Link
            href={`/custom/${teamname}/order/design-requests/new`}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-colors text-center sm:text-left text-sm sm:text-base"
          >
            + New Request
          </Link>
        )}
      </div>

      {!loading && !isCaptain && (
        <div className="mb-6 sm:mb-8 bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-amber-900 mb-2">
            ℹ️ Team Captain Access Required
          </h3>
          <p className="text-amber-800 text-sm sm:text-base">
            Only team captains can submit design requests. If you believe you should have captain access, please contact your team administrator.
          </p>
        </div>
      )}
    </>
  );
}
