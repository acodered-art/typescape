/** Dev helper: create/refresh a throwaway user for API smoke tests. */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const username = process.argv[2] ?? "apitokenprobe";
const password = process.argv[3] ?? "probe-password-123";

await prisma.user.deleteMany({ where: { username } });
await prisma.user.create({
  data: {
    username,
    email: `${username}@example.test`,
    passwordHash: await bcrypt.hash(password, 12),
  },
});
console.log(`USER=${username}`);
console.log(`PASS=${password}`);
await prisma.$disconnect();
