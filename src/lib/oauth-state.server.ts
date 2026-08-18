import { createHmac, timingSafeEqual } from "crypto";
import type { Platform } from "@/types";

/**
 * CSRF-safe OAuth state: signed server-side, short lived, bound to the user
 * and platform. Nothing sensitive is placed in the URL.
 */
function secret() {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["OAUTH_STATE_SECRET"];
  if (!key) throw new Error("OAuth state secret is not configured");
  return key;
}

export function signOAuthState(userId: string, platform: Platform) {
  const payload = JSON.stringify({ u: userId, p: platform, t: Date.now() });
  const body = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string): { userId: string; platform: Platform } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      u: string;
      p: Platform;
      t: number;
    };
    if (Date.now() - parsed.t > 10 * 60 * 1000) return null;
    return { userId: parsed.u, platform: parsed.p };
  } catch {
    return null;
  }
}
