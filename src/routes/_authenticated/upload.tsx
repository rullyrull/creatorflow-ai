import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OBJECTIVES, TONES } from "@/types";

const MAX_BYTES = 500 * 1024 * 1024;
const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload content — CreatorFlow" },
      {
        name: "description",
        content: "Upload a video once and let AI prepare captions for Instagram, TikTok and YouTube.",
      },
      { property: "og:title", content: "Upload content — CreatorFlow" },
      { property: "og:description", content: "One upload, three platforms." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("casual");
  const [objective, setObjective] = useState("engagement");
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  function pick(selected: File | null) {
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) {
      toast.error("Format tidak didukung. Gunakan MP4, MOV, atau WebM.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      toast.error("Ukuran maksimal 500 MB.");
      return;
    }
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error("Pilih video dulu.");
      return;
    }
    setBusy(true);
    setProgress(10);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user!.id;
      const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;

      const { error: uploadError } = await supabase.storage
        .from("content-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      setProgress(70);

      const { data: content, error } = await supabase
        .from("content")
        .insert({
          user_id: userId,
          title: title || file.name,
          topic: topic || null,
          target_audience: audience || null,
          tone,
          objective,
          additional_instructions: notes || null,
          storage_path: path,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      setProgress(100);
      toast.success("Video terupload. Lanjut siapkan konten dengan AI.");
      navigate({ to: "/content/$id", params: { id: content.id } });
    } catch {
      toast.error("Upload gagal. Coba lagi.");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Upload content" description="Satu video, siap untuk tiga platform.">
      <form className="grid max-w-3xl gap-4" onSubmit={submit}>
        <Card>
          <CardContent className="pt-6">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center transition-colors hover:bg-accent/40">
              <UploadCloud className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? file.name : "Klik untuk pilih video"}
              </span>
              <span className="text-xs text-muted-foreground">MP4, MOV, atau WebM. Maks 500 MB.</span>
              <input
                type="file"
                accept={ACCEPTED.join(",")}
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
            </label>
            {busy ? <Progress value={progress} className="mt-4" /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Judul internal</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="topic">Topik video</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Misal: 3 cara bikin hook yang nempel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audience">Target audience</Label>
              <Input
                id="audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Creator pemula"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Objective</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o} value={o} className="capitalize">
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Instruksi tambahan untuk AI</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: jangan pakai kata 'guys', tutup dengan ajakan follow."
              />
            </div>
          </CardContent>
        </Card>

        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Mengupload..." : "Upload & lanjutkan"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
