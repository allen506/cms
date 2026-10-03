import DesignRequestDetail from "@/components/DesignRequestDetail";

export default async function DesignRequestDetailPage({
  params,
}: {
  params: Promise<{ teamname: string; id: string }>;
}) {
  const { teamname, id } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8 text-sm text-gray-600">
          <a href={`/custom/${teamname}`} className="hover:text-gray-900">
            {teamname.toUpperCase()}
          </a>
          {" / "}
          <a
            href={`/custom/${teamname}/order/design-requests`}
            className="hover:text-gray-900"
          >
            Design Requests
          </a>
          {" / "}
          <span className="text-gray-900 font-semibold">Details</span>
        </div>

        {/* Main Content */}
        <DesignRequestDetail requestId={id} teamName={teamname} />
      </div>
    </div>
  );
}
