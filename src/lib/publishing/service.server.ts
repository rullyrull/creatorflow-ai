import type { Platform } from "@/types";
import { IntegrationNotConfiguredError, PlatformError } from "@/lib/social/adapter";
import type { OAuthTokens } from "@/lib/social/adapter";
import { getAdapter } from "@/lib/social/registry.server";
import { assertTransition, backoffMs, MAX_ATTEMPTS } from "./state-machine";
import type { JobStatus } from "@/types";

/** Lazily load the privileged client only where it is genuinely needed. */
async function admin() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

export async function logActivity(input: {
  userId: string;
  eventType: string;
  message: string;
  contentId?: string | null | undefined;
  platform?: Platform | null | undefined;
  level?: "info" | "success" | "error" | undefined;
  metadata?: Record<string, unknown> | undefined;
}) {
  const db = await admin();
  await db.from("activity_logs").insert({
    user_id: input.userId,
    event_type: input.eventType,
    message: input.message,
    content_id: input.contentId ?? null,
    platform: input.platform ?? null,
    level: input.level ?? "info",
    metadata: (input.metadata ?? {}) as never,
  });
}

export async function notify(input: {
  userId: string;
  title: string;
  body?: string | undefined;
  level?: string | undefined;
  link?: string | undefined;
}) {
  const db = await admin();
  await db.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body ?? null,
    level: input.level ?? "info",
    link: input.link ?? null,
  });
}

async function setStatus(
  jobId: string,
  from: JobStatus,
  to: JobStatus,
  patch: Record<string, unknown> = {},
) {
  assertTransition(from, to);
  const db = await admin();
  const { error } = await db
    .from("publishing_jobs")
    .update({ status: to, ...patch })
    .eq("id", jobId)
    .eq("status", from); // optimistic lock: prevents double execution
  if (error) throw error;
}

/**
 * Executes one publishing job through its platform adapter.
 * Idempotent: only a job still in `queued` is picked up, and the row-level
 * status guard means a concurrent runner cannot publish the same job twice.
 */
export async function executeJob(jobId: string) {
  const db = await admin();
  const { data: job } = await db
    .from("publishing_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.status !== "queued") return { skipped: true };

  const platform = job.platform as Platform;
  const adapter = getAdapter(platform);

  try {
    const { data: account } = await db
      .from("social_accounts")
      .select("*")
      .eq("id", job.social_account_id ?? "")
      .maybeSingle();
    if (!account || account.status !== "connected" || !account.access_token_encrypted) {
      throw new PlatformError(
        `${platform}_not_connected`,
        `Akun ${platform} belum terhubung. Hubungkan akun terlebih dahulu lalu coba lagi.`,
        true,
      );
    }

    const { data: content } = await db
      .from("content")
      .select("*")
      .eq("id", job.content_id)
      .single();
    const { data: variant } = await db
      .from("content_variants")
      .select("*")
      .eq("content_id", job.content_id)
      .eq("platform", platform)
      .maybeSingle();

    await setStatus(job.id, "queued", "uploading", {
      started_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
      attempt_count: job.attempt_count + 1,
    });

    let tokens: OAuthTokens = {
      accessToken: account.access_token_encrypted,
      refreshToken: account.refresh_token_encrypted,
      expiresAt: account.token_expires_at,
      scopes: account.scopes ?? [],
    };
    tokens = await adapter.refreshTokenIfNeeded(tokens);
    if (tokens.accessToken !== account.access_token_encrypted) {
      await db
        .from("social_accounts")
        .update({
          access_token_encrypted: tokens.accessToken,
          refresh_token_encrypted: tokens.refreshToken,
          token_expires_at: tokens.expiresAt,
        })
        .eq("id", account.id);
    }

    const { data: signed } = await db.storage
      .from("content-media")
      .createSignedUrl(content!.storage_path!, 3600);
    if (!signed?.signedUrl) {
      throw new PlatformError(
        "video_source_unavailable",
        "File video tidak bisa dibaca. Coba upload ulang video-nya.",
        true,
      );
    }

    const result = await adapter.publishVideo(tokens, {
      videoUrl: signed.signedUrl,
      title: variant?.title ?? content?.title ?? undefined,
      caption: variant?.caption ?? undefined,
      description: variant?.description ?? undefined,
      hashtags: variant?.hashtags ?? [],
      tags: variant?.tags ?? [],
      settings: (variant?.settings as Record<string, unknown>) ?? {},
      idempotencyKey: job.idempotency_key,
    });

    if (result.pending) {
      await setStatus(job.id, "uploading", "processing", {
        external_post_id: result.externalPostId,
      });
      return { pending: true };
    }

    await setStatus(job.id, "uploading", "published", {
      external_post_id: result.externalPostId,
      external_url: result.externalUrl,
      completed_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    });
    await logActivity({
      userId: job.user_id,
      eventType: "publish_succeeded",
      platform,
      contentId: job.content_id,
      message: `${platform} publishing selesai`,
      level: "success",
    });
    await notify({
      userId: job.user_id,
      title: `Konten kamu tayang di ${platform}`,
      body: result.externalUrl ?? undefined,
      level: "success",
      link: `/content/${job.content_id}`,
    });
    return { published: true };
  } catch (error) {
    await failJob(job, error);
    return { failed: true };
  }
}

async function failJob(job: { id: string; user_id: string; content_id: string; platform: string; attempt_count: number; status: string }, error: unknown) {
  const db = await admin();
  const permanent =
    error instanceof IntegrationNotConfiguredError ||
    (error instanceof PlatformError && error.permanent);
  const code =
    error instanceof PlatformError
      ? error.code
      : error instanceof IntegrationNotConfiguredError
        ? `${job.platform}_not_configured`
        : "publish_failed";
  const message =
    error instanceof PlatformError
      ? error.userMessage
      : error instanceof IntegrationNotConfiguredError
        ? `Integrasi ${job.platform} belum dikonfigurasi.`
        : "Publishing gagal. Kamu bisa mencoba ulang.";

  const attempts = job.attempt_count + 1;
  const retryable = !permanent && attempts < MAX_ATTEMPTS;

  const current = (await db.from("publishing_jobs").select("status").eq("id", job.id).single())
    .data?.status;

  await db
    .from("publishing_jobs")
    .update({
      status: "failed",
      error_code: code,
      error_message: message,
      attempt_count: attempts,
      last_attempt_at: new Date().toISOString(),
      next_attempt_at: retryable
        ? new Date(Date.now() + backoffMs(attempts)).toISOString()
        : null,
      completed_at: retryable ? null : new Date().toISOString(),
    })
    .eq("id", job.id)
    .in("status", [current ?? "queued"]);

  // Technical detail is stored in the log, never surfaced raw to the creator.
  await logActivity({
    userId: job.user_id,
    eventType: "publish_failed",
    platform: job.platform as Platform,
    contentId: job.content_id,
    message,
    level: "error",
    metadata: {
      code,
      technical: error instanceof PlatformError ? error.technical : String(error),
      attempts,
    },
  });
  await notify({
    userId: job.user_id,
    title: `Publishing ${job.platform} gagal`,
    body: message,
    level: "error",
    link: `/content/${job.content_id}`,
  });
}

/** Polls platforms for jobs that are still processing. */
export async function pollProcessingJob(jobId: string) {
  const db = await admin();
  const { data: job } = await db.from("publishing_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job || job.status !== "processing") return;
  const adapter = getAdapter(job.platform as Platform);
  const getStatus = adapter.getPublishStatus?.bind(adapter);
  if (!getStatus || !job.external_post_id) return;
  const { data: account } = await db
    .from("social_accounts")
    .select("*")
    .eq("id", job.social_account_id ?? "")
    .maybeSingle();
  if (!account?.access_token_encrypted) return;
  const status = await getStatus(
    {
      accessToken: account.access_token_encrypted,
      refreshToken: account.refresh_token_encrypted,
      expiresAt: account.token_expires_at,
      scopes: account.scopes ?? [],
    },
    job.external_post_id,
  );
  if (status === "published") {
    await setStatus(job.id, "processing", "published", {
      completed_at: new Date().toISOString(),
    });
  } else if (status === "failed") {
    await failJob(job, new PlatformError("publish_failed", "Platform menolak video ini.", true));
  }
}

