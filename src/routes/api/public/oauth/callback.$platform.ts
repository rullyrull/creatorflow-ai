import { createFileRoute } from "@tanstack/react-router";
import { PLATFORMS, type Platform } from "@/types";

/**
 * OAuth redirect target for every social platform. The signed `state` binds
 * the callback to the user that started the flow (CSRF protection); tokens are
 * exchanged and stored server-side only.
 */
export const Route = createFileRoute("/api/public/oauth/callback/$platform")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const platform = params.platform as Platform;
        const back = (status: string) =>
          Response.redirect(new URL(`/integrations?status=${status}`, request.url).toString(), 302);

        if (!PLATFORMS.includes(platform)) return back("unknown_platform");

        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (url.searchParams.get("error") || !code || !state) return back("cancelled");

        const { verifyOAuthState } = await import("@/lib/oauth-state.server");
        const verified = verifyOAuthState(state);
        if (!verified || verified.platform !== platform) return back("invalid_state");

        const { getAdapter } = await import("@/lib/social/registry.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { logActivity } = await import("@/lib/publishing/service.server");
        const adapter = getAdapter(platform);
        if (!adapter.isConfigured()) return back("configuration_required");

        const redirectUri =
          process.env[`${platform.toUpperCase()}_REDIRECT_URI`] ??
          new URL(`/api/public/oauth/callback/${platform}`, request.url).toString();

        try {
          const tokens = await adapter.handleOAuthCallback(code, redirectUri);
          const info = await adapter.getAccountInfo(tokens);
          await supabaseAdmin.from("social_accounts").upsert(
            {
              user_id: verified.userId,
              platform,
              external_account_id: info.externalAccountId,
              username: info.username,
              display_name: info.displayName,
              avatar_url: info.avatarUrl,
              access_token_encrypted: tokens.accessToken,
              refresh_token_encrypted: tokens.refreshToken,
              token_expires_at: tokens.expiresAt,
              scopes: tokens.scopes,
              status: "connected",
              metadata: { account_type: info.accountType },
            },
            { onConflict: "user_id,platform" },
          );
          await logActivity({
            userId: verified.userId,
            eventType: "account_connected",
            platform,
            message: `Akun ${platform} terhubung (@${info.username})`,
            level: "success",
          });
          return back("connected");
        } catch (error) {
          console.error("oauth_callback_failed", platform, error);
          return back("connect_failed");
        }
      },
    },
  },
});
