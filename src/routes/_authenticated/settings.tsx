import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRAND_LANGUAGES, EMOJI_USAGE, FORMALITY_LEVELS, TONES, TONE_LABEL } from "@/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan Brand — CreatorFlow" },
      {
        name: "description",
        content:
          "Atur tone, bahasa, dan aturan gaya brand supaya AI menulis caption dan hashtag sesuai suaramu.",
      },
      { property: "og:title", content: "Pengaturan Brand — CreatorFlow" },
      { property: "og:description", content: "Tone, bahasa, dan aturan gaya untuk AI." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    about_me: "",
    niche: "",
    audience: "",
    writing_style: "",
    words_to_avoid: "",
    favorite_cta: "",
    default_tone: "casual",
    default_language: "id",
    formality: "santai",
    emoji_usage: "sedang",
    hashtag_style: "",
    style_rules: "",
    content_pillars: "",
  });

  const { data } = useQuery({
    queryKey: ["brand-profile"],
    queryFn: async () => {
      const { data: brand } = await supabase.from("brand_profiles").select("*").maybeSingle();
      return brand;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      about_me: data.about_me ?? "",
      niche: data.niche ?? "",
      audience: data.audience ?? "",
      writing_style: data.writing_style ?? "",
      words_to_avoid: data.words_to_avoid ?? "",
      favorite_cta: data.favorite_cta ?? "",
      default_tone: data.default_tone ?? "casual",
      default_language: data.default_language ?? "id",
      formality: data.formality ?? "santai",
      emoji_usage: data.emoji_usage ?? "sedang",
      hashtag_style: data.hashtag_style ?? "",
      style_rules: data.style_rules ?? "",
      content_pillars: (data.content_pillars ?? []).join(", "),
    });
  }, [data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const { data: auth } = await supabase.auth.getUser();
    const { content_pillars, ...rest } = form;
    const { error } = await supabase
      .from("brand_profiles")
      .upsert(
        {
          user_id: auth.user!.id,
          ...rest,
          content_pillars: content_pillars
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
        },
        { onConflict: "user_id" },
      );
    if (error) {
      toast.error("Gagal menyimpan profil brand.");
      return;
    }
    toast.success("Profil brand tersimpan. AI akan pakai aturan ini.");
    void queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
  }

  return (
    <AppShell
      title="Pengaturan brand"
      description="Tentukan tone, bahasa, dan aturan gaya yang dipakai AI saat membuat caption dan hashtag."
    >
      <form className="max-w-2xl space-y-4" onSubmit={save}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suara brand</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tone default</Label>
              <Select
                value={form.default_tone}
                onValueChange={(v) => setForm({ ...form, default_tone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TONE_LABEL[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bahasa</Label>
              <Select
                value={form.default_language}
                onValueChange={(v) => setForm({ ...form, default_language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tingkat keformalan</Label>
              <Select
                value={form.formality}
                onValueChange={(v) => setForm({ ...form, formality: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMALITY_LEVELS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Penggunaan emoji</Label>
              <Select
                value={form.emoji_usage}
                onValueChange={(v) => setForm({ ...form, emoji_usage: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMOJI_USAGE.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rules">Aturan gaya (satu aturan per baris)</Label>
              <Textarea
                id="rules"
                rows={5}
                value={form.style_rules}
                placeholder={
                  "Contoh:\n- Selalu buka dengan pertanyaan\n- Maksimal 3 kalimat per paragraf\n- Jangan pakai kata 'guys'"
                }
                onChange={(e) => setForm({ ...form, style_rules: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Aturan ini dikirim ke AI setiap kali caption dan hashtag dibuat.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="hashtag">Gaya hashtag</Label>
              <Input
                id="hashtag"
                value={form.hashtag_style}
                placeholder="Misal: 8-12 hashtag, campur niche + lokal, huruf kecil semua"
                onChange={(e) => setForm({ ...form, hashtag_style: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil creator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="about">Tentang kamu</Label>
              <Textarea
                id="about"
                rows={3}
                value={form.about_me}
                onChange={(e) => setForm({ ...form, about_me: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="niche">Niche</Label>
              <Input
                id="niche"
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audience">Audiens</Label>
              <Input
                id="audience"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pillars">Pilar konten (pisahkan dengan koma)</Label>
              <Input
                id="pillars"
                value={form.content_pillars}
                placeholder="Tips editing, behind the scene, review alat"
                onChange={(e) => setForm({ ...form, content_pillars: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="style">Gaya menulis</Label>
              <Textarea
                id="style"
                rows={3}
                value={form.writing_style}
                onChange={(e) => setForm({ ...form, writing_style: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avoid">Kata yang dihindari</Label>
              <Input
                id="avoid"
                value={form.words_to_avoid}
                onChange={(e) => setForm({ ...form, words_to_avoid: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cta">CTA favorit</Label>
              <Input
                id="cta"
                value={form.favorite_cta}
                onChange={(e) => setForm({ ...form, favorite_cta: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
        <Button type="submit">Simpan pengaturan</Button>
      </form>
    </AppShell>
  );
}
