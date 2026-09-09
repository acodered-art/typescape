/** Dev helper: mint an API key for a user, for smoke testing. */
import { prisma } from "../src/lib/db";
import { generateApiKey } from "../src/lib/api-key";

const username = process.argv[2] ?? "Episteme";
const scopes = (process.argv[3] ?? "read,write").split(",");
const u = await prisma.user.findUnique({ where: { username }, select: { id: true } });
if (!u) throw new Error(`no user ${username}`);
const { key, hash, prefix } = generateApiKey();
await prisma.apiKey.create({
  data: { userId: u.id, name: "smoke", keyHash: hash, prefix, scopes, rateLimit: 5000 },
});
console.log(`KEY=${key}`);
await prisma.$disconnect();
