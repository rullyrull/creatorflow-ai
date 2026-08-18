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

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CreatorFlow" },
      {
        name: "description",
        content: "Tune your brand profile so AI writes captions in your own voice.",
      },
      { property: "og:title", content: "Settings — CreatorFlow" },
      { property: "og:description", content: "Brand voice and publishing defaults." },
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
    });
  }, [data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("brand_profiles")
      .upsert({ user_id: auth.user!.id, ...form }, { onConflict: "user_id" });
    if (error) {
      toast.error("Gagal menyimpan brand profile.");
      return;
    }
    toast.success("Brand profile tersimpan.");
    void queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
  }

  return (
    <AppShell title="Settings" description="Atur brand voice yang dipakai AI.">
      <form className="max-w-2xl space-y-4" onSubmit={save}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand profile</CardTitle>
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
              <Label htmlFor="audience">Audience</Label>
              <Input
                id="audience"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
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
        <Button type="submit">Simpan</Button>
      </form>
    </AppShell>
  );
}
