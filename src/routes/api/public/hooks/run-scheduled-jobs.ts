import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler entry point. Promotes due scheduled jobs, executes queued jobs,
 * polls jobs still processing on the platform side, and retries failed jobs
 * whose backoff window has elapsed.
 */
export const Route = createFileRoute("/api/public/hooks/run-scheduled-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { executeJob, pollProcessingJob } = await import(
          "@/lib/publishing/service.server"
        );
        const now = new Date().toISOString();

        await supabaseAdmin
          .from("publishing_jobs")
          .update({ status: "queued" })
          .eq("status", "scheduled")
          .lte("scheduled_at", now);

        await supabaseAdmin
          .from("publishing_jobs")
          .update({ status: "queued" })
          .eq("status", "failed")
          .not("next_attempt_at", "is", null)
          .lte("next_attempt_at", now);

        const { data: queued } = await supabaseAdmin
          .from("publishing_jobs")
          .select("id")
          .eq("status", "queued")
          .limit(20);
        for (const job of queued ?? []) await executeJob(job.id);

        const { data: processing } = await supabaseAdmin
          .from("publishing_jobs")
          .select("id")
          .eq("status", "processing")
          .limit(20);
        for (const job of processing ?? []) await pollProcessingJob(job.id);

        return Response.json({
          ok: true,
          executed: queued?.length ?? 0,
          polled: processing?.length ?? 0,
        });
      },
    },
  },
});
