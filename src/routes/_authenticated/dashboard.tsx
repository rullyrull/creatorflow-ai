import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, FileVideo, TriangleAlert, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { PLATFORM_LABEL, type Platform } from "@/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CreatorFlow" },
      {
        name: "description",
        content: "Ringkasan unggahan, jadwal posting, dan status publikasi di semua platform.",
      },
      { property: "og:title", content: "Dashboard — CreatorFlow" },
      { property: "og:description", content: "Ringkasan publikasi kamu dalam satu tempat." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [content, jobs, activity] = await Promise.all([
        supabase
          .from("content")
          .select("id, title, status, created_at")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("publishing_jobs")
          .select("id, platform, status, scheduled_at, content_id, error_message")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("activity_logs")
          .select("id, message, level, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      return {
        content: content.data ?? [],
        jobs: jobs.data ?? [],
        activity: activity.data ?? [],
      };
    },
  });

  const jobs = data?.jobs ?? [];
  const stats = [
    { label: "Total konten", value: data?.content.length ?? 0, icon: FileVideo },
    {
      label: "Terjadwal",
      value: jobs.filter((j) => j.status === "scheduled").length,
      icon: CalendarClock,
    },
    {
      label: "Terbit",
      value: jobs.filter((j) => j.status === "published").length,
      icon: CheckCircle2,
    },
    { label: "Gagal", value: jobs.filter((j) => j.status === "failed").length, icon: TriangleAlert },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Ringkasan konten dan status publishing kamu."
      actions={
        <Button asChild>
          <Link to="/upload">
            <Upload className="size-4" /> Upload content
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">
                  {isLoading ? "—" : stat.value}
                </p>
              </div>
              <stat.icon className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.content.length ?? 0) === 0 ? (
              <EmptyHint />
            ) : (
              data?.content.map((item) => (
                <Link
                  key={item.id}
                  to="/content/$id"
                  params={{ id: item.id }}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <span className="truncate pr-3">{item.title}</span>
                  <StatusBadge status={item.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publishing status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada job publishing.</p>
            ) : (
              jobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{PLATFORM_LABEL[job.platform as Platform]}</span>
                  <StatusBadge status={job.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.activity.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
          ) : (
            data?.activity.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">{log.message}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center">
      <p className="text-sm text-muted-foreground">Belum ada konten.</p>
      <Button asChild variant="secondary" size="sm" className="mt-3">
        <Link to="/upload">Upload video pertama</Link>
      </Button>
    </div>
  );
}
