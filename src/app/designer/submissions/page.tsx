"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Submission {
  id: string;
  version_number: number;
  status: string;
  submitted_at: string;
  submission_notes: string;
  request_title: string;
  request_id: string;
  team_name: string;
  file_count: number;
}

export default function DesignerSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch("/api/designer/design-requests");
      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }
      const data = await response.json();
      // Extract all submissions from all requests
      const allSubmissions: Submission[] = [];
      data.requests?.forEach((request: any) => {
        if (request.submissions && Array.isArray(request.submissions)) {
          request.submissions.forEach((sub: any) => {
            allSubmissions.push({
              ...sub,
              request_title: request.title,
              request_id: request.id,
              team_name: request.team_name,
            });
          });
        }
      });
      setSubmissions(allSubmissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading submissions");
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
          My Submissions
        </h1>
        <p className="text-gray-600">
          Track all your design submissions and feedback from teams
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📤</div>
          <p className="text-gray-600 text-lg mb-4">No submissions yet</p>
          <p className="text-gray-500 mb-6">
            Your submitted proposals will appear here. Go to the dashboard to view design requests and submit your designs.
          </p>
          <Link href="/designer">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition">
              View Design Requests
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {submissions.map((submission) => (
            <Link key={submission.id} href={`/designer/requests/${submission.request_id}`}>
              <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {submission.request_title}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      For: <span className="font-medium">{submission.team_name}</span>
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Your Notes:</p>
                    <p className="text-gray-700 text-sm line-clamp-2">
                      {submission.submission_notes}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Version {submission.version_number} • {submission.file_count} file{submission.file_count !== 1 ? "s" : ""}
                  </div>
                  <div>
                    Submitted {new Date(submission.submitted_at).toLocaleDateString()}
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
