import NewDesignRequestForm from "@/components/NewDesignRequestForm";

interface Props {
  params: Promise<{ teamname: string }>;
}

export default async function NewDesignRequestPage({ params }: Props) {
  const { teamname } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <NewDesignRequestForm teamname={teamname} />
      </div>
    </div>
  );
}
