import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DRIVE_CONNECTOR_ID,
  DRIVE_SCOPES,
  type DriveFile,
  type DriveFolder,
  type DriveStatus,
} from "@/lib/drive/config";

export const getDriveStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriveStatus> => {
    const clientKey = process.env["GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    const base: DriveStatus = {
      state: "not_connected",
      message: "Belum terhubung. Hubungkan akun Google Drive kamu.",
      accountEmail: null,
      grantedScopes: [],
      folderId: null,
      folderName: null,
      updatedAt: null,
    };
    if (!clientKey) {
      return {
        ...base,
        state: "configuration_required",
        message: "Konektor Google Drive belum dikonfigurasi di workspace ini.",
      };
    }
    const { getConnectionForUser, updateConnectionMeta } = await import(
      "@/server/appUserConnections.server"
    );
    const conn = await getConnectionForUser(context.userId, DRIVE_CONNECTOR_ID);
    if (!conn) return base;

    const { fetchDriveAccountEmail, DriveAuthError } = await import("@/lib/drive/drive.server");
    let email = conn.accountEmail;
    try {
      email = await fetchDriveAccountEmail(conn.connectionAPIKey);
      if (email && email !== conn.accountEmail) {
        await updateConnectionMeta(context.userId, DRIVE_CONNECTOR_ID, { account_email: email });
      }
    } catch (error) {
      if (error instanceof DriveAuthError) {
        await updateConnectionMeta(context.userId, DRIVE_CONNECTOR_ID, {
          status: "needs_reauth",
          last_error: "unauthorized",
        });
        return {
          ...base,
          state: "needs_reauth",
          message: "Izin Google Drive sudah tidak berlaku. Beri izin ulang untuk melanjutkan.",
          accountEmail: conn.accountEmail,
          grantedScopes: conn.grantedScopes,
          folderId: conn.folderId,
          folderName: conn.folderName,
          updatedAt: conn.updatedAt,
        };
      }
      throw error;
    }

    return {
      state: conn.folderId ? "connected" : "folder_required",
      message: conn.folderId
        ? `Terhubung. Aplikasi hanya membaca folder "${conn.folderName}".`
        : "Terhubung. Pilih folder Drive yang boleh diakses aplikasi.",
      accountEmail: email,
      grantedScopes: conn.grantedScopes,
      folderId: conn.folderId,
      folderName: conn.folderName,
      updatedAt: conn.updatedAt,
    };
  });

export const startDriveConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientKey = process.env["GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientKey) throw new Error("Konektor Google Drive belum dikonfigurasi.");
    const request = getRequest();
    if (!request) throw new Error("OAuth harus dimulai dari permintaan aplikasi.");
    const url = new URL(request.url);
    const sandboxHost =
      url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/google_drive/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const existing = await getConnectionKeyForUser(context.userId, DRIVE_CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: "https://connector-gateway.lovable.dev",
      connectorId: DRIVE_CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl,
      connectionAPIKey: existing ?? undefined,
      credentialsConfiguration: { scopes: DRIVE_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeDriveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      "https://connector-gateway.lovable.dev",
      data.code,
    );
    if (connectorId !== DRIVE_CONNECTOR_ID) {
      throw new Error("OAuth selesai untuk konektor yang salah.");
    }
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey, DRIVE_SCOPES);
    return { ok: true as const };
  });

export const disconnectDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import(
      "@/server/appUserConnections.server"
    );
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
    const key = await getConnectionKeyForUser(context.userId, DRIVE_CONNECTOR_ID);
    if (key) {
      try {
        await disconnectAppUser({
          gatewayBaseUrl: "https://connector-gateway.lovable.dev",
          connectionAPIKey: key,
          connectorId: DRIVE_CONNECTOR_ID,
        });
      } catch (error) {
        console.error("Gateway disconnect failed", error);
      }
    }
    await deleteConnectionForUser(context.userId, DRIVE_CONNECTOR_ID);
    return { ok: true as const };
  });

export const listDriveFolderOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { parentId?: string | null; search?: string }) => input)
  .handler(async ({ data, context }): Promise<DriveFolder[]> => {
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const { listDriveFolders } = await import("@/lib/drive/drive.server");
    const key = await getConnectionKeyForUser(context.userId, DRIVE_CONNECTOR_ID);
    if (!key) throw new Error("Google Drive belum terhubung.");
    return listDriveFolders(key, data.parentId ?? null, data.search ?? "");
  });

export const setDriveFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { folderId: string; folderName: string }) => input)
  .handler(async ({ data, context }) => {
    const { updateConnectionMeta } = await import("@/server/appUserConnections.server");
    await updateConnectionMeta(context.userId, DRIVE_CONNECTOR_ID, {
      folder_id: data.folderId,
      folder_name: data.folderName,
    });
    return { ok: true as const };
  });

export const listDriveVideoFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string }) => input)
  .handler(async ({ data, context }): Promise<DriveFile[]> => {
    const { getConnectionForUser } = await import("@/server/appUserConnections.server");
    const { listDriveVideos } = await import("@/lib/drive/drive.server");
    const conn = await getConnectionForUser(context.userId, DRIVE_CONNECTOR_ID);
    if (!conn) throw new Error("Google Drive belum terhubung.");
    if (!conn.folderId) throw new Error("Pilih folder Drive dulu di halaman Integrasi.");
    return listDriveVideos(conn.connectionAPIKey, conn.folderId, data.search ?? "");
  });

export const importDriveVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      fileId: string;
      title: string;
      topic?: string | null;
      audience?: string | null;
      tone: string;
      objective: string;
      notes?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { getConnectionForUser } = await import("@/server/appUserConnections.server");
    const { getDriveFile, assertFileInAllowedFolder } = await import("@/lib/drive/drive.server");
    const conn = await getConnectionForUser(context.userId, DRIVE_CONNECTOR_ID);
    if (!conn) throw new Error("Google Drive belum terhubung.");
    if (!conn.folderId) throw new Error("Pilih folder Drive dulu di halaman Integrasi.");
    await assertFileInAllowedFolder(conn.connectionAPIKey, data.fileId, conn.folderId);
    const file = await getDriveFile(conn.connectionAPIKey, data.fileId);

    const { data: content, error } = await context.supabase
      .from("content")
      .insert({
        user_id: context.userId,
        title: data.title || file.name,
        topic: data.topic || null,
        target_audience: data.audience || null,
        tone: data.tone,
        objective: data.objective,
        additional_instructions: data.notes || null,
        source: "google_drive",
        drive_file_id: file.id,
        drive_file_name: file.name,
        drive_web_view_link: file.webViewLink,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.mimeType,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: content.id as string };
  });
