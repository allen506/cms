"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DesignFile {
  id: string;
  filename: string;
  file_size: number;
  file_path: string;
  mime_type: string;
  download_url: string | null;
}

interface Submission {
  id: string;
  version_number: number;
  status: string;
  submitted_at: string;
  submission_notes: string;
  designer_name: string;
  file_count: number;
}

interface DesignRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  requester_email: string;
  requester_name: string;
  team_name: string;
  files: DesignFile[];
  submissions: Submission[];
}

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const [request, setRequest] = useState<DesignRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    params.then(({ requestId }) => {
      fetchRequest(requestId);
    });
  }, []);

  const fetchRequest = async (requestId: string) => {
    try {
      const response = await fetch(
        `/api/designer/design-requests/${requestId}`
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/designer">
        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">
          ← Back to Dashboard
        </button>
      </Link>

      {/* Request Header */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{request.title}</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              From: <span className="font-medium">{request.team_name || "Unknown Team"}</span>
            </p>
            {request.requester_name && (
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                Requested by: {request.requester_name} ({request.requester_email})
              </p>
            )}
          </div>
          <span
            className={`px-3 sm:px-4 py-2 rounded-full font-medium text-sm sm:text-base whitespace-nowrap ${
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

        <div className="bg-gray-50 rounded p-4 my-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">📋 Description</h3>
          <p className="text-gray-700 text-sm sm:text-base whitespace-pre-wrap">{request.description}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 text-xs sm:text-sm text-gray-600">
          <div>
            <span className="font-semibold">Requested:</span> {new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {request.updated_at && (
            <div>
              <span className="font-semibold">Updated:</span> {new Date(request.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Request Files */}
      {request.files.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            📎 Attached Files ({request.files.length})
          </h2>
          <div className="space-y-2">
            {request.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{file.filename}</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {(file.file_size / 1024).toFixed(1)} KB {file.mime_type && `• ${file.mime_type}`}
                    </p>
                  </div>
                </div>
                {file.download_url && (
                  <a
                    href={file.download_url}
                    className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ml-2"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          💬 Submissions ({request.submissions.length})
        </h2>
        {request.submissions.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm sm:text-base">
            No submissions yet. Be the first to submit your proposal!
          </p>
        ) : (
          <div className="space-y-4">
            {request.submissions.map((submission) => (
              <div
                key={submission.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      Version {submission.version_number}
                      {submission.designer_name && (
                        <span className="text-gray-600 font-normal text-xs sm:text-sm ml-2">
                          by {submission.designer_name}
                        </span>
                      )}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Submitted {new Date(submission.submitted_at).toLocaleDateString()} {new Date(submission.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {submission.file_count > 0 && ` • ${submission.file_count} file${submission.file_count !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                      submission.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : submission.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : submission.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {submission.status}
                  </span>
                </div>
                {submission.submission_notes && (
                  <div className="bg-gray-50 rounded p-3 mt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Notes:</p>
                    <p className="text-gray-700 text-xs sm:text-sm whitespace-pre-wrap">
                      {submission.submission_notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Design Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
          📤 Submit Your Proposal
        </h2>
        <p className="text-gray-700 text-sm sm:text-base mb-4">
          Ready to submit your design? Upload your files and notes below.
        </p>
        <button className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base">
          Upload Design Files
        </button>
      </div>
    </div>
  );
}
