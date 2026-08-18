// Server-only Google Drive access through the Lovable connector gateway.
import { callAsAppUser } from "@/integrations/lovable/appUserConnector";
import { DRIVE_CONNECTOR_ID, type DriveFile, type DriveFolder } from "@/lib/drive/config";

export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const DRIVE_API = "/drive/v3";

export class DriveAuthError extends Error {}

async function driveGet(connectionAPIKey: string, path: string) {
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey,
    connectorId: DRIVE_CONNECTOR_ID,
    path,
  });
  if (res.status === 401 || res.status === 403) {
    const body = await res.text();
    console.error(`Google Drive auth error [${res.status}]: ${body}`);
    throw new DriveAuthError("Izin Google Drive tidak berlaku lagi.");
  }
  if (!res.ok) {
    const body = await res.text();
    console.error(`Google Drive request failed [${res.status}]: ${body}`);
    throw new Error(`Permintaan Google Drive gagal [${res.status}]: ${body}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function fetchDriveAccountEmail(connectionAPIKey: string): Promise<string | null> {
  const data = await driveGet(connectionAPIKey, `${DRIVE_API}/about?fields=user(emailAddress)`);
  const user = data["user"] as { emailAddress?: string } | undefined;
  return user?.emailAddress ?? null;
}

function q(value: string) {
  return encodeURIComponent(value);
}

export async function listDriveFolders(
  connectionAPIKey: string,
  parentId: string | null,
  search: string,
): Promise<DriveFolder[]> {
  const clauses = [
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    parentId ? `'${parentId.replace(/'/g, "")}' in parents` : "'root' in parents",
  ];
  if (search.trim()) {
    clauses.push(`name contains '${search.replace(/['\\]/g, "")}'`);
    clauses.splice(2, 1); // search across the whole drive, not just one parent
  }
  const data = await driveGet(
    connectionAPIKey,
    `${DRIVE_API}/files?q=${q(clauses.join(" and "))}&fields=${q("files(id,name)")}&pageSize=100&orderBy=${q("name")}`,
  );
  const files = (data["files"] ?? []) as Array<{ id: string; name: string }>;
  return files.map((f) => ({ id: f.id, name: f.name }));
}

export async function listDriveVideos(
  connectionAPIKey: string,
  folderId: string | null,
  search: string,
): Promise<DriveFile[]> {
  const clauses = ["mimeType contains 'video/'", "trashed = false"];
  if (folderId) clauses.push(`'${folderId.replace(/'/g, "")}' in parents`);
  if (search.trim()) clauses.push(`name contains '${search.replace(/['\\]/g, "")}'`);
  const fields = "files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink)";
  const data = await driveGet(
    connectionAPIKey,
    `${DRIVE_API}/files?q=${q(clauses.join(" and "))}&fields=${q(fields)}&pageSize=50&orderBy=${q("modifiedTime desc")}`,
  );
  const files = (data["files"] ?? []) as Array<Record<string, string | undefined>>;
  return files.map((f) => ({
    id: f["id"]!,
    name: f["name"] ?? "Tanpa nama",
    mimeType: f["mimeType"] ?? "video/mp4",
    size: f["size"] ? Number(f["size"]) : null,
    modifiedTime: f["modifiedTime"] ?? null,
    webViewLink: f["webViewLink"] ?? null,
    thumbnailLink: f["thumbnailLink"] ?? null,
  }));
}

export async function getDriveFile(connectionAPIKey: string, fileId: string): Promise<DriveFile> {
  const fields = "id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink";
  const f = (await driveGet(
    connectionAPIKey,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=${q(fields)}`,
  )) as Record<string, string | undefined>;
  return {
    id: f["id"]!,
    name: f["name"] ?? "Tanpa nama",
    mimeType: f["mimeType"] ?? "video/mp4",
    size: f["size"] ? Number(f["size"]) : null,
    modifiedTime: f["modifiedTime"] ?? null,
    webViewLink: f["webViewLink"] ?? null,
    thumbnailLink: f["thumbnailLink"] ?? null,
  };
}

/** Confirms the file lives inside the folder the user granted access to. */
export async function assertFileInAllowedFolder(
  connectionAPIKey: string,
  fileId: string,
  folderId: string | null,
) {
  if (!folderId) return;
  const data = await driveGet(
    connectionAPIKey,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=${q("parents")}`,
  );
  const parents = (data["parents"] ?? []) as string[];
  if (!parents.includes(folderId)) {
    throw new Error("File berada di luar folder yang kamu izinkan.");
  }
}
