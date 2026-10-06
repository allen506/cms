import { redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import OrderForm from "@/components/OrderForm";
import { queryOne } from "@/lib/db-async";
import { getCurrentTeamOrderAccess } from "@/lib/unlock";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamname: string }>;
}): Promise<Metadata> {
  const { teamname } = await params;

  const team = await queryOne<{ name: string }>(
    "SELECT name FROM tenants WHERE slug = ?",
    [teamname.toLowerCase()]
  );

  return {
    title: "CMS Sportswear - Place Order",
    description: `Place your order with ${team?.name || teamname} using CMS Sportswear`,
  };
}

export default async function ProductSelectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamname: string }>;
  searchParams: Promise<{ designRequestId?: string }>;
}) {
  const { teamname } = await params;
  const { designRequestId } = await searchParams;

  const team = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM tenants WHERE slug = ?",
    [teamname.toLowerCase()]
  );

  if (!team) {
    redirect("/custom");
  }

  const { hasApprovedDesign } = await getCurrentTeamOrderAccess(teamname);

  if (designRequestId) {
    const designRequest = await queryOne<{ status: string }>(
      "SELECT status FROM design_requests WHERE id = ?",
      [designRequestId]
    );

    if (!designRequest || designRequest.status !== "approved") {
      redirect(`/custom/${teamname}/order/design-requests`);
    }
  }

  if (!hasApprovedDesign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-sm text-gray-600">
            <Link href={`/custom/${teamname}`} className="hover:text-gray-900">
              {team.name}
            </Link>
            {" / "}
            <span className="text-gray-900 font-semibold">Place Order</span>
          </div>

          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Products Locked</h1>
            <p className="text-gray-600 mb-6">
              You can place your order once your team has an approved design. Submit a design request and our team will review it.
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href={`/custom/${teamname}`} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Team portal
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mt-3">Place Your Order</h1>
          <p className="text-gray-400 text-sm mt-1">
            Products by{" "}
            <a href="https://www.cmssportswear.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              CMS Sportswear
            </a>
          </p>
        </div>

        <OrderForm onOrderPlaced={() => {}} />
      </div>
    </div>
  );
}
