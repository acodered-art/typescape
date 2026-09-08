import crypto from "crypto";

/**
 * Pure API-key helpers, kept free of Prisma/Redis imports so they are unit
 * testable without a database. `src/lib/api-auth.ts` re-exports these and adds
 * the request-time verification.
 */

const PREFIX = "ts_live_";

export { PREFIX };

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * A fresh key plus the row data needed to store it. Only the hash is persisted;
 * the plaintext is returned to the caller once.
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const secret = crypto.randomBytes(24).toString("base64url");
  const key = `${PREFIX}${secret}`;
  return { key, hash: hashKey(key), prefix: key.slice(0, 16) };
}
