import type {
  AccountInfo,
  OAuthTokens,
  PublishResult,
  PublishVideoInput,
  SocialPlatformAdapter,
} from "./adapter";
import { IntegrationNotConfiguredError, PlatformError } from "./adapter";

/** YouTube Data API v3 with OAuth 2.0 and resumable upload. */
export class YouTubeAdapter implements SocialPlatformAdapter {
  readonly platform = "youtube" as const;
  readonly requiredConfig = [
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REDIRECT_URI",
  ] as const;
  readonly requiredScopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
  ] as const;

  missingConfig(): string[] {
    return this.requiredConfig.filter((k) => !process.env[k]);
  }

  isConfigured() {
    return this.missingConfig().length === 0;
  }

  private assertConfigured() {
    const missing = this.missingConfig();
    if (missing.length) throw new IntegrationNotConfiguredError("youtube", missing);
  }

  async getAuthorizationUrl(state: string) {
    this.assertConfigured();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env["YOUTUBE_CLIENT_ID"]!);
    url.searchParams.set("redirect_uri", process.env["YOUTUBE_REDIRECT_URI"]!);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.requiredScopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async handleOAuthCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    this.assertConfigured();
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env["YOUTUBE_CLIENT_ID"]!,
        client_secret: process.env["YOUTUBE_CLIENT_SECRET"]!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
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
        "youtube_oauth_failed",
        "YouTube could not complete the connection. Please try connecting again.",
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
      scopes: json.scope ? json.scope.split(" ") : [...this.requiredScopes],
    };
  }

  async refreshTokenIfNeeded(tokens: OAuthTokens): Promise<OAuthTokens> {
    this.assertConfigured();
    if (tokens.expiresAt && new Date(tokens.expiresAt).getTime() - Date.now() > 300_000) {
      return tokens;
    }
    if (!tokens.refreshToken) {
      throw new PlatformError(
        "youtube_reconnect_required",
        "YouTube connection has expired. Please reconnect your YouTube account.",
        true,
      );
    }
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env["YOUTUBE_CLIENT_ID"]!,
        client_secret: process.env["YOUTUBE_CLIENT_SECRET"]!,
        refresh_token: tokens.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !json.access_token) {
      throw new PlatformError(
        "youtube_reconnect_required",
        "YouTube connection has expired. Please reconnect your YouTube account.",
        true,
        JSON.stringify(json),
      );
    }
    return {
      ...tokens,
      accessToken: json.access_token,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
    };
  }

  async getAccountInfo(tokens: OAuthTokens): Promise<AccountInfo> {
    this.assertConfigured();
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { authorization: `Bearer ${tokens.accessToken}` } },
    );
    const json = (await res.json()) as {
      items?: Array<{
        id: string;
        snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string } } };
      }>;
    };
    const channel = json.items?.[0];
    if (!res.ok || !channel) {
      throw new PlatformError(
        "youtube_no_channel",
        "No YouTube channel was found for this Google account. Create a channel and reconnect.",
        true,
        JSON.stringify(json),
      );
    }
    return {
      externalAccountId: channel.id,
      username: channel.snippet.customUrl ?? channel.snippet.title,
      displayName: channel.snippet.title,
      avatarUrl: channel.snippet.thumbnails?.default?.url ?? null,
      accountType: "channel",
    };
  }

  async publishVideo(tokens: OAuthTokens, input: PublishVideoInput): Promise<PublishResult> {
    this.assertConfigured();
    const settings = (input.settings ?? {}) as Record<string, unknown>;
    const metadata = {
      snippet: {
        title: (input.title ?? "Untitled").slice(0, 100),
        description: [input.description, input.hashtags?.join(" ")].filter(Boolean).join("\n\n"),
        tags: input.tags ?? [],
        categoryId: (settings["categoryId"] as string) ?? "22",
      },
      status: {
        privacyStatus: (settings["privacyStatus"] as string) ?? "private",
        publishAt: settings["publishAt"] ?? undefined,
        selfDeclaredMadeForKids: false,
      },
    };

    // 1. Start a resumable upload session.
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
          "content-type": "application/json",
          "x-upload-content-type": "video/*",
        },
        body: JSON.stringify(metadata),
      },
    );
    const uploadUrl = initRes.headers.get("location");
    if (!initRes.ok || !uploadUrl) {
      throw new PlatformError(
        "youtube_upload_init_failed",
        "YouTube did not accept this upload. Reconnect your YouTube account and try again.",
        false,
        await initRes.text(),
      );
    }

    // 2. Stream the stored video into the resumable session.
    const source = await fetch(input.videoUrl);
    if (!source.ok || !source.body) {
      throw new PlatformError(
        "video_source_unavailable",
        "The stored video file could not be read. Try re-uploading the video.",
        false,
      );
    }
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": source.headers.get("content-type") ?? "video/mp4" },
      body: source.body,
      // @ts-expect-error required by undici for streaming request bodies
      duplex: "half",
    });
    const uploaded = (await uploadRes.json()) as { id?: string };
    if (!uploadRes.ok || !uploaded.id) {
      throw new PlatformError(
        "youtube_upload_failed",
        "YouTube upload did not finish. You can retry this publish.",
        false,
        JSON.stringify(uploaded),
      );
    }
    return {
      externalPostId: uploaded.id,
      externalUrl: `https://www.youtube.com/watch?v=${uploaded.id}`,
      pending: false,
    };
  }
}
