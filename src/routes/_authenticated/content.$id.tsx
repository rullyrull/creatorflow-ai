import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { RefreshCw, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateContent } from "@/lib/api/ai.functions";
import { schedulePublishing, retryJob } from "@/lib/api/publishing.functions";
import { getIntegrationStatuses } from "@/lib/api/integrations.functions";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLATFORM_LABEL, PLATFORM_LIMITS, PLATFORMS, type Platform } from "@/types";

export const Route = createFileRoute("/_authenticated/content/$id")({
  head: () => ({
    meta: [
      { title: "Review Konten — CreatorFlow" },
      {
        name: "description",
        content: "Review caption hasil AI per platform, edit, lalu jadwalkan atau publikasikan.",
      },
      { property: "og:title", content: "Review Konten — CreatorFlow" },
      { property: "og:description", content: "Edit dan publikasikan varian tiap platform." },
    ],
  }),
  component: ContentDetail,
});

type VariantDraft = {
  title: string;
  caption: string;
  description: string;
  hashtags: string;
  tags: string;
  cta: string;
};

const emptyDraft: VariantDraft = {
  title: "",
  caption: "",
  description: "",
  hashtags: "",
  tags: "",
  cta: "",
};

function ContentDetail() {
  const { id } = useParams({ from: "/_authenticated/content/$id" });
  const queryClient = useQueryClient();
  const generate = useServerFn(generateContent);
  const publish = useServerFn(schedulePublishing);
  const retry = useServerFn(retryJob);

  const [drafts, setDrafts] = useState<Record<Platform, VariantDraft>>({
    instagram: { ...emptyDraft },
    tiktok: { ...emptyDraft },
    youtube: { ...emptyDraft },
  });
  const [selected, setSelected] = useState<Platform[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const [content, variants, jobs] = await Promise.all([
        supabase.from("content").select("*").eq("id", id).single(),
        supabase.from("content_variants").select("*").eq("content_id", id),
        supabase
          .from("publishing_jobs")
          .select("*")
          .eq("content_id", id)
          .order("created_at", { ascending: false }),
      ]);
      return { content: content.data, variants: variants.data ?? [], jobs: jobs.data ?? [] };
    },
    refetchInterval: (query) =>
      (query.state.data?.jobs ?? []).some((j) =>
        ["queued", "uploading", "processing"].includes(j.status),
      )
        ? 5000
        : false,
  });

  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => getIntegrationStatuses(),
  });

  useEffect(() => {
    if (!data?.variants.length) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const variant of data.variants) {
        next[variant.platform as Platform] = {
          title: variant.title ?? "",
          caption: variant.caption ?? "",
          description: variant.description ?? "",
          hashtags: (variant.hashtags ?? []).join(" "),
          tags: (variant.tags ?? []).join(", "),
          cta: variant.cta ?? "",
        };
      }
      return next;
    });
  }, [data?.variants]);

  const generating = useMutation({
    mutationFn: (only?: Platform) => generate({ data: only ? { contentId: id, only } : { contentId: id } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("AI selesai menyiapkan konten.");
      void queryClient.invalidateQueries({ queryKey: ["content", id] });
    },
    onError: () => toast.error("AI gagal dijalankan. Coba lagi."),
  });

  const saving = useMutation({
    mutationFn: async (platform: Platform) => {
      const draft = drafts[platform];
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("content_variants").upsert(
        {
          content_id: id,
          user_id: auth.user!.id,
          platform,
          title: platform === "youtube" ? draft.title : null,
          caption: platform === "youtube" ? null : draft.caption,
          description: platform === "youtube" ? draft.description : null,
          hashtags: draft.hashtags.split(/\s+/).filter(Boolean),
          tags: platform === "youtube" ? draft.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          cta: platform === "youtube" ? null : draft.cta,
          edited_by_user: true,
        },
        { onConflict: "content_id,platform" },
      );
      if (error) throw error;
    },
    onSuccess: () => toast.success("Perubahan tersimpan."),
    onError: () => toast.error("Gagal menyimpan perubahan."),
  });

  const publishing = useMutation({
    mutationFn: (schedule: boolean) =>
      publish({
        data: {
          contentId: id,
          platforms: selected,
          scheduledFor: schedule && scheduledFor ? new Date(scheduledFor).toISOString() : null,
        },
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Publishing diproses.");
      void queryClient.invalidateQueries({ queryKey: ["content", id] });
    },
    onError: () => toast.error("Publishing gagal dimulai."),
  });

  if (isLoading) {
    return (
      <AppShell title="Memuat konten...">
        <p className="text-sm text-muted-foreground">Sedang memuat.</p>
      </AppShell>
    );
  }
  if (!data?.content) {
    return (
      <AppShell title="Konten tidak ditemukan">
        <Button asChild variant="secondary">
          <Link to="/library">Kembali ke Content</Link>
        </Button>
      </AppShell>
    );
  }

  const content = data.content;

  return (
    <AppShell
      title={content.title}
      description="Review hasil AI, edit sesuai gaya kamu, lalu publish."
      actions={
        <Button onClick={() => generating.mutate(undefined)} disabled={generating.isPending}>
          <Sparkles className="size-4" />
          {generating.isPending ? "AI bekerja..." : "Generate dengan AI"}
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Varian per platform</CardTitle>
            <StatusBadge status={content.status} />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="instagram">
              <TabsList className="mb-4">
                {PLATFORMS.map((platform) => (
                  <TabsTrigger key={platform} value={platform}>
                    {PLATFORM_LABEL[platform]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {PLATFORMS.map((platform) => {
                const draft = drafts[platform];
                const set = (patch: Partial<VariantDraft>) =>
                  setDrafts((prev) => ({ ...prev, [platform]: { ...prev[platform], ...patch } }));
                return (
                  <TabsContent key={platform} value={platform} className="space-y-4">
                    {platform === "youtube" ? (
                      <>
                        <Field
                          label={`Title (${draft.title.length}/${PLATFORM_LIMITS.youtube.title})`}
                        >
                          <Input
                            value={draft.title}
                            maxLength={PLATFORM_LIMITS.youtube.title}
                            onChange={(e) => set({ title: e.target.value })}
                          />
                        </Field>
                        <Field
                          label={`Description (${draft.description.length}/${PLATFORM_LIMITS.youtube.description})`}
                        >
                          <Textarea
                            rows={8}
                            value={draft.description}
                            maxLength={PLATFORM_LIMITS.youtube.description}
                            onChange={(e) => set({ description: e.target.value })}
                          />
                        </Field>
                        <Field label="Tags (pisahkan dengan koma)">
                          <Input value={draft.tags} onChange={(e) => set({ tags: e.target.value })} />
                        </Field>
                      </>
                    ) : (
                      <>
                        <Field
                          label={`Caption (${draft.caption.length}/${PLATFORM_LIMITS[platform].caption})`}
                        >
                          <Textarea
                            rows={7}
                            value={draft.caption}
                            maxLength={PLATFORM_LIMITS[platform].caption}
                            onChange={(e) => set({ caption: e.target.value })}
                          />
                        </Field>
                        <Field label="Ajakan bertindak (CTA)">
                          <Input value={draft.cta} onChange={(e) => set({ cta: e.target.value })} />
                        </Field>
                        <Field
                          label={`Hashtags (maks ${PLATFORM_LIMITS[platform].hashtags}, pisahkan dengan spasi)`}
                        >
                          <Textarea
                            rows={3}
                            value={draft.hashtags}
                            onChange={(e) => set({ hashtags: e.target.value })}
                          />
                        </Field>
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={() => saving.mutate(platform)} disabled={saving.isPending}>
                        Simpan
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => generating.mutate(platform)}
                        disabled={generating.isPending}
                      >
                        <RefreshCw className="size-4" /> Buat ulang {PLATFORM_LABEL[platform]}
                      </Button>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publikasikan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PLATFORMS.map((platform) => {
                const status = integrations?.find((i) => i.platform === platform);
                const ready = status?.state === "connected";
                return (
                  <div key={platform} className="space-y-1">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.includes(platform)}
                        disabled={!ready}
                        onCheckedChange={(checked) =>
                          setSelected((prev) =>
                            checked ? [...prev, platform] : prev.filter((p) => p !== platform),
                          )
                        }
                      />
                      {PLATFORM_LABEL[platform]}
                    </label>
                    {!ready ? (
                      <p className="pl-6 text-xs text-muted-foreground">
                        {status?.message ?? "Belum terhubung."}{" "}
                        <Link to="/integrations" className="underline">
                          Atur koneksi
                        </Link>
                      </p>
                    ) : null}
                  </div>
                );
              })}

              <div className="space-y-1.5">
                <Label htmlFor="schedule">Jadwal (opsional)</Label>
                <Input
                  id="schedule"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => publishing.mutate(false)}
                  disabled={publishing.isPending || !selected.length}
                >
                  <Rocket className="size-4" /> Publikasikan sekarang
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => publishing.mutate(true)}
                  disabled={publishing.isPending || !selected.length || !scheduledFor}
                >
                  Jadwalkan
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status job publikasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada job publikasi.</p>
              ) : (
                data.jobs.map((job) => (
                  <div key={job.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{PLATFORM_LABEL[job.platform as Platform]}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    {job.error_message ? (
                      <p className="mt-2 text-xs text-muted-foreground">{job.error_message}</p>
                    ) : null}
                    {job.external_url ? (
                      <a
                        href={job.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs underline"
                      >
                        Lihat postingan
                      </a>
                    ) : null}
                    {job.status === "failed" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={async () => {
                          const result = await retry({ data: { jobId: job.id } });
                          if (!result.ok) toast.error(result.error);
                          void queryClient.invalidateQueries({ queryKey: ["content", id] });
                        }}
                      >
                        Coba lagi
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
