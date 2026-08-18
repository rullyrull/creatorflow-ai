import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DriveFolderDialog } from "@/components/drive-folder-dialog";
import { connectGoogleDrive } from "@/lib/drive/connect-client";
import { disconnectDrive, getDriveStatus } from "@/lib/api/drive.functions";
import { DRIVE_SCOPE_LABEL, DRIVE_STATE_LABEL } from "@/lib/drive/config";

export function useDriveStatus() {
  const fetchStatus = useServerFn(getDriveStatus);
  return useQuery({ queryKey: ["drive-status"], queryFn: () => fetchStatus() });
}

export function GoogleDriveCard() {
  const queryClient = useQueryClient();
  const disconnect = useServerFn(disconnectDrive);
  const { data, isLoading } = useDriveStatus();
  const [busy, setBusy] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["drive-status"] });

  async function handleConnect() {
    setBusy(true);
    try {
      await connectGoogleDrive();
      toast.success("Google Drive terhubung.");
      await refresh();
      setFolderOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Koneksi Google Drive gagal.");
    } finally {
      setBusy(false);
    }
  }

  const connected = data?.state === "connected" || data?.state === "folder_required";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Google Drive</CardTitle>
        <Badge variant={data?.state === "connected" ? "default" : "secondary"}>
          {isLoading ? "…" : (DRIVE_STATE_LABEL[data!.state] ?? "Tidak diketahui")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{data?.message}</p>
        {data?.accountEmail ? <p className="text-sm">{data.accountEmail}</p> : null}
        {data?.grantedScopes?.length ? (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {data.grantedScopes.map((scope) => (
              <li key={scope}>• {DRIVE_SCOPE_LABEL[scope] ?? scope}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || data?.state === "configuration_required"}
            onClick={handleConnect}
          >
            {data?.state === "needs_reauth"
              ? "Beri izin ulang"
              : connected
                ? "Hubungkan ulang"
                : "Hubungkan"}
          </Button>
          {connected ? (
            <Button size="sm" variant="outline" onClick={() => setFolderOpen(true)}>
              {data?.folderName ? "Ganti folder" : "Pilih folder"}
            </Button>
          ) : null}
          {connected || data?.state === "needs_reauth" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await disconnect();
                toast.success("Google Drive diputus.");
                await refresh();
              }}
            >
              Putuskan
            </Button>
          ) : null}
        </div>
        <DriveFolderDialog open={folderOpen} onOpenChange={setFolderOpen} onSaved={refresh} />
      </CardContent>
    </Card>
  );
}
