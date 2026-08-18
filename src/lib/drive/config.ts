/** Browser-safe constants for the Google Drive App User Connector. */
export const DRIVE_CONNECTOR_ID = "google_drive";

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.readonly",
];

export const DRIVE_SCOPE_LABEL: Record<string, string> = {
  "https://www.googleapis.com/auth/userinfo.email": "Alamat email akun Google",
  "https://www.googleapis.com/auth/userinfo.profile": "Nama & foto profil",
  "https://www.googleapis.com/auth/drive.readonly": "Baca-saja file Google Drive",
};

export type DriveConnectionState =
  | "configuration_required"
  | "not_connected"
  | "needs_reauth"
  | "folder_required"
  | "connected";

export const DRIVE_STATE_LABEL: Record<DriveConnectionState, string> = {
  configuration_required: "Perlu konfigurasi",
  not_connected: "Belum terhubung",
  needs_reauth: "Butuh izin ulang",
  folder_required: "Pilih folder",
  connected: "Terhubung",
};

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  thumbnailLink: string | null;
}

export interface DriveFolder {
  id: string;
  name: string;
}

export interface DriveStatus {
  state: DriveConnectionState;
  message: string;
  accountEmail: string | null;
  grantedScopes: string[];
  folderId: string | null;
  folderName: string | null;
  updatedAt: string | null;
}
