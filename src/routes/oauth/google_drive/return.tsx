import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google_drive/return")({
  head: () => ({
    meta: [
      { title: "Menyelesaikan koneksi Google Drive — CreatorFlow" },
      {
        name: "description",
        content: "Halaman callback OAuth untuk menyelesaikan koneksi Google Drive di CreatorFlow.",
      },
      { property: "og:title", content: "Menyelesaikan koneksi Google Drive — CreatorFlow" },
      { property: "og:description", content: "Jendela ini akan tertutup otomatis." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = useState("Menyelesaikan koneksi…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      code?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_drive", code: code ?? null },
        window.location.origin,
      );
      window.close();
    };
    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "OAuth tidak selesai.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("appUserConnectorOAuthComplete");
        return;
      }
      setMessage("OAuth selesai tanpa kode penukaran.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    notify("appUserConnectorOAuthComplete", code);
  }, []);

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
