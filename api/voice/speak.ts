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

  let body: { text?: string; voice?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const text = body.text?.trim();
  if (!text) return json({ error: "Missing text" }, 400);

  const ttsModel = process.env.GROQ_TTS_MODEL?.trim() || "playai-tts";
  const voice = body.voice?.trim() || process.env.GROQ_TTS_VOICE?.trim() || "Arista-PlayAI";

  try {
    const res = await fetch(`${GROQ_API_BASE}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: ttsModel, input: text, voice, response_format: "wav" }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: `Groq TTS error: ${errText.slice(0, 300)}` }, res.status);
    }

    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: { "Content-Type": "audio/wav", "Content-Length": String(buf.byteLength) },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "TTS failed" }, 500);
  }
}
