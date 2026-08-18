import { Badge } from "@/components/ui/badge";

const LABEL: Record<string, string> = {
  draft: "Draf",
  scheduled: "Terjadwal",
  queued: "Antre",
  uploading: "Mengunggah",
  processing: "Diproses",
  publishing: "Publikasi",
  published: "Terbit",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

const VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  published: "default",
  failed: "destructive",
  cancelled: "outline",
  draft: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT[status] ?? "secondary"} className="capitalize">
      {LABEL[status] ?? status}
    </Badge>
  );
}
