export const PROMPT_VERSION = "content_generation_v2";

export interface BrandContext {
  aboutMe?: string | null;
  niche?: string | null;
  audience?: string | null;
  writingStyle?: string | null;
  wordsToAvoid?: string | null;
  favoriteCta?: string | null;
  contentPillars?: string[] | null;
  defaultTone?: string | null;
  language?: string | null;
  styleRules?: string | null;
  emojiUsage?: string | null;
  hashtagStyle?: string | null;
  formality?: string | null;
}

export interface ContentContext {
  title?: string | null;
  topic?: string | null;
  targetAudience?: string | null;
  tone?: string | null;
  objective?: string | null;
  additionalInstructions?: string | null;
  language?: string;
}

const LANGUAGE_LABEL: Record<string, string> = {
  id: "Bahasa Indonesia",
  en: "Bahasa Inggris",
  "id-en": "campuran Bahasa Indonesia dengan istilah Inggris yang umum dipakai creator",
  jv: "Bahasa Jawa",
  ms: "Bahasa Melayu",
};

function systemPrompt(language: string) {
  const langLabel = LANGUAGE_LABEL[language] ?? language;
  return `Kamu adalah asisten konten untuk seorang content creator.
Tugasmu menulis metadata siap posting untuk Instagram Reels, TikTok, dan YouTube Shorts.

Aturan menulis:
- Tulis dalam ${langLabel} yang natural, seperti manusia, bukan robot.
- Ikuti tone, tingkat keformalan, dan aturan gaya brand yang diberikan. Aturan brand mengalahkan preferensi umum.
- Hook kuat tapi tetap masuk akal. Dilarang clickbait menyesatkan.
- Jangan mengarang fakta, angka, testimoni, atau klaim yang tidak diberikan.
- Paragraf pendek dan mudah dibaca.
- Hashtag secukupnya dan relevan. Dilarang hashtag spam atau generik berlebihan.
- Sesuaikan format tiap platform. Jangan menyalin caption yang sama ke semua platform.
- Judul YouTube maksimal 100 karakter.
- Balas HANYA dengan JSON valid, tanpa markdown, tanpa penjelasan.`;
}

function brandBlock(brand: BrandContext) {
  const lines = [
    brand.aboutMe && `Tentang creator: ${brand.aboutMe}`,
    brand.niche && `Niche: ${brand.niche}`,
    brand.audience && `Audiens: ${brand.audience}`,
    brand.defaultTone && `Tone default brand: ${brand.defaultTone}`,
    brand.formality && `Tingkat keformalan: ${brand.formality}`,
    brand.writingStyle && `Gaya menulis: ${brand.writingStyle}`,
    brand.styleRules && `Aturan gaya wajib:\n${brand.styleRules}`,
    brand.emojiUsage && `Penggunaan emoji: ${brand.emojiUsage}`,
    brand.hashtagStyle && `Gaya hashtag: ${brand.hashtagStyle}`,
    brand.wordsToAvoid && `Hindari: ${brand.wordsToAvoid}`,
    brand.favoriteCta && `CTA favorit: ${brand.favoriteCta}`,
    brand.contentPillars?.length && `Pilar konten: ${brand.contentPillars.join(", ")}`,
  ].filter(Boolean);
  return lines.length ? `Brand voice creator:\n${lines.join("\n")}` : "Brand voice belum diisi.";
}

function contentBlock(content: ContentContext) {
  return [
    content.title && `Judul kerja: ${content.title}`,
    content.topic && `Topik: ${content.topic}`,
    content.targetAudience && `Target audiens: ${content.targetAudience}`,
    content.tone && `Tone: ${content.tone}`,
    content.objective && `Tujuan utama: ${content.objective}`,
    content.additionalInstructions && `Instruksi tambahan: ${content.additionalInstructions}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const FULL_SCHEMA = `{
  "instagram": { "caption": string, "cta": string, "hashtags": string[] },
  "tiktok": { "caption": string, "cta": string, "hashtags": string[] },
  "youtube": { "title": string, "description": string, "tags": string[] }
}`;

export function buildGenerationMessages(
  brand: BrandContext,
  content: ContentContext,
  only?: "instagram" | "tiktok" | "youtube",
) {
  const scope = only
    ? `Hasilkan HANYA bagian "${only}". Struktur JSON: { "${only}": ... } mengikuti skema di bawah.`
    : `Hasilkan semua platform.`;
  const language = content.language || brand.language || "id";
  return [
    { role: "system" as const, content: systemPrompt(language) },
    {
      role: "user" as const,
      content: `${brandBlock(brand)}

Konteks konten:
${contentBlock(content)}

${scope}

Skema JSON:
${FULL_SCHEMA}`,
    },
  ];
}
