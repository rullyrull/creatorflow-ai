import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CreatorFlow — AI publishing assistant for creators" },
      {
        name: "description",
        content:
          "Upload one video, let AI prepare captions per platform, then publish or schedule to Instagram, TikTok and YouTube.",
      },
      { property: "og:title", content: "CreatorFlow — AI publishing assistant" },
      {
        property: "og:description",
        content: "One upload, AI-prepared metadata, automatic publishing to all your platforms.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/auth" });
  },
  component: () => null,
});
