import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Folder, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listDriveFolderOptions, setDriveFolder } from "@/lib/api/drive.functions";

interface Crumb {
  id: string | null;
  name: string;
}

export function DriveFolderDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const listFolders = useServerFn(listDriveFolderOptions);
  const saveFolder = useServerFn(setDriveFolder);
  const [trail, setTrail] = useState<Crumb[]>([{ id: null, name: "Drive Saya" }]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const current = trail[trail.length - 1]!;

  const { data, isLoading, error } = useQuery({
    queryKey: ["drive-folders", current.id, search],
    queryFn: () => listFolders({ data: { parentId: current.id, search } }),
    enabled: open,
  });

  async function choose(id: string, name: string) {
    setSaving(true);
    try {
      await saveFolder({ data: { folderId: id, folderName: name } });
      toast.success(`Akses dibatasi ke folder "${name}".`);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan folder.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pilih folder Google Drive</DialogTitle>
          <DialogDescription>
            CreatorFlow hanya akan membaca video di dalam folder yang kamu pilih.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama folder…"
        />
        {!search ? (
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {trail.map((crumb, i) => (
              <span key={`${crumb.id}-${i}`} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight className="size-3" /> : null}
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => setTrail(trail.slice(0, i + 1))}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {isLoading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat folder…
            </p>
          ) : error ? (
            <p className="py-6 text-sm text-destructive">
              {error instanceof Error ? error.message : "Gagal memuat folder."}
            </p>
          ) : !data?.length ? (
            <p className="py-6 text-sm text-muted-foreground">Tidak ada folder di sini.</p>
          ) : (
            data.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left text-sm"
                  onClick={() => {
                    setSearch("");
                    setTrail([...trail, { id: folder.id, name: folder.name }]);
                  }}
                >
                  <Folder className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{folder.name}</span>
                </button>
                <Button size="sm" disabled={saving} onClick={() => choose(folder.id, folder.name)}>
                  Pilih
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
