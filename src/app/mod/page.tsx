import { auth } from "@/lib/session";
import { Btn, PageTitle, Sheet, Typed } from "@/components/dossier";
import { isStaff } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { ModDesk } from "./mod-desk";

/** The moderation desk. Visible to moderators and admins, not to readers. */
export default async function ModPage() {
  const session = await auth();
  const role = session?.user?.role ?? "user";

  if (!session?.user) {
    return (
      <div className="pb-10">
        <PageTitle title="Moderation" />
        <div className="max-w-[560px]">
          <Sheet className="flex flex-col items-start gap-4 p-5">
            <Typed className="text-md">Sign in to open the moderation desk.</Typed>
            <Btn variant="primary" href="/auth/signin">Sign in</Btn>
          </Sheet>
        </div>
      </div>
    );
  }

  if (!isStaff(role)) {
    return (
      <div className="pb-10">
        <PageTitle title="Moderation" />
        <div className="max-w-[560px]">
          <Sheet className="flex flex-col items-start gap-4 p-5">
            <Typed className="text-md">
              This desk is for moderators. Ask one if something needs looking at.
            </Typed>
          </Sheet>
        </div>
      </div>
    );
  }

  const pendingCount = await prisma.moderationItem.count({ where: { status: "pending" } });
  return <ModDesk pendingCount={pendingCount} />;
}
