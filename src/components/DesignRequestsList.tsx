"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DesignRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  file_count: number;
  submission_count: number;
  requester_email: string;
}

interface DesignRequestsListProps {
  teamName: string;
  userId: string | null;
}

export default function DesignRequestsList({
  teamName,
  userId,
}: DesignRequestsListProps) {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch("/api/designs/requests", {
          headers: {
            "x-tenant-slug": teamName.toLowerCase(),
          },
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load design requests");
        }

        const data = await response.json();
        setRequests(data.requests || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [teamName]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_design":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 text-sm">Loading design requests...</p>
        </div>
      </div>
    );
  }

  if (error === "User ID required" || error === "Not authenticated") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6">
        <p className="text-amber-800 font-semibold mb-2 text-sm sm:text-base">Authentication Required</p>
        <p className="text-amber-700 text-xs sm:text-sm mb-4">
          You need to be logged in to view design requests.
        </p>
        <Link
          href={`/custom/${teamName}/login`}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
        <p className="text-red-800 text-sm sm:text-base">{error}</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 sm:p-12 text-center">
        <div className="text-gray-400 text-3xl sm:text-5xl mb-4">📋</div>
        <p className="text-gray-600 font-semibold mb-2 sm:text-lg text-sm">No design requests yet</p>
        <p className="text-gray-500 text-xs sm:text-base mb-4 sm:mb-6">
          Start by submitting your first design request
        </p>
        <Link
          href={`/custom/${teamName}/order/design`}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
        >
          Create Design Request
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Design Requests</h3>
        <p className="text-sm text-gray-600 mt-1">
          Track all your design requests and submissions
        </p>
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Submissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Files
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {request.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {request.description.substring(0, 50)}...
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      request.status
                    )}`}
                  >
                    {getStatusLabel(request.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {request.submission_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {request.file_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(request.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/custom/${teamName}/order/design-requests/${request.id}`}
                    className="text-blue-600 hover:text-blue-900 font-semibold text-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Shown only on mobile */}
      <div className="md:hidden divide-y divide-gray-200">
        {requests.map((request) => (
          <div key={request.id} className="px-4 py-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm">
                  {request.title}
                </h4>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {request.description}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${getStatusColor(
                  request.status
                )}`}
              >
                {getStatusLabel(request.status)}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-gray-600">
              <div>
                <span className="font-semibold">Submissions:</span> {request.submission_count}
              </div>
              <div>
                <span className="font-semibold">Files:</span> {request.file_count}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                {formatDate(request.created_at)}
              </span>
              <Link
                href={`/custom/${teamName}/order/design-requests/${request.id}`}
                className="text-blue-600 hover:text-blue-900 font-semibold text-sm"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600">
          Total: <span className="font-semibold">{requests.length}</span>{" "}
          request(s)
        </p>
        <Link
          href={`/custom/${teamName}/order/design`}
          className="text-center sm:text-left text-blue-600 hover:text-blue-900 font-semibold text-sm"
        >
          + New Request
        </Link>
      </div>
    </div>
  );
}
