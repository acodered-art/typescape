import { CreateProfileForm } from "@/components/create-profile-form";

export default async function CreateProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#e8ecf4]">Create Profile</h1>
      <p className="text-sm text-[#7888a0]">
        Add a character, celebrity, or public figure to the database.
      </p>
      <CreateProfileForm initialName={sp.name} />
    </div>
  );
}