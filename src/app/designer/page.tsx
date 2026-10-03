"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DesignRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  requester_email: string;
  team_name: string;
  submission_count: number;
}

export default function DesignerDashboard() {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/designer/design-requests");
      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading requests");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Design Requests Dashboard
        </h1>
        <p className="text-gray-600">
          View and respond to design requests from teams
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-600 text-lg mb-4">No design requests yet</p>
          <p className="text-gray-500">
            When teams submit design requests, they will appear here
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => (
            <Link key={request.id} href={`/designer/requests/${request.id}`}>
              <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {request.title}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      From: <span className="font-medium">{request.team_name}</span>
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : request.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {request.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    <span className="font-medium text-gray-900">
                      {request.submission_count}
                    </span>{" "}
                    submission{request.submission_count !== 1 ? "s" : ""}
                  </div>
                  <div>
                    Requested{" "}
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
