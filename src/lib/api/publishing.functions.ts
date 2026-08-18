import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Platform } from "@/types";

/** Creates (or reschedules) publishing jobs for the selected platforms. */
export const schedulePublishing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { contentId: string; platforms: Platform[]; scheduledFor?: string | null }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logActivity } = await import("@/lib/publishing/service.server");
    const { executeJob } = await import("@/lib/publishing/service.server");

    if (!data.platforms.length) {
      return { ok: false as const, error: "Pilih minimal satu platform." };
    }
    const { data: content } = await supabase
      .from("content")
      .select("id, storage_path")
      .eq("id", data.contentId)
      .maybeSingle();
    if (!content?.storage_path) {
      return { ok: false as const, error: "Video belum siap. Upload dulu videonya." };
    }

    const scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null;
    if (scheduledFor && scheduledFor.getTime() < Date.now() - 60_000) {
      return { ok: false as const, error: "Waktu jadwal harus di masa depan." };
    }

    const created: string[] = [];
    for (const platform of data.platforms) {
      const { data: account } = await supabaseAdmin
        .from("social_accounts")
        .select("id, status")
        .eq("user_id", userId)
        .eq("platform", platform)
        .maybeSingle();
      if (!account || account.status !== "connected") {
        return {
          ok: false as const,
          error: `Akun ${platform} belum terhubung. Hubungkan dulu di halaman Integrations.`,
        };
      }

      const idempotencyKey = `${data.contentId}:${platform}:${scheduledFor?.toISOString() ?? "now"}`;
      const { data: job, error } = await supabaseAdmin
        .from("publishing_jobs")
        .upsert(
          {
            user_id: userId,
            content_id: data.contentId,
            platform,
            social_account_id: account.id,
            status: scheduledFor ? "scheduled" : "queued",
            scheduled_at: scheduledFor?.toISOString() ?? null,
            idempotency_key: idempotencyKey,
            attempt_count: 0,
            error_code: null,
            error_message: null,
          },
          { onConflict: "idempotency_key" },
        )
        .select("id")
        .single();
      if (error) return { ok: false as const, error: "Gagal membuat jadwal publishing." };
      created.push(job.id);
    }

    await supabase
      .from("content")
      .update({ status: scheduledFor ? "scheduled" : "publishing" })
      .eq("id", data.contentId);

    await logActivity({
      userId,
      eventType: scheduledFor ? "publish_scheduled" : "publish_started",
      contentId: data.contentId,
      message: scheduledFor
        ? `Dijadwalkan ke ${data.platforms.join(", ")}`
        : `Publishing dimulai ke ${data.platforms.join(", ")}`,
    });

    if (!scheduledFor) {
      for (const jobId of created) await executeJob(jobId);
    }
    return { ok: true as const, jobIds: created };
  });

export const retryJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { executeJob } = await import("@/lib/publishing/service.server");
    const { data: job } = await supabaseAdmin
      .from("publishing_jobs")
      .select("id, user_id, status")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job || job.user_id !== context.userId) {
      return { ok: false as const, error: "Job tidak ditemukan." };
    }
    if (job.status !== "failed") return { ok: false as const, error: "Job ini tidak bisa diulang." };
    await supabaseAdmin
      .from("publishing_jobs")
      .update({ status: "queued", error_code: null, error_message: null, next_attempt_at: null })
      .eq("id", job.id);
    await executeJob(job.id);
    return { ok: true as const };
  });

export const cancelJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job } = await supabaseAdmin
      .from("publishing_jobs")
      .select("id, user_id, status")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job || job.user_id !== context.userId) {
      return { ok: false as const, error: "Job tidak ditemukan." };
    }
    if (!["scheduled", "queued", "failed"].includes(job.status)) {
      return { ok: false as const, error: "Job sudah berjalan dan tidak bisa dibatalkan." };
    }
    await supabaseAdmin
      .from("publishing_jobs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", job.id);
    return { ok: true as const };
  });
