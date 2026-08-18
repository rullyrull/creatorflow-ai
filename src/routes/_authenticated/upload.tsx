import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Film, HardDrive, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { DrivePickerDialog } from "@/components/drive-picker-dialog";
import { useDriveStatus } from "@/components/google-drive-card";
import { importDriveVideo } from "@/lib/api/drive.functions";
import { DRIVE_STATE_LABEL, type DriveFile } from "@/lib/drive/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { OBJECTIVES, OBJECTIVE_LABEL, TONES, TONE_LABEL } from "@/types";

const MAX_BYTES = 500 * 1024 * 1024;
const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Unggah Konten — CreatorFlow" },
      {
        name: "description",
        content: "Unggah video sekali, biarkan AI menyiapkan caption untuk Instagram, TikTok, dan YouTube.",
      },
      { property: "og:title", content: "Unggah Konten — CreatorFlow" },
      { property: "og:description", content: "Satu unggahan, tiga platform." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const importDrive = useServerFn(importDriveVideo);
  const [file, setFile] = useState<File | null>(null);
  const [driveFile, setDriveFile] = useState<DriveFile | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [source, setSource] = useState<"local" | "drive">("local");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("casual");
  const [objective, setObjective] = useState("engagement");
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toneTouched, setToneTouched] = useState(false);

  const { data: brand } = useQuery({
    queryKey: ["brand-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("brand_profiles").select("*").maybeSingle();
      return data;
    },
  });

  const { data: driveStatus } = useDriveStatus();

  const effectiveTone = !toneTouched && brand?.default_tone ? brand.default_tone : tone;

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

  function pickDrive(selected: DriveFile) {
    setDriveFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  }

  async function submitDrive() {
    if (!driveFile) {
      toast.error("Pilih video dari Google Drive dulu.");
      return;
    }
    setBusy(true);
    setProgress(30);
    try {
      const result = await importDrive({
        data: {
          fileId: driveFile.id,
          title: title || driveFile.name,
          topic: topic || null,
          audience: audience || null,
          tone: effectiveTone,
          objective,
          notes: notes || null,
        },
      });
      setProgress(100);
      toast.success("Video Drive terhubung. Lanjut siapkan konten dengan AI.");
      navigate({ to: "/content/$id", params: { id: result.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengambil video dari Drive.");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (source === "drive") {
      await submitDrive();
      return;
    }
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
          tone: effectiveTone,
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
    <AppShell title="Unggah konten" description="Satu video, siap untuk tiga platform.">
      <form className="grid max-w-3xl gap-4" onSubmit={submit}>
        <Card>
          <CardContent className="pt-6">
            <Tabs value={source} onValueChange={(v) => setSource(v as "local" | "drive")}>
              <TabsList className="mb-4">
                <TabsTrigger value="local">Unggah dari perangkat</TabsTrigger>
                <TabsTrigger value="drive">Google Drive</TabsTrigger>
              </TabsList>
              <TabsContent value="local">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center transition-colors hover:bg-accent/40">
                  <UploadCloud className="size-6 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {file ? file.name : "Klik untuk pilih video"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    MP4, MOV, atau WebM. Maks 500 MB.
                  </span>
                  <input
                    type="file"
                    accept={ACCEPTED.join(",")}
                    className="hidden"
                    onChange={(e) => pick(e.target.files?.[0] ?? null)}
                  />
                </label>
              </TabsContent>
              <TabsContent value="drive" className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <HardDrive className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status Google Drive:</span>
                  <Badge variant={driveStatus?.state === "connected" ? "default" : "secondary"}>
                    {driveStatus ? (DRIVE_STATE_LABEL[driveStatus.state] ?? "…") : "…"}
                  </Badge>
                  {driveStatus?.folderName ? (
                    <span className="text-xs text-muted-foreground">
                      Folder: {driveStatus.folderName}
                    </span>
                  ) : null}
                </div>
                {driveStatus?.state === "connected" ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    {driveFile ? (
                      <p className="mb-3 flex items-center justify-center gap-2 text-sm font-medium">
                        <Film className="size-4 text-muted-foreground" />
                        {driveFile.name}
                      </p>
                    ) : (
                      <p className="mb-3 text-sm text-muted-foreground">
                        Belum ada video Drive yang dipilih.
                      </p>
                    )}
                    <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                      {driveFile ? "Ganti video" : "Pilih video dari Google Drive"}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    <p className="mb-3">
                      {driveStatus?.message ?? "Memeriksa koneksi Google Drive…"}
                    </p>
                    <Button type="button" variant="outline" onClick={() => navigate({ to: "/integrations" })}>
                      Buka halaman Integrasi
                    </Button>
                  </div>
                )}
                <DrivePickerDialog
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}
                  onSelect={pickDrive}
                />
              </TabsContent>
            </Tabs>
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
              <Select
                value={effectiveTone}
                onValueChange={(v) => {
                  setToneTouched(true);
                  setTone(v);
                }}
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
              {brand?.default_tone && !toneTouched ? (
                <p className="text-xs text-muted-foreground">Diambil dari pengaturan brand kamu.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Tujuan</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {OBJECTIVE_LABEL[o] ?? o}
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
            {busy
              ? "Memproses..."
              : source === "drive"
                ? "Gunakan video Drive & lanjutkan"
                : "Upload & lanjutkan"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
