import Link from "next/link";

export default function DeprecationNotice() {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">This interface is deprecated</h3>
          <p className="mt-2 text-sm text-yellow-700">
            This legacy admin interface is being consolidated into the unified{" "}
            <Link href="/platform-admin/dashboard" className="font-semibold underline hover:text-yellow-900">
              Platform Admin Dashboard
            </Link>
            . Please use the new interface for all admin operations.
          </p>
          <p className="mt-2 text-xs text-yellow-600">
            This interface will be removed in a future release. All functionality is now available in the Platform Admin Dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
