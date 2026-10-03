"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DesignSubmissionFormProps {
  requestId: string;
  requestTitle: string;
}

export default function DesignSubmissionForm({
  requestId,
  requestTitle,
}: DesignSubmissionFormProps) {
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

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

    if (files.length === 0) {
      setError("Please upload at least one design file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("submission_notes", submissionNotes);

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(
        `/api/designer/design-requests/${requestId}/submit`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit design");
      }

      setSuccess(true);
      setSubmissionNotes("");
      setFiles([]);

      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Design submitted successfully!</p>
            <p className="text-sm text-green-700 mt-1">
              Your proposal has been submitted for "{requestTitle}". You will be notified when the team responds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <p className="text-red-800 text-sm sm:text-base">{error}</p>
        </div>
      )}

      {/* Submission Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-2">
          Design Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={submissionNotes}
          onChange={(e) => setSubmissionNotes(e.target.value)}
          placeholder="Explain your design choices, inspiration, or any notes for the team..."
          rows={4}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
        />
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Help the team understand your design approach and any special considerations.
        </p>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Design Files *
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center cursor-pointer hover:border-blue-500 transition"
        >
          <div className="flex flex-col items-center">
            <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">🎨</div>
            <p className="text-gray-700 font-semibold mb-1 text-sm sm:text-base">
              Click to upload or drag and drop
            </p>
            <p className="text-gray-600 text-xs sm:text-sm">
              PNG, JPG, PDF, PSD, AI, Figma, Sketch, etc.
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
            className="mt-3 sm:mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg cursor-pointer transition text-sm sm:text-base"
          >
            Select Files
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900">
              Attached Files ({files.length}):
            </p>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200 gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">📄</span>
                  <span className="text-xs sm:text-sm text-gray-700 truncate">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-600 hover:text-red-700 font-semibold text-xs sm:text-sm flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6">
        <button
          type="submit"
          disabled={loading || files.length === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition text-sm sm:text-base"
        >
          {loading ? "Submitting Design..." : "Submit Design Proposal"}
        </button>
      </div>
    </form>
  );
}
