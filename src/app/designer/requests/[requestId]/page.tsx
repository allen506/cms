"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  files: Array<{
    id: string;
    filename: string;
    file_size: number;
  }>;
  submissions: Array<{
    id: string;
    version_number: number;
    status: string;
    submitted_at: string;
    submission_notes: string;
  }>;
}

export default function RequestDetailPage({
  params,
}: {
  params: { requestId: string };
}) {
  const [request, setRequest] = useState<DesignRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchRequest();
  }, [params.requestId]);

  const fetchRequest = async () => {
    try {
      const response = await fetch(
        `/api/designer/design-requests/${params.requestId}`
      );
      if (response.status === 404) {
        setError("Request not found");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load request");
      }
      const data = await response.json();
      setRequest(data.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading request");
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

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Link href="/designer">
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Dashboard
          </button>
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 text-lg font-medium">{error || "Request not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/designer">
        <button className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Dashboard
        </button>
      </Link>

      {/* Request Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
            <p className="text-gray-600 mt-2">
              From: <span className="font-medium">{request.team_name}</span>
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-full font-medium ${
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

        <p className="text-gray-700 mb-4">{request.description}</p>

        <div className="text-sm text-gray-500">
          Requested {new Date(request.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Request Files */}
      {request.files.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📎 Attached Files
          </h2>
          <div className="space-y-2">
            {request.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-gray-900">{file.filename}</p>
                    <p className="text-sm text-gray-500">
                      {(file.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 font-medium">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          💬 Submissions ({request.submissions.length})
        </h2>
        {request.submissions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No submissions yet. Be the first to submit!
          </p>
        ) : (
          <div className="space-y-4">
            {request.submissions.map((submission) => (
              <div
                key={submission.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      Version {submission.version_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      submission.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : submission.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {submission.status}
                  </span>
                </div>
                {submission.submission_notes && (
                  <p className="text-gray-700 text-sm mt-2">
                    {submission.submission_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Design Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📤 Submit Your Design
        </h2>
        <p className="text-gray-700 mb-4">
          Upload your design files below to submit your proposal for this request.
        </p>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
          Upload Files
        </button>
      </div>
    </div>
  );
}
