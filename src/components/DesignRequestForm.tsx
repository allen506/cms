"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface DesignRequestFormProps {
  teamName: string;
  onSuccess?: (requestId: string) => void;
}

export default function DesignRequestForm({
  teamName,
  onSuccess,
}: DesignRequestFormProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    unlockCategory: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.title.trim()) {
      setError(t("design.errTitle"));
      return;
    }

    if (!formData.description.trim()) {
      setError(t("design.errDesc"));
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create design request
      const createResponse = await fetch("/api/designs/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": teamName.toLowerCase(),
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          unlockCategory: formData.unlockCategory || null,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || "Failed to create design request");
      }

      const createData = await createResponse.json();
      const requestId = createData.requestId;

      // Step 2: Upload files if any
      if (files.length > 0) {
        const uploadFormData = new FormData();
        files.forEach((file) => {
          uploadFormData.append("files", file);
        });

        const uploadResponse = await fetch(
          `/api/designs/requests/${requestId}/files`,
          {
            method: "POST",
            headers: {
              "x-tenant-slug": teamName.toLowerCase(),
            },
            body: uploadFormData,
          }
        );

        if (!uploadResponse.ok) {
          console.warn("File upload warning - continuing anyway");
        }
      }

      setSuccess(t("design.success"));
      setFormData({ title: "", description: "", unlockCategory: "" });
      setFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Call callback or redirect after 2 seconds
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(requestId);
        } else {
          router.push(`/custom/${teamName}/order/design-requests`);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t("design.requestTitle")}
        </h2>
        <p className="text-gray-600">{t("design.requestSubtitle")}</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t("design.titleLabel")} *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder={t("design.titlePlaceholder")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <p className="mt-1 text-sm text-gray-500">
            {t("design.titleHint")}
          </p>
        </div>

        {/* Product Category */}
        <div>
          <label
            htmlFor="unlockCategory"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t("design.categoryLabel")}
          </label>
          <select
            id="unlockCategory"
            name="unlockCategory"
            value={formData.unlockCategory}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">{t("design.categoryAll")}</option>
            <option value="enduro-jersey">{t("design.catEnduro")}</option>
            <option value="cycling-jersey">{t("design.catCycling")}</option>
            <option value="bib-licra">{t("design.catBib")}</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            {t("design.categoryHint")}
          </p>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t("design.descLabel")} *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder={t("design.descPlaceholder")}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <p className="mt-1 text-sm text-gray-500">
            {t("design.descHint")}
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("design.filesLabel")}
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500"
              disabled={isLoading}
              accept="image/*,.pdf"
            />
            <p className="mt-2 text-sm text-gray-500">
              {t("design.filesHint")}
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-gray-900">
                {t("design.uploadedFiles")}
              </h4>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-900 text-sm"
                    disabled={isLoading}
                  >
                    {t("design.remove")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? t("design.submitting") : t("design.submit")}
          </button>
        </div>
      </form>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">
          {t("design.whatsNext")}
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ {t("design.next1")}</li>
          <li>✓ {t("design.next2")}</li>
          <li>✓ {t("design.next3")}</li>
          <li>✓ {t("design.next4")}</li>
        </ul>
      </div>
    </div>
  );
}
