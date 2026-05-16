import { errorResponse, getGroqConfig, jsonResponse, parseGroqError, postGroqJson } from "../_lib/groq";

export const runtime = "nodejs";

type SpeakRequest = {
  text?: string;
  language?: string;
};

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);

  let body: SpeakRequest;
  try {
    body = (await request.json()) as SpeakRequest;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const text = body.text?.trim();
  if (!text) return errorResponse("Missing text", 400);

  const language = body.language?.trim() || "ru";

  // Groq TTS currently works best for supported voices/models; fall back to browser TTS for local app languages.
  if (language !== "en") {
    return jsonResponse({ ok: false, fallback: "browser", reason: "unsupported_language" }, { status: 200 });
  }

  try {
    const { ttsModel, ttsVoice, ttsFormat } = getGroqConfig();
    const response = await postGroqJson("/audio/speech", {
      model: ttsModel,
      voice: ttsVoice,
      input: text.slice(0, 4096),
      response_format: ttsFormat,
    });

    if (!response.ok) {
      return errorResponse(await parseGroqError(response), response.status);
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": ttsFormat === "mp3" ? "audio/mpeg" : "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speech synthesis failed";
    return errorResponse(message, 500);
  }
}

export default {
  fetch: handleRequest,
};
