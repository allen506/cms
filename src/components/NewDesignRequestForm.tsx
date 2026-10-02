"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface NewDesignRequestFormProps {
  teamname: string;
}

export default function NewDesignRequestForm({ teamname }: NewDesignRequestFormProps) {
  const router = useRouter();
  
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add("border-blue-500", "bg-blue-50");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isCaptain === false) {
    return (
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
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-semibold">
            ✓ Design request submitted successfully! Redirecting...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
          Request Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Team Jersey Design"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your design concept, style preferences, etc."
          rows={4}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Colors */}
      <div>
        <label htmlFor="colors" className="block text-sm font-semibold text-gray-900 mb-2">
          Color Preferences
        </label>
        <textarea
          id="colors"
          name="colors"
          value={formData.colors}
          onChange={handleChange}
          placeholder="List preferred colors"
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Special Requirements */}
      <div>
        <label htmlFor="specialRequirements" className="block text-sm font-semibold text-gray-900 mb-2">
          Special Requirements
        </label>
        <textarea
          id="specialRequirements"
          name="specialRequirements"
          value={formData.specialRequirements}
          onChange={handleChange}
          placeholder="Any specific requirements or constraints"
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Design Ideas - Upload Files
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
        >
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-gray-700 font-semibold mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-gray-600 text-sm">
              PNG, JPG, PDF, PSD, AI, Figma, etc. (Multiple files supported)
            </p>
          </div>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="fileInput"
            accept="image/*,.pdf,.psd,.ai,.sketch,.figma"
          />
          <label
            htmlFor="fileInput"
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg cursor-pointer transition"
          >
            Select Files
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900">
              Selected Files ({files.length}):
            </p>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
              >
                <span className="text-sm text-gray-700">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-600 hover:text-red-700 font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
        >
          {loading ? "Submitting..." : "Submit Design Request"}
        </button>
        <Link
          href={`/custom/${teamname}/order/design-requests`}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 rounded-lg text-center transition"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
