import type { JobStatus } from "@/types";

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ["scheduled", "queued", "cancelled"],
  scheduled: ["queued", "cancelled"],
  queued: ["uploading", "failed", "cancelled"],
  uploading: ["processing", "published", "failed"],
  processing: ["published", "failed"],
  published: [],
  failed: ["queued"],
  cancelled: [],
};

export function canTransition(from: JobStatus, to: JobStatus) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: JobStatus, to: JobStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid publishing state transition: ${from} -> ${to}`);
  }
}

export const MAX_ATTEMPTS = 4;

/** Exponential backoff: immediate, 1 min, 5 min, 15 min. */
export function backoffMs(attempt: number) {
  return [0, 60_000, 300_000, 900_000][Math.min(attempt, 3)] ?? 900_000;
}

export const ACTIVE_STATUSES: JobStatus[] = ["scheduled", "queued", "uploading", "processing"];
