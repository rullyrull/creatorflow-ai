export type Platform = "instagram" | "tiktok" | "youtube";

export const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube"];

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export type JobStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "uploading"
  | "processing"
  | "published"
  | "failed"
  | "cancelled";

export type ContentStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

export type IntegrationState =
  | "configuration_required"
  | "not_connected"
  | "connected"
  | "expired"
  | "error"
  | "publishing_restricted";

export interface IntegrationStatus {
  platform: Platform;
  state: IntegrationState;
  /** Human readable, creator-friendly explanation. Never a raw API error. */
  message: string;
  /** Which server-side environment variables are still missing. Names only, never values. */
  missingConfig: string[];
  requiredScopes: string[];
  account: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    accountType: string | null;
    expiresAt: string | null;
  } | null;
}

/** Result of an AI content generation, one block per platform. */
export interface GeneratedContent {
  instagram: { caption: string; cta: string; hashtags: string[] };
  tiktok: { caption: string; cta: string; hashtags: string[] };
  youtube: { title: string; description: string; tags: string[] };
}

export const TONES = [
  "casual",
  "educational",
  "funny",
  "professional",
  "storytelling",
  "motivational",
  "provocative",
  "friendly",
] as const;

export const OBJECTIVES = [
  "reach",
  "engagement",
  "followers",
  "education",
  "sales",
  "brand awareness",
] as const;

export const BRAND_LANGUAGES = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "id-en", label: "Campuran Indonesia + Inggris" },
  { value: "en", label: "Bahasa Inggris" },
  { value: "jv", label: "Bahasa Jawa" },
  { value: "ms", label: "Bahasa Melayu" },
] as const;

export const FORMALITY_LEVELS = [
  { value: "santai", label: "Santai (aku/kamu)" },
  { value: "netral", label: "Netral" },
  { value: "formal", label: "Formal (saya/Anda)" },
] as const;

export const EMOJI_USAGE = [
  { value: "tanpa", label: "Tanpa emoji" },
  { value: "sedikit", label: "Sedikit (1-2)" },
  { value: "sedang", label: "Sedang (3-5)" },
  { value: "banyak", label: "Banyak / ekspresif" },
] as const;

export const TONE_LABEL: Record<string, string> = {
  casual: "Santai",
  educational: "Edukatif",
  funny: "Lucu",
  professional: "Profesional",
  storytelling: "Bercerita",
  motivational: "Motivasional",
  provocative: "Provokatif",
  friendly: "Ramah",
};

export const OBJECTIVE_LABEL: Record<string, string> = {
  reach: "Jangkauan",
  engagement: "Interaksi",
  followers: "Tambah follower",
  education: "Edukasi",
  sales: "Penjualan",
  "brand awareness": "Brand awareness",
};

export const PLATFORM_LIMITS = {
  instagram: { caption: 2200, hashtags: 30 },
  tiktok: { caption: 2200, hashtags: 20 },
  youtube: { title: 100, description: 5000, tags: 15 },
};

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
];

export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB
