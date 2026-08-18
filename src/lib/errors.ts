/** Maps technical error codes to creator-friendly messages. Never show raw API errors. */
const MESSAGES: Record<string, string> = {
  AI_RATE_LIMIT: "Terlalu banyak permintaan AI. Tunggu sebentar lalu coba lagi.",
  AI_CREDITS_REQUIRED: "AI credits habis. Tambahkan credits untuk melanjutkan.",
  youtube_reconnect_required:
    "YouTube connection has expired. Please reconnect your YouTube account.",
  instagram_token_expired:
    "Your Instagram connection has expired. Please reconnect your Instagram account.",
  tiktok_token_expired: "Your TikTok connection has expired. Please reconnect your TikTok account.",
  tiktok_publish_not_available:
    "TikTok publishing permission is not available for this connection. Reconnect the account or verify that your TikTok app has the required publishing permission.",
};

export function friendlyError(code: string | null | undefined, fallback?: string) {
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (code?.startsWith("AI_REQUEST_FAILED")) {
    return "AI sedang tidak bisa dihubungi. Coba lagi sebentar lagi.";
  }
  return fallback ?? "Terjadi kesalahan. Coba lagi.";
}
