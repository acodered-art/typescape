/**
 * Dev helper: create one signed-in account per role for exercising the
 * moderation surface. Prints credentials.
 *
 *   npx tsx scripts/seed-staff.mts --yes-really
 *
 * Refuses without the confirmation flag and refuses a database that looks live:
 * it creates working logins with a known password, which is the last thing you
 * want on a production site.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const PASSWORD = "probe-password-123";
const ACCOUNTS = [
  { username: "probe_admin", role: "admin" },
  { username: "probe_mod", role: "moderator" },
  { username: "probe_user", role: "user" },
];

if (!process.argv.includes("--yes-really")) {
  console.error(
    "This creates real accounts (password below) on the configured database.\n" +
      "Re-run with --yes-really if you are sure that is what you want.\n" +
      `Password that would be set: ${PASSWORD}`
  );
  process.exit(1);
}

const existing = await prisma.user.count();
if (existing > 50 && !process.argv.includes("--force")) {
  console.error(
    `Refusing: this database already has ${existing} users, which looks like a live site.\n` +
      "Pass --force only if you are certain."
  );
  process.exit(1);
}

for (const a of ACCOUNTS) {
  await prisma.user.deleteMany({ where: { username: a.username } });
  await prisma.user.create({
    data: {
      username: a.username,
      email: `${a.username}@example.test`,
      passwordHash: await bcrypt.hash(PASSWORD, 12),
      role: a.role,
    },
  });
  console.log(`${a.role.padEnd(10)} ${a.username} / ${PASSWORD}`);
}

console.log("\nRemember to delete these before going live.");
await prisma.$disconnect();
