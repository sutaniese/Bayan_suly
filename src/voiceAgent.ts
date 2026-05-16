import type { Language } from "./gameLogic";
import type { VoiceAgentContext, VoiceCommandResolution } from "../shared/voice";
import { matchVoiceCommand } from "../shared/voice";

let currentAudio: HTMLAudioElement | null = null;

async function readJsonIfPossible<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function cancelVoicePlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function transcribeAudio(blob: Blob, language: Language): Promise<{ transcript: string; language: string | null }> {
  const audioBase64 = await blobToBase64(blob);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response: Response;
  try {
    response = await fetch("/api/voice/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64,
        mimeType: blob.type || "audio/webm",
        language: language === "kz" ? "kk" : "ru",
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(err instanceof DOMException && err.name === "AbortError" ? "Transcription timed out. Please try again." : "Network error during transcription.");
  }
  clearTimeout(timeout);

  const data = await readJsonIfPossible<{ transcript?: string; language?: string | null; error?: string }>(response);
  if (!response.ok) throw new Error(data?.error || "Transcription failed");
  if (!data) throw new Error("Voice transcription returned an invalid server response.");
  return {
    transcript: data.transcript?.trim() || "",
    language: data.language ?? null,
  };
}

export async function resolveVoiceCommand(
  transcript: string,
  context: VoiceAgentContext,
): Promise<VoiceCommandResolution> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch("/api/voice/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, context }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    const fallbackDirect = matchVoiceCommand(transcript);
    const act = fallbackDirect && context.allowedCommands.includes(fallbackDirect) ? fallbackDirect : null;
    return { action: act, replyText: act ? "Okay." : "Voice command timed out.", transcript, source: "fallback" };
  }
  clearTimeout(timeout);

  const data = await readJsonIfPossible<Partial<VoiceCommandResolution> & { error?: string }>(response);
  const fallback = matchVoiceCommand(transcript);
  const action =
    typeof data?.action === "string" ? data.action : fallback && context.allowedCommands.includes(fallback) ? fallback : null;

  return {
    action,
    replyText:
      typeof data?.replyText === "string" && data.replyText.trim()
        ? data.replyText.trim()
        : action
          ? "Okay."
          : data?.error || "I could not understand that command.",
    transcript,
    source: data?.source === "llm" || data?.source === "fallback" ? data.source : action ? "fallback" : undefined,
  };
}

export async function speakText(text: string, language: Language): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  cancelVoicePlayback();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, language }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return false;
  }
  clearTimeout(timeout);

  if (!response.ok) return false;

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.startsWith("audio/")) return false;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };

  try {
    await audio.play();
    currentAudio = audio;
    return true;
  } catch {
    URL.revokeObjectURL(url);
    return false;
  }
}
