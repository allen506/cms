import { redirect } from "next/navigation";
import { Metadata } from "next";
import CampaignManager from "@/components/CampaignManager";
import { queryOne } from "@/lib/db-async";

export const metadata: Metadata = {
  title: "CMS Sportswear - Team Campaign",
};

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ teamname: string }>;
}) {
  const { teamname } = await params;

  const team = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM tenants WHERE slug = ?",
    [teamname.toLowerCase()]
  );

  if (!team) {
    redirect("/custom");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-sm text-gray-600">
          <a href={`/custom/${teamname}`} className="hover:text-gray-900">
            {team.name}
          </a>
          {" / "}
          <span className="text-gray-900 font-semibold">Team Campaign</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Team Order Campaign
        </h1>

        <CampaignManager teamName={teamname} />
      </div>
    </div>
  );
}
