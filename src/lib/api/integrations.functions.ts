import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { IntegrationStatus, Platform } from "@/types";
import { PLATFORMS } from "@/types";

/** Reads connection state. Tokens never leave the server. */
export const getIntegrationStatuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationStatus[]> => {
    const { getAdapter } = await import("@/lib/social/registry.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: accounts } = await supabaseAdmin
      .from("social_accounts")
      .select(
        "platform, username, display_name, avatar_url, status, token_expires_at, metadata, scopes",
      )
      .eq("user_id", context.userId);

    return PLATFORMS.map((platform) => {
      const adapter = getAdapter(platform);
      const missing = adapter.requiredConfig.filter((k) => !process.env[k]);
      const account = accounts?.find((a) => a.platform === platform);
      const base = {
        platform,
        missingConfig: missing,
        requiredScopes: [...adapter.requiredScopes],
      };

      if (missing.length) {
        return {
          ...base,
          state: "configuration_required" as const,
          message:
            platform === "instagram"
              ? "Instagram integration requires Meta API configuration."
              : platform === "tiktok"
                ? "TikTok integration requires TikTok developer app configuration."
                : "YouTube integration requires Google API configuration.",
          account: null,
        };
      }

      if (!account || account.status === "disconnected") {
        return {
          ...base,
          state: "not_connected" as const,
          message: "Belum terhubung. Hubungkan akun untuk mulai publishing.",
          account: null,
        };
      }

      const accountInfo = {
        username: account.username,
        displayName: account.display_name,
        avatarUrl: account.avatar_url,
        accountType:
          ((account.metadata as Record<string, unknown>)?.["account_type"] as string) ?? null,
        expiresAt: account.token_expires_at,
      };

      if (account.status === "expired") {
        return {
          ...base,
          state: "expired" as const,
          message: "Koneksi kedaluwarsa. Hubungkan ulang akun ini.",
          account: accountInfo,
        };
      }
      if (account.status === "error") {
        return {
          ...base,
          state: "error" as const,
          message: "Koneksi bermasalah. Coba hubungkan ulang akun ini.",
          account: accountInfo,
        };
      }
      if (platform === "tiktok" && !(account.scopes ?? []).includes("video.publish")) {
        return {
          ...base,
          state: "publishing_restricted" as const,
          message:
            "TikTok publishing permission is not available for this connection. Reconnect the account or verify that your TikTok app has the required publishing permission.",
          account: accountInfo,
        };
      }
      return {
        ...base,
        state: "connected" as const,
        message: "Siap untuk publishing.",
        account: accountInfo,
      };
    });
  });

/** Returns the platform authorization URL, or an explicit configuration error. */
export const startConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { platform: Platform }) => d)
  .handler(async ({ data, context }) => {
    const { getAdapter } = await import("@/lib/social/registry.server");
    const { signOAuthState } = await import("@/lib/oauth-state.server");
    const adapter = getAdapter(data.platform);
    const missing = adapter.requiredConfig.filter((k) => !process.env[k]);
    if (missing.length) {
      return { ok: false as const, missingConfig: missing };
    }
    const state = signOAuthState(context.userId, data.platform);
    return { ok: true as const, url: await adapter.getAuthorizationUrl(state) };
  });

export const disconnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { platform: Platform }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logActivity } = await import("@/lib/publishing/service.server");
    await supabaseAdmin
      .from("social_accounts")
      .update({
        status: "disconnected",
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        token_expires_at: null,
      })
      .eq("user_id", context.userId)
      .eq("platform", data.platform);
    await logActivity({
      userId: context.userId,
      eventType: "account_disconnected",
      platform: data.platform,
      message: `Akun ${data.platform} diputus`,
      level: "info",
    });
    return { ok: true };
  });
