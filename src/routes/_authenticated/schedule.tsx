import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cancelJob, retryJob } from "@/lib/api/publishing.functions";
import { PLATFORM_LABEL, type Platform } from "@/types";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — CreatorFlow" },
      {
        name: "description",
        content: "See every upcoming and in-flight publishing job, retry failures or cancel them.",
      },
      { property: "og:title", content: "Schedule — CreatorFlow" },
      { property: "og:description", content: "Your publishing queue at a glance." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const queryClient = useQueryClient();
  const retry = useServerFn(retryJob);
  const cancel = useServerFn(cancelJob);

  const { data } = useQuery({
    queryKey: ["schedule"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: jobs } = await supabase
        .from("publishing_jobs")
        .select("id, platform, status, scheduled_at, error_message, content_id, content(title)")
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .limit(50);
      return jobs ?? [];
    },
  });

  const jobs = data ?? [];

  return (
    <AppShell title="Schedule" description="Antrian publishing kamu.">
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada jadwal publishing.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div>
                  <p className="font-medium">
                    {(job.content as { title?: string } | null)?.title ?? "Konten"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {PLATFORM_LABEL[job.platform as Platform]}
                    {job.scheduled_at
                      ? ` • ${new Date(job.scheduled_at).toLocaleString()}`
                      : " • segera"}
                  </p>
                  {job.error_message ? (
                    <p className="mt-1 text-xs text-muted-foreground">{job.error_message}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={job.status} />
                  {job.status === "failed" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const result = await retry({ data: { jobId: job.id } });
                        if (!result.ok) toast.error(result.error);
                        void queryClient.invalidateQueries({ queryKey: ["schedule"] });
                      }}
                    >
                      Retry
                    </Button>
                  ) : null}
                  {["scheduled", "queued", "failed"].includes(job.status) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const result = await cancel({ data: { jobId: job.id } });
                        if (!result.ok) toast.error(result.error);
                        void queryClient.invalidateQueries({ queryKey: ["schedule"] });
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
