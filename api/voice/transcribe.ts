import { errorResponse, getGroqConfig, jsonResponse, parseGroqError, postGroqForm } from "../_lib/groq";

export const runtime = "nodejs";

type TranscribeRequest = {
  audioBase64?: string;
  mimeType?: string;
  language?: string;
};

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);

  let body: TranscribeRequest;
  try {
    body = (await request.json()) as TranscribeRequest;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const audioBase64 = body.audioBase64?.trim();
  if (!audioBase64) return errorResponse("Missing audioBase64", 400);

  const mimeType = body.mimeType?.trim() || "audio/webm";

  try {
    const { asrModel } = getGroqConfig();
    const binary = atob(audioBase64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], `voice-input.${ext}`, { type: mimeType });
    const form = new FormData();
    form.append("file", file);
    form.append("model", asrModel);
    if (body.language?.trim()) form.append("language", body.language.trim());

    const response = await postGroqForm("/audio/transcriptions", form);
    if (!response.ok) {
      return errorResponse(await parseGroqError(response), response.status);
    }

    const data = (await response.json()) as { text?: string; language?: string };
    return jsonResponse({
      transcript: data.text?.trim() || "",
      language: data.language || body.language || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    return errorResponse(message, 500);
  }
}

export default {
  fetch: handleRequest,
};
