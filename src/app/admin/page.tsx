import { auth } from "@/lib/session";
import { Btn, PageTitle, Sheet, Typed } from "@/components/dossier";
import AdminDashboard from "./admin-client";

/** The admin desk. Anyone else sees a sheet saying so. */
export default async function AdminPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="pb-10">
        <PageTitle title="Admin" />
        <div className="max-w-[560px]">
          <Sheet className="flex flex-col items-start gap-4">
            <Typed className="text-[14px]">{session?.user ? "This desk is for site administrators. Ask one if you need something moderated." : "Sign in with an administrator's account to open this desk."}</Typed>
            {!session?.user && <Btn variant="primary" href="/auth/signin">Sign in</Btn>}
          </Sheet>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}
