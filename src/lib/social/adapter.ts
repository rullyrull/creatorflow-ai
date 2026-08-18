import type { Platform } from "@/types";

/**
 * Platform-agnostic contract. The rest of the application only ever talks to
 * this interface — never to a platform SDK or endpoint directly.
 */
export interface AccountInfo {
  externalAccountId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  accountType: string | null;
}

export interface PublishVideoInput {
  videoUrl: string;
  title?: string | undefined;
  caption?: string | undefined;
  description?: string | undefined;
  hashtags?: string[] | undefined;
  tags?: string[] | undefined;
  settings?: Record<string, unknown> | undefined;
  idempotencyKey: string;
}

export interface PublishResult {
  externalPostId: string;
  externalUrl: string | null;
  /** true when the platform is still processing and status must be polled */
  pending: boolean;
}

export type PublishStatus = "processing" | "published" | "failed";

export interface SocialPlatformAdapter {
  readonly platform: Platform;
  /** Server-side env vars required before this integration can be used. */
  readonly requiredConfig: readonly string[];
  readonly requiredScopes: readonly string[];
  isConfigured(): boolean;
  getAuthorizationUrl(state: string): Promise<string>;
  handleOAuthCallback(code: string, redirectUri: string): Promise<OAuthTokens>;
  refreshTokenIfNeeded(tokens: OAuthTokens): Promise<OAuthTokens>;
  getAccountInfo(tokens: OAuthTokens): Promise<AccountInfo>;
  publishVideo(tokens: OAuthTokens, input: PublishVideoInput): Promise<PublishResult>;
  getPublishStatus?(tokens: OAuthTokens, externalId: string): Promise<PublishStatus>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string[];
}

/** Thrown when an integration cannot run because credentials are missing. */
export class IntegrationNotConfiguredError extends Error {
  constructor(
    public platform: Platform,
    public missing: string[],
  ) {
    super(`${platform} integration requires configuration`);
    this.name = "IntegrationNotConfiguredError";
  }
}

/** Thrown for platform errors that must be surfaced in creator-friendly words. */
export class PlatformError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public permanent = false,
    public technical?: string,
  ) {
    super(userMessage);
    this.name = "PlatformError";
  }
}
