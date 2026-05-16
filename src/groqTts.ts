/**
 * Optional Groq text-to-speech via the OpenAI-compatible speech API.
 * Key: `import.meta.env.VITE_GROQ_API_KEY` (embedded in the client — demo/hackathon only unless proxied).
 *
 * @see https://console.groq.com/docs/text-to-speech
 */

import type { Language } from "./gameLogic";

const GROQ_SPEECH_URL = "https://api.groq.com/openai/v1/audio/speech";

let currentAudio: HTMLAudioElement | null = null;

export function cancelGroqPlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }
}

/**
 * @returns true if Groq audio started playing, false to fall back to `speechSynthesis`.
 */
export async function tryPlayGroqSpeech(text: string, apiKey: string, _language: Language): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed || !apiKey.trim()) return false;

  cancelGroqPlayback();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  const model = import.meta.env.VITE_GROQ_TTS_MODEL?.trim() || "canopylabs/orpheus-v1-english";
  const voice = import.meta.env.VITE_GROQ_TTS_VOICE?.trim() || "hannah";
  const responseFormat = (import.meta.env.VITE_GROQ_TTS_FORMAT?.trim() as "wav" | "mp3" | undefined) || "wav";

  try {
    const res = await fetch(GROQ_SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input: trimmed.slice(0, 4096),
        response_format: responseFormat,
      }),
    });

    if (!res.ok) return false;

    const blob = await res.blob();
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
  } catch {
    return false;
  }
}
