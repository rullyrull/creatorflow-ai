ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS default_tone text,
  ADD COLUMN IF NOT EXISTS default_language text NOT NULL DEFAULT 'id',
  ADD COLUMN IF NOT EXISTS style_rules text,
  ADD COLUMN IF NOT EXISTS emoji_usage text NOT NULL DEFAULT 'sedang',
  ADD COLUMN IF NOT EXISTS hashtag_style text,
  ADD COLUMN IF NOT EXISTS formality text NOT NULL DEFAULT 'santai';