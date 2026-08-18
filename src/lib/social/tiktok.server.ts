import type {
  AccountInfo,
  OAuthTokens,
  PublishResult,
  PublishStatus,
  PublishVideoInput,
  SocialPlatformAdapter,
} from "./adapter";
import { IntegrationNotConfiguredError, PlatformError } from "./adapter";

const API = "https://open.tiktokapis.com/v2";

/** TikTok Content Posting API (Direct Post). Official endpoints only. */
export class TikTokAdapter implements SocialPlatformAdapter {
  readonly platform = "tiktok" as const;
  readonly requiredConfig = [
    "TIKTOK_CLIENT_KEY",
    "TIKTOK_CLIENT_SECRET",
    "TIKTOK_REDIRECT_URI",
  ] as const;
  readonly requiredScopes = [
    "user.info.basic",
    "video.publish",
    "video.upload",
  ] as const;

  missingConfig(): string[] {
    return this.requiredConfig.filter((k) => !process.env[k]);
  }

  isConfigured() {
    return this.missingConfig().length === 0;
  }

  private assertConfigured() {
    const missing = this.missingConfig();
    if (missing.length) throw new IntegrationNotConfiguredError("tiktok", missing);
  }

  async getAuthorizationUrl(state: string) {
    this.assertConfigured();
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", process.env["TIKTOK_CLIENT_KEY"]!);
    url.searchParams.set("scope", this.requiredScopes.join(","));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", process.env["TIKTOK_REDIRECT_URI"]!);
    url.searchParams.set("state", state);
    return url.toString();
  }

  async handleOAuthCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    this.assertConfigured();
    const res = await fetch(`${API}/oauth/token/`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env["TIKTOK_CLIENT_KEY"]!,
        client_secret: process.env["TIKTOK_CLIENT_SECRET"]!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new PlatformError(
        "tiktok_oauth_failed",
        "TikTok could not complete the connection. Please try connecting again.",
        false,
        JSON.stringify(json),
      );
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
      scopes: json.scope ? json.scope.split(",") : [...this.requiredScopes],
    };
  }

  async refreshTokenIfNeeded(tokens: OAuthTokens): Promise<OAuthTokens> {
    this.assertConfigured();
    if (
      !tokens.refreshToken ||
      (tokens.expiresAt && new Date(tokens.expiresAt).getTime() - Date.now() > 300_000)
    ) {
      return tokens;
    }
    const res = await fetch(`${API}/oauth/token/`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env["TIKTOK_CLIENT_KEY"]!,
        client_secret: process.env["TIKTOK_CLIENT_SECRET"]!,
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!res.ok || !json.access_token) {
      throw new PlatformError(
        "tiktok_token_expired",
        "Your TikTok connection has expired. Please reconnect your TikTok account.",
        true,
        JSON.stringify(json),
      );
    }
    return {
      ...tokens,
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? tokens.refreshToken,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
    };
  }

  async getAccountInfo(tokens: OAuthTokens): Promise<AccountInfo> {
    this.assertConfigured();
    const res = await fetch(
      `${API}/user/info/?fields=open_id,display_name,avatar_url,username`,
      { headers: { authorization: `Bearer ${tokens.accessToken}` } },
    );
    const json = (await res.json()) as {
      data?: {
        user?: {
          open_id: string;
          display_name?: string;
          avatar_url?: string;
          username?: string;
        };
      };
    };
    const user = json.data?.user;
    if (!res.ok || !user) {
      throw new PlatformError(
        "tiktok_account_unavailable",
        "TikTok account information could not be loaded. Reconnect the account and try again.",
        false,
        JSON.stringify(json),
      );
    }
    return {
      externalAccountId: user.open_id,
      username: user.username ?? user.display_name ?? "tiktok",
      displayName: user.display_name ?? null,
      avatarUrl: user.avatar_url ?? null,
      accountType: null,
    };
  }

  /** Creator info must be queried before Direct Post, per TikTok's rules. */
  async getCreatorInfo(tokens: OAuthTokens) {
    this.assertConfigured();
    const res = await fetch(`${API}/post/publish/creator_info/query/`, {
      method: "POST",
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    });
    const json = (await res.json()) as {
      data?: Record<string, unknown>;
      error?: { code?: string };
    };
    if (!res.ok || json.error?.code !== "ok") {
      throw new PlatformError(
        "tiktok_publish_not_available",
        "TikTok publishing permission is not available for this connection. Reconnect the account or verify that your TikTok app has the required publishing permission.",
        true,
        JSON.stringify(json),
      );
    }
    return json.data ?? {};
  }

  async publishVideo(tokens: OAuthTokens, input: PublishVideoInput): Promise<PublishResult> {
    this.assertConfigured();
    await this.getCreatorInfo(tokens);
    const settings = (input.settings ?? {}) as Record<string, unknown>;
    const res = await fetch(`${API}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokens.accessToken}`,
        "content-type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: [input.caption, input.hashtags?.join(" ")].filter(Boolean).join(" "),
          privacy_level: settings["privacy_level"] ?? "SELF_ONLY",
          disable_comment: settings["disable_comment"] ?? false,
          disable_duet: settings["disable_duet"] ?? false,
          disable_stitch: settings["disable_stitch"] ?? false,
        },
        source_info: { source: "PULL_FROM_URL", video_url: input.videoUrl },
      }),
    });
    const json = (await res.json()) as {
      data?: { publish_id?: string };
      error?: { code?: string; message?: string };
    };
    if (!res.ok || !json.data?.publish_id) {
      throw new PlatformError(
        json.error?.code ?? "tiktok_publish_failed",
        "TikTok could not start publishing this video. Check your TikTok app permissions and try again.",
        false,
        JSON.stringify(json),
      );
    }
    return { externalPostId: json.data.publish_id, externalUrl: null, pending: true };
  }

  async getPublishStatus(tokens: OAuthTokens, externalId: string): Promise<PublishStatus> {
    this.assertConfigured();
    const res = await fetch(`${API}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokens.accessToken}`,
        "content-type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: externalId }),
    });
    const json = (await res.json()) as { data?: { status?: string } };
    const status = json.data?.status;
    if (status === "PUBLISH_COMPLETE") return "published";
    if (status === "FAILED") return "failed";
    return "processing";
  }
}
