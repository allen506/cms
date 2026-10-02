"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function NewDesignRequestPage() {
  const params = useParams();
  const router = useRouter();
  const teamname = params.teamname as string;

  const [isCaptain, setIsCaptain] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    colors: "",
    specialRequirements: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkCaptainStatus = async () => {
      try {
        const response = await fetch(`/api/tenant/user/profile`, {
          headers: {
            'x-tenant-slug': teamname,
          },
        });

        if (!response.ok) {
          throw new Error('Not authorized');
        }

        const data = await response.json();
        setIsCaptain(data.user?.isCaptain || false);

        if (!data.user?.isCaptain) {
          // Redirect non-captains back to list
          setTimeout(() => {
            router.push(`/custom/${teamname}/order/design-requests`);
          }, 1000);
        }
      } catch (err) {
        console.error('Error checking captain status:', err);
        router.push(`/custom/${teamname}/login`);
      }
    };

    checkCaptainStatus();
  }, [teamname, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('colors', formData.colors);
      formDataToSend.append('specialRequirements', formData.specialRequirements);
      formDataToSend.append('teamSlug', teamname);

      // Add files
      files.forEach((file) => {
        formDataToSend.append('files', file);
      });

      const response = await fetch("/api/tenant/design-requests", {
        method: "POST",
        headers: {
          "x-tenant-slug": teamname,
        },
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit design request");
      }

      setSuccess(true);
      setFormData({
        title: "",
        description: "",
        colors: "",
        specialRequirements: "",
      });
      setFiles([]);

      setTimeout(() => {
        router.push(`/custom/${teamname}/order/design-requests`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (isCaptain === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isCaptain === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-red-900 mb-2">
              Access Denied
            </h1>
            <p className="text-red-800 mb-6">
              Only team captains can submit design requests.
            </p>
            <Link
              href={`/custom/${teamname}/order/design-requests`}
              className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              Back to Requests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/custom/${teamname}/order/design-requests`}
            className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block"
          >
            ← Back to Design Requests
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit New Design Request
          </h1>
          <p className="text-gray-600">
            Tell our design team your vision for your team's custom products
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              ✓ Design request submitted successfully! Redirecting...
            </p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Design Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., 2024 Team Jersey Design"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Give your design a descriptive name
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Design Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your vision. Include style preferences, themes, and any specific ideas you have..."
                required
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Be as detailed as possible to help our designers understand your vision
              </p>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Preferred Colors
              </label>
              <input
                type="text"
                name="colors"
                value={formData.colors}
                onChange={handleChange}
                placeholder="e.g., Navy Blue, White, Gold"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                List your preferred colors (comma-separated)
              </p>
            </div>

            {/* Design Files Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Design Ideas - Upload Files
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  name="files"
                  multiple
                  accept="image/*,.pdf,.psd,.ai,.sketch,.figma"
                  onChange={(e) => {
                    const selectedFiles = Array.from(e.target.files || []);
                    setFiles((prev) => [...prev, ...selectedFiles]);
                  }}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <p className="text-gray-600 font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, PDF, PSD, AI, Sketch, Figma files
                    </p>
                  </div>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Upload designs, logos, mockups, or any design reference files (multiple files supported)
              </p>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Selected Files ({files.length})
                  </h4>
                  <ul className="space-y-2">
                    {files.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Special Requirements */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Special Requirements
              </label>
              <textarea
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleChange}
                placeholder="Any special requests, budget constraints, or timeline requirements..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? "Submitting..." : "Submit Design Request"}
              </button>
              <Link
                href={`/custom/${teamname}/order/design-requests`}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg text-center transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            📝 What Happens Next?
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex gap-2">
              <span>1.</span>
              <span>Our design team will review your submission</span>
            </li>
            <li className="flex gap-2">
              <span>2.</span>
              <span>
                We'll reach out if we need clarification or additional details
              </span>
            </li>
            <li className="flex gap-2">
              <span>3.</span>
              <span>Once approved, you can move to Step 2: Select Products</span>
            </li>
            <li className="flex gap-2">
              <span>4.</span>
              <span>
                You'll receive updates on your design status via email
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
