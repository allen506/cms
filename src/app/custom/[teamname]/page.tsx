import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db-async";

export default async function TeamHomePage({
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
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome, {team.name}!
          </h1>
          <p className="text-gray-600">
            Manage your team orders with CMS Sportswear
          </p>
        </div>

        {/* Order Flow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Step 1: Design Request */}
          <Link href={`/custom/${teamname}/order/design-requests`}>
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Step 1: Design Request
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Submit your custom design ideas to our design team. Include details about colors, logos, and any special requirements.
              </p>
              <div className="inline-flex items-center text-blue-600 font-semibold">
                Start Here
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
              </div>
            </div>
          </Link>

          {/* Step 2: Select Products */}
          <Link href={`/custom/${teamname}/order/products`}>
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <span className="text-xl font-bold text-blue-600">2</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Step 2: Select Products
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Browse available products and pricing. Choose quantities and styles. Your design must be approved before this step.
              </p>
              <div className="inline-flex items-center text-blue-600 font-semibold">
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
              </div>
            </div>
          </Link>

          {/* Step 3: Checkout */}
          <div className="bg-gray-50 rounded-lg shadow p-6 opacity-60">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-300 rounded-full mb-4">
              <span className="text-xl font-bold text-gray-600">3</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Step 3: Payment & Review
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Review your order and proceed to payment. Complete this step after selecting products.
            </p>
            <div className="inline-flex items-center text-gray-400 font-semibold">
              Coming Soon
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📋 How the Process Works
          </h3>
          <ul className="space-y-3 text-gray-600">
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Design Submission:</strong> Share your design vision with our team
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Design Approval:</strong> Our design team will work with you to finalize your design
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Product Selection:</strong> Once approved, select your products and quantities
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Payment:</strong> 50% deposit upfront, balance due before shipping
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
