import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  disconnectAccount,
  getIntegrationStatuses,
  startConnection,
} from "@/lib/api/integrations.functions";
import { PLATFORM_LABEL, PLATFORMS, type Platform } from "@/types";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — CreatorFlow" },
      {
        name: "description",
        content: "Connect Instagram, TikTok and YouTube accounts so CreatorFlow can publish for you.",
      },
      { property: "og:title", content: "Integrations — CreatorFlow" },
      { property: "og:description", content: "Manage your social account connections." },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const queryClient = useQueryClient();
  const connect = useServerFn(startConnection);
  const disconnect = useServerFn(disconnectAccount);

  const { data, isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => getIntegrationStatuses(),
  });

  async function handleConnect(platform: Platform) {
    const result = await connect({ data: { platform } });
    if (!result.ok) {
      toast.error(
        `${PLATFORM_LABEL[platform]} integration requires configuration: ${result.missingConfig.join(", ")}`,
      );
      return;
    }
    window.location.href = result.url;
  }

  return (
    <AppShell
      title="Integrations"
      description="Hubungkan akun sosial kamu untuk publishing otomatis."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const status = data?.find((s) => s.platform === platform);
          const connected = status?.state === "connected";
          return (
            <Card key={platform}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">{PLATFORM_LABEL[platform]}</CardTitle>
                <Badge variant={connected ? "default" : "secondary"}>
                  {isLoading ? "…" : (status?.state.replace(/_/g, " ") ?? "unknown")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{status?.message}</p>
                {status?.account?.username ? (
                  <p className="text-sm">@{status.account.username}</p>
                ) : null}
                {status?.missingConfig.length ? (
                  <p className="text-xs text-muted-foreground">
                    Missing configuration: {status.missingConfig.join(", ")}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={status?.state === "configuration_required"}
                    onClick={() => handleConnect(platform)}
                  >
                    {connected ? "Reconnect" : "Connect"}
                  </Button>
                  {status?.account ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await disconnect({ data: { platform } });
                        toast.success(`${PLATFORM_LABEL[platform]} diputus.`);
                        void queryClient.invalidateQueries({ queryKey: ["integrations"] });
                      }}
                    >
                      Disconnect
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
