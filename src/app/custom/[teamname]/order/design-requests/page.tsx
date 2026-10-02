import Link from "next/link";
import { cookies } from "next/headers";
import DesignRequestsHeader from "@/components/DesignRequestsHeader";
import DesignRequestsList from "@/components/DesignRequestsList";

interface Props {
  params: Promise<{ teamname: string }>;
}

export default async function DesignRequestsPage({ params }: Props) {
  const { teamname } = await params;
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('tenant_user_id');
  const userId = userIdCookie?.value || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8 text-sm text-gray-600">
          <Link href={`/custom/${teamname}`} className="hover:text-gray-900">
            {teamname}
          </Link>
          {" / "}
          <span className="text-gray-900 font-semibold">Design Requests</span>
        </div>

        {/* Header with Captain Button */}
        <DesignRequestsHeader teamname={teamname} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
          <div className="lg:col-span-3">
            <DesignRequestsList teamName={teamname} userId={userId} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                How It Works
              </h3>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Submit your design requirements</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Our designers create proposals</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Review and provide feedback</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Approve your favorite design</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">5.</span>
                  <span>Select products and order</span>
                </li>
              </ol>
            </div>

            {/* Status Guide */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Request Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Pending</span> - Awaiting
                    designer review
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">In Design</span> - Designers
                    working
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Approved</span> - Ready to
                    order
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Rejected</span> - Requesting
                    changes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

