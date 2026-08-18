import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity — CreatorFlow" },
      {
        name: "description",
        content: "A readable history of uploads, AI generations and publishing results.",
      },
      { property: "og:title", content: "Activity — CreatorFlow" },
      { property: "og:description", content: "Every action CreatorFlow took for you." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { data } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("id, message, level, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return logs ?? [];
    },
  });

  return (
    <AppShell title="Activity" description="Riwayat semua yang terjadi di akun kamu.">
      {(data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada aktivitas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3 text-sm"
            >
              <span>{log.message}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
