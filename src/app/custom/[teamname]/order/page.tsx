import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db-async";

export default async function OrderHubPage({
  params}: {
  params: Promise<{ teamname: string }>;
}) {
  const { teamname } = await params;

  // Verify team exists
  const team = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM tenants WHERE slug = ?",
    [teamname.toLowerCase()]
  );

  if (!team) {
    redirect("/custom");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Orders</h1>
          <p className="text-gray-600">Manage your design and product selections</p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Design Requests */}
          <Link href={`/custom/${teamname}/order/design-requests`}>
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-8 cursor-pointer">
              <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.5a2 2 0 00-1 .267V5a2 2 0 10-4 0v.75"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Design Requests
              </h2>
              <p className="text-gray-600 mb-4">
                Submit new design requests or view the status of your existing designs
              </p>
              <span className="inline-flex items-center text-indigo-600 font-semibold">
                View Designs
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </div>
          </Link>

          {/* Products & Pricing */}
          <Link href={`/custom/${teamname}/order/products`}>
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-8 cursor-pointer">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Products & Pricing
              </h2>
              <p className="text-gray-600 mb-4">
                Browse our product catalog and pricing. Select your items once your design is approved
              </p>
              <span className="inline-flex items-center text-green-600 font-semibold">
                View Products
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </div>
          </Link>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">💡 Tip</h3>
          <p className="text-blue-800">
            You can only select products after your design has been approved by our design team. If you haven't submitted a design yet, start with "Design Requests" above.
          </p>
        </div>
      </div>
    </div>
  );
}
