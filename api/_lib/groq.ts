const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export type GroqConfig = {
  apiKey: string;
  asrModel: string;
  chatModel: string;
  ttsModel: string;
  ttsVoice: string;
  ttsFormat: "wav" | "mp3";
};

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return jsonResponse({ error: message, ...extra }, { status });
}

export function getGroqConfig(): GroqConfig {
  const apiKey = env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const ttsFormat = (env.GROQ_TTS_FORMAT?.trim() as "wav" | "mp3" | undefined) ?? "wav";

  return {
    apiKey,
    asrModel: env.GROQ_ASR_MODEL?.trim() || "whisper-large-v3-turbo",
    chatModel: env.GROQ_CHAT_MODEL?.trim() || "llama-3.1-8b-instant",
    ttsModel: env.GROQ_TTS_MODEL?.trim() || "canopylabs/orpheus-v1-english",
    ttsVoice: env.GROQ_TTS_VOICE?.trim() || "hannah",
    ttsFormat,
  };
}

export async function postGroqJson(path: string, body: unknown): Promise<Response> {
  const { apiKey } = getGroqConfig();
  return fetch(`${GROQ_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function postGroqForm(path: string, form: FormData): Promise<Response> {
  const { apiKey } = getGroqConfig();
  return fetch(`${GROQ_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });
}

export async function parseGroqError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    const message = data?.error?.message;
    return typeof message === "string" && message.trim() ? message : `Groq request failed with ${response.status}`;
  } catch {
    return `Groq request failed with ${response.status}`;
  }
}

export function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
