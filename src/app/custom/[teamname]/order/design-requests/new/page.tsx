import NewDesignRequestForm from "@/components/NewDesignRequestForm";

interface Props {
  params: Promise<{ teamname: string }>;
}

export default async function NewDesignRequestPage({ params }: Props) {
  const { teamname } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-12 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Submit Design Request</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Provide details about your custom design project
          </p>
        </div>
        <NewDesignRequestForm teamname={teamname} />
      </div>
    </div>
  );
}
