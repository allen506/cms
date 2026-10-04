import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import ProductSelectionForm from "@/components/ProductSelectionForm";
import { queryOne } from "@/lib/db-async";
import { getCurrentTeamOrderAccess } from "@/lib/unlock";

export async function generateMetadata({
  params}: {
  params: Promise<{ teamname: string }>;
}): Promise<Metadata> {
  const { teamname } = await params;
  
  // Try to get team name from database
  const team = await queryOne<{ name: string }>(
    "SELECT name FROM tenants WHERE slug = ?",
    [teamname.toLowerCase()]
  );
  
  return {
    title: "CMS Sportswear - Select Products",
    description: `Place your order with ${team?.name || teamname} using CMS Sportswear`};
}

export default async function ProductSelectionPage({
  params,
  searchParams}: {
  params: Promise<{ teamname: string }>;
  searchParams: Promise<{ designRequestId?: string }>;
}) {
  const { teamname } = await params;
  const { designRequestId } = await searchParams;

  // Verify team exists
  const team = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM tenants WHERE slug = ?",
    [teamname.toLowerCase()]
  );

  if (!team) {
    redirect("/custom");
  }

  // Gate access: the team must have an approved design before selecting products.
  const { hasApprovedDesign } = await getCurrentTeamOrderAccess(teamname);

  // If designRequestId provided, verify it's approved
  if (designRequestId) {
    const designRequest = await queryOne<{ status: string }>(
      "SELECT status FROM design_requests WHERE id = ?",
      [designRequestId]
    );

    if (!designRequest || designRequest.status !== "approved") {
      redirect(`/custom/${teamname}/order/design-requests`);
    }
  }

  // Block direct navigation when nothing is unlocked yet.
  if (!hasApprovedDesign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-sm text-gray-600">
            <a href={`/custom/${teamname}`} className="hover:text-gray-900">
              {team.name}
            </a>
            {" / "}
            <span className="text-gray-900 font-semibold">Products & Pricing</span>
          </div>

          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Products Locked
            </h1>
            <p className="text-gray-600 mb-6">
              You can select products once your team has an approved design.
              Submit a design request and our team will review it. The product
              catalog unlocks automatically after approval.
            </p>
            <Link
              href={`/custom/${teamname}/order/design-requests`}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Go to Design Requests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8 text-sm text-gray-600">
          <a href={`/custom/${teamname}`} className="hover:text-gray-900">
            {team.name}
          </a>
          {" / "}
          <a href={`/custom/${teamname}/order`} className="hover:text-gray-900">
            Order
          </a>
          {" / "}
          <span className="text-gray-900 font-semibold">Products & Pricing</span>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Step 2: Select Products & Pricing
          </h1>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center flex-1">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-bold">
                  ✓
                </div>
                <span className="ml-3 text-gray-600">Design Request</span>
              </div>
              <div className="flex-1 h-1 bg-gray-300 mx-4" />
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold">
                  2
                </div>
                <span className="ml-3 text-gray-900 font-semibold">
                  Products & Pricing
                </span>
              </div>
              <div className="flex-1 h-1 bg-gray-300 mx-4" />
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-600 rounded-full font-bold">
                  3
                </div>
                <span className="ml-3 text-gray-600">Payment & Review</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <ProductSelectionForm teamName={teamname} designRequestId={designRequestId} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                How Pricing Works
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Prices adjust based on quantity</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Larger orders get better rates</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Special pricing may apply to your team</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Displayed in USD and CRC</span>
                </li>
              </ul>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Payment Process
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <div>
                    <p className="font-semibold">50% Deposit</p>
                    <p className="text-gray-500">Due upfront</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <div>
                    <p className="font-semibold">Order Processing</p>
                    <p className="text-gray-500">Your items are created</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <div>
                    <p className="font-semibold">Final Payment + Shipping</p>
                    <p className="text-gray-500">Pay remaining balance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h4 className="font-bold text-amber-900 mb-3">💡 Pro Tips</h4>
              <ul className="text-xs text-amber-800 space-y-2">
                <li>• Order in bulk to save per-unit cost</li>
                <li>• Ask admin about volume discounts</li>
                <li>• Multiple products can be ordered together</li>
                <li>• Exchange rate is updated daily</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
