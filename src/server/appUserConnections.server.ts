// Server-only storage for per-app-user connector connection keys.
import { encryptConnectionKey, decryptConnectionKey } from "@/server/connectionKeyCrypto";

export interface StoredConnection {
  connectionAPIKey: string;
  grantedScopes: string[];
  folderId: string | null;
  folderName: string | null;
  accountEmail: string | null;
  status: string;
  updatedAt: string;
}

export async function saveConnectionKeyForUser(
  userId: string,
  connectorId: string,
  connectionAPIKey: string,
  grantedScopes: string[],
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("app_user_connections").upsert(
    {
      user_id: userId,
      connector_id: connectorId,
      connection_key_ciphertext: encryptConnectionKey(connectionAPIKey),
      granted_scopes: grantedScopes,
      status: "connected",
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" },
  );
  if (error) throw error;
}

export async function getConnectionForUser(
  userId: string,
  connectorId: string,
): Promise<StoredConnection | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_user_connections")
    .select(
      "connection_key_ciphertext, granted_scopes, folder_id, folder_name, account_email, status, updated_at",
    )
    .eq("user_id", userId)
    .eq("connector_id", connectorId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    connectionAPIKey: decryptConnectionKey(data.connection_key_ciphertext),
    grantedScopes: data.granted_scopes ?? [],
    folderId: data.folder_id,
    folderName: data.folder_name,
    accountEmail: data.account_email,
    status: data.status,
    updatedAt: data.updated_at,
  };
}

export async function getConnectionKeyForUser(userId: string, connectorId: string) {
  const conn = await getConnectionForUser(userId, connectorId);
  return conn?.connectionAPIKey ?? null;
}

export async function updateConnectionMeta(
  userId: string,
  connectorId: string,
  patch: Record<string, unknown>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("app_user_connections")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
  if (error) throw error;
}

export async function deleteConnectionForUser(userId: string, connectorId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("app_user_connections")
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
  if (error) throw error;
}
