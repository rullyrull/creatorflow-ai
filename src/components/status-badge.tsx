import { Badge } from "@/components/ui/badge";

const LABEL: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  queued: "Queued",
  uploading: "Uploading",
  processing: "Processing",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  cancelled: "Cancelled",
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
