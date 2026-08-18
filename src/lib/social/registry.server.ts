import type { Platform } from "@/types";
import type { SocialPlatformAdapter } from "./adapter";
import { InstagramAdapter } from "./instagram.server";
import { TikTokAdapter } from "./tiktok.server";
import { YouTubeAdapter } from "./youtube.server";

const adapters = {
  instagram: new InstagramAdapter(),
  tiktok: new TikTokAdapter(),
  youtube: new YouTubeAdapter(),
} satisfies Record<Platform, SocialPlatformAdapter>;

export function getAdapter(platform: Platform): SocialPlatformAdapter {
  return adapters[platform];
}

export function missingConfigFor(platform: Platform): string[] {
  return adapters[platform].requiredConfig.filter((key) => !process.env[key]);
}

export function allAdapters() {
  return Object.values(adapters);
}
