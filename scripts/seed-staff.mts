/**
 * Dev helper: create one signed-in account per role for exercising the
 * moderation surface. Prints credentials; not for production.
 *
 *   npx tsx scripts/seed-staff.mts
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const PASSWORD = "probe-password-123";
const ACCOUNTS = [
  { username: "probe_admin", role: "admin" },
  { username: "probe_mod", role: "moderator" },
  { username: "probe_user", role: "user" },
];

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
await prisma.$disconnect();
