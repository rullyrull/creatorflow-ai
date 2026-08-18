import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Platform } from "@/types";

/**
 * Generates platform-specific metadata. Prompt templates and the AI key stay
 * server-side. Output is validated before it is saved.
 */
export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contentId: string; only?: Platform }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getAiProvider } = await import("@/lib/ai/provider.server");
    const { buildGenerationMessages, PROMPT_VERSION } = await import("@/lib/ai/prompts.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logActivity, notify } = await import("@/lib/publishing/service.server");

    // Rate limit: max 20 generations per hour per creator.
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabaseAdmin
      .from("ai_generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 20) {
      return { ok: false as const, error: "Batas generate AI per jam tercapai. Coba lagi nanti." };
    }

    const { data: content } = await supabase
      .from("content")
      .select("*")
      .eq("id", data.contentId)
      .single();
    if (!content) return { ok: false as const, error: "Konten tidak ditemukan." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("ai_provider, ai_model, default_language, default_tone")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: brand } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const provider = getAiProvider(profile?.ai_provider ?? null);
    if (!provider.isConfigured()) {
      return { ok: false as const, error: "AI provider belum dikonfigurasi." };
    }
    const model = profile?.ai_model || "google/gemini-3.5-flash";

    const messages = buildGenerationMessages(
      {
        aboutMe: brand?.about_me ?? null,
        niche: brand?.niche ?? null,
        audience: brand?.audience ?? null,
        writingStyle: brand?.writing_style ?? null,
        wordsToAvoid: brand?.words_to_avoid ?? null,
        favoriteCta: brand?.favorite_cta ?? null,
        contentPillars: brand?.content_pillars ?? [],
        defaultTone: brand?.default_tone ?? null,
        language: brand?.default_language ?? null,
        styleRules: brand?.style_rules ?? null,
        emojiUsage: brand?.emoji_usage ?? null,
        hashtagStyle: brand?.hashtag_style ?? null,
        formality: brand?.formality ?? null,
      },
      {
        title: content.title,
        topic: content.topic,
        targetAudience: content.target_audience,
        tone: content.tone ?? brand?.default_tone ?? profile?.default_tone ?? null,
        objective: content.objective,
        additionalInstructions: content.additional_instructions,
        language: brand?.default_language ?? profile?.default_language ?? "id",
      },
      data.only,
    );

    let parsed: Record<string, unknown> | null = null;
    let raw = "";
    let tokens: number | null = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        const result = await provider.complete(messages, model);
        raw = result.text;
        tokens = result.tokensUsed;
        parsed = safeParse(raw);
      } catch (error) {
        const { friendlyError } = await import("@/lib/errors");
        if (attempt === 1) {
          return { ok: false as const, error: friendlyError(String((error as Error).message)) };
        }
      }
    }
    if (!parsed) return { ok: false as const, error: "AI mengembalikan format tidak valid." };

    const platforms: Platform[] = data.only ? [data.only] : ["instagram", "tiktok", "youtube"];
    for (const platform of platforms) {
      const block = parsed[platform] as Record<string, unknown> | undefined;
      if (!block) continue;
      const row = {
        content_id: data.contentId,
        user_id: userId,
        platform,
        title: platform === "youtube" ? str(block["title"]).slice(0, 100) : null,
        caption: platform === "youtube" ? null : str(block["caption"]),
        description: platform === "youtube" ? str(block["description"]) : null,
        hashtags: arr(block["hashtags"]),
        tags: platform === "youtube" ? arr(block["tags"]) : [],
        cta: platform === "youtube" ? null : str(block["cta"]),
        ai_generated: true,
        edited_by_user: false,
      };
      await supabase.from("content_variants").upsert(row, { onConflict: "content_id,platform" });
    }

    await supabaseAdmin.from("ai_generations").insert({
      user_id: userId,
      content_id: data.contentId,
      provider: provider.name,
      model,
      prompt_version: PROMPT_VERSION,
      input: { only: data.only ?? "all" },
      output: parsed as never,
      tokens_used: tokens,
    });
    await logActivity({
      userId,
      eventType: "ai_generated",
      contentId: data.contentId,
      message: data.only
        ? `AI generate ulang bagian ${data.only}`
        : "AI menyiapkan metadata semua platform",
      level: "success",
    });
    await notify({
      userId,
      title: "AI selesai menyiapkan konten",
      body: data.only ? `Bagian ${data.only} diperbarui.` : "Semua platform siap direview.",
      link: `/content/${data.contentId}`,
      level: "success",
    });

    return { ok: true as const };
  });

function safeParse(text: string): Record<string, unknown> | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const value = JSON.parse(cleaned) as unknown;
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function str(v: unknown) {
  return typeof v === "string" ? v : "";
}
function arr(v: unknown) {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 30) : [];
}
