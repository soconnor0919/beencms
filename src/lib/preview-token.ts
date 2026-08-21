import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "~/env";

export function createPreviewToken(subject: string, expiresAt = Date.now() + 24 * 60 * 60 * 1000) {
  const payload = Buffer.from(JSON.stringify({ subject, expiresAt })).toString("base64url");
  const signature = createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPreviewToken(token: string | undefined, subject: string) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try { const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as { subject: string; expiresAt: number }; return value.subject === subject && value.expiresAt > Date.now(); } catch { return false; }
}
