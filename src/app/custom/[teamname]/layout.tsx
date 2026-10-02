import TeamPortalNav from "@/components/TeamPortalNav";

interface Props {
  children: React.ReactNode;
  params: Promise<{ teamname: string }>;
}

export default async function CustomTeamLayout({ children, params }: Props) {
  // Await params to properly handle dynamic route
  await params;
  
  return (
    <>
      <TeamPortalNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </>
  );
}
