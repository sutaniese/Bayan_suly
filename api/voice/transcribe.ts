const GROQ_API_BASE = "https://api.groq.com/openai/v1";

export const config = { runtime: "nodejs" };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return json({ error: "Server misconfiguration: missing GROQ_API_KEY" }, 500);

  let body: { audioBase64?: string; mimeType?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const audioBase64 = body.audioBase64?.trim();
  if (!audioBase64) return json({ error: "Missing audioBase64" }, 400);

  const mimeType = body.mimeType?.trim() || "audio/webm";
  const asrModel = process.env.GROQ_ASR_MODEL?.trim() || "whisper-large-v3-turbo";

  try {
    const binary = atob(audioBase64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], `input.${ext}`, { type: mimeType });

    const form = new FormData();
    form.append("file", file);
    form.append("model", asrModel);
    if (body.language?.trim()) form.append("language", body.language.trim());

    const res = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Groq ASR error: ${text.slice(0, 300)}` }, res.status);
    }

    const data = (await res.json()) as { text?: string; language?: string };
    return json({ transcript: data.text?.trim() || "", language: data.language || body.language || null });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Transcription failed" }, 500);
  }
}
