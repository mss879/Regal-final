import "server-only";
import { createHash } from "node:crypto";

/** The visitor's IP from the hosting proxy's headers (Vercel/Cloudflare/standard). */
export function clientIp(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? forwarded ?? null;
}

/**
 * One-way, salted key for rate limiting and unique-visitor counts. Raw IPs are never stored;
 * without the secret salt the hash can't be reversed or matched to anyone.
 */
export function hashKey(salt: string, ...parts: string[]): string {
  return createHash("sha256").update([salt, ...parts].join("|")).digest("hex").slice(0, 32);
}
