import { PageTitle } from "@/components/dossier";
import { CreateProfileForm } from "@/components/create-profile-form";

/** "Open a new file": a character, a celebrity, or a public figure goes into the cabinet. */
export default async function CreateProfilePage({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="pb-10">
      <PageTitle title="Open a new file" aside="A character, a celebrity, or a public figure." />
      <div className="max-w-[760px]">
        <CreateProfileForm initialName={sp.name} />
      </div>
    </div>
  );
}
