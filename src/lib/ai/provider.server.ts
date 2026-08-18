/**
 * AI service abstraction. The application never talks to a model vendor
 * directly — swap the provider here to move to OpenAI or anything else.
 * API keys are read inside the call, server-side only.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionResult {
  text: string;
  model: string;
  provider: string;
  tokensUsed: number | null;
}

export interface AiProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(messages: ChatMessage[], model: string): Promise<CompletionResult>;
}

class LovableAiProvider implements AiProvider {
  readonly name = "lovable";

  isConfigured() {
    return Boolean(process.env["LOVABLE_API_KEY"]);
  }

  async complete(messages: ChatMessage[], model: string): Promise<CompletionResult> {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI provider is not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
    });
    if (res.status === 429) throw new Error("AI_RATE_LIMIT");
    if (res.status === 402) throw new Error("AI_CREDITS_REQUIRED");
    if (!res.ok) throw new Error(`AI_REQUEST_FAILED:${res.status}`);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    return {
      text: json.choices?.[0]?.message?.content ?? "",
      model,
      provider: this.name,
      tokensUsed: json.usage?.total_tokens ?? null,
    };
  }
}

class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  isConfigured() {
    return Boolean(process.env["AI_API_KEY"]);
  }

  async complete(messages: ChatMessage[], model: string): Promise<CompletionResult> {
    const key = process.env["AI_API_KEY"];
    if (!key) throw new Error("AI provider is not configured");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
    });
    if (!res.ok) throw new Error(`AI_REQUEST_FAILED:${res.status}`);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    return {
      text: json.choices?.[0]?.message?.content ?? "",
      model,
      provider: this.name,
      tokensUsed: json.usage?.total_tokens ?? null,
    };
  }
}

export function getAiProvider(preferred?: string | null): AiProvider {
  const openai = new OpenAiProvider();
  if (preferred === "openai" && openai.isConfigured()) return openai;
  return new LovableAiProvider();
}

/**
 * Future: AI video analysis (transcript, hook, key points, chapters).
 * The abstraction exists now so it can be implemented without touching callers.
 */
export interface VideoAnalysisProvider {
  analyze(videoUrl: string): Promise<{
    transcript: string | null;
    topic: string | null;
    hook: string | null;
    keyPoints: string[];
  }>;
}

export function getVideoAnalysisProvider(): VideoAnalysisProvider | null {
  return null; // not implemented yet — callers must handle null and say so in the UI
}
