import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContentStatus } from "@/types";

const STATUSES: (ContentStatus | "all")[] = [
  "all",
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
];

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Pustaka Konten — CreatorFlow" },
      {
        name: "description",
        content: "Telusuri semua video yang kamu unggah, saring berdasarkan status, lalu lanjut review.",
      },
      { property: "og:title", content: "Pustaka Konten — CreatorFlow" },
      { property: "og:description", content: "Semua unggahan kamu dalam satu pustaka." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["library", status],
    queryFn: async () => {
      let query = supabase
        .from("content")
        .select("id, title, topic, status, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status as ContentStatus);
      const { data: rows } = await query;
      return rows ?? [];
    },
  });

  const rows = (data ?? []).filter((row) =>
    row.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <AppShell
      title="Konten"
      description="Semua video kamu, dari draf sampai terbit."
      actions={
        <Button asChild>
          <Link to="/upload">
            <Upload className="size-4" /> Upload
          </Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Cari judul..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "Semua status" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat konten...</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Belum ada konten di sini.</p>
            <Button asChild className="mt-4" variant="secondary">
              <Link to="/upload">Upload video</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <Link key={row.id} to="/content/$id" params={{ id: row.id }}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="space-y-2 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium leading-tight">{row.title}</h2>
                    <StatusBadge status={row.status} />
                  </div>
                  {row.topic ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{row.topic}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
