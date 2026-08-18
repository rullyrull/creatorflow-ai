import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listDriveVideoFiles } from "@/lib/api/drive.functions";
import type { DriveFile } from "@/lib/drive/config";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

export function DrivePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: DriveFile) => void;
}) {
  const listFiles = useServerFn(listDriveVideoFiles);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["drive-videos", search],
    queryFn: () => listFiles({ data: { search } }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pilih video dari Google Drive</DialogTitle>
          <DialogDescription>
            Hanya video di folder yang kamu izinkan yang ditampilkan.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama video…"
        />
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {isLoading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat video…
            </p>
          ) : error ? (
            <p className="py-6 text-sm text-destructive">
              {error instanceof Error ? error.message : "Gagal memuat video."}
            </p>
          ) : !data?.length ? (
            <p className="py-6 text-sm text-muted-foreground">
              Tidak ada video di folder tersebut.
            </p>
          ) : (
            data.map((file) => (
              <button
                key={file.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40"
                onClick={() => {
                  onSelect(file);
                  onOpenChange(false);
                }}
              >
                <Film className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{file.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
