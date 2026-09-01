import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminDashboard from "./admin-client";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <h1 className="text-xl font-bold text-[#e8ecf4]">Admin Panel</h1>
        <p className="text-sm text-[#7888a0]">
          {session?.user
            ? "You don't have admin access. Contact the site administrator."
            : "Sign in with an admin account to access the admin panel."}
        </p>
        {!session?.user && (
          <a
            href="/auth/signin"
            className="inline-block px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 transition-colors"
          >
            Sign in
          </a>
        )}
      </div>
    );
  }

  return <AdminDashboard />;
}