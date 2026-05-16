/**
 * Optional OpenAI text-to-speech. The API key is read from `import.meta.env.VITE_OPENAI_API_KEY`
 * and is embedded in the client build — suitable for hackathon demos only; use a backend proxy for production.
 */

import type { Language } from "./gameLogic";

let currentAudio: HTMLAudioElement | null = null;

export function cancelOpenAiPlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }
}

/**
 * @returns true if OpenAI audio started playing, false to fall back to `speechSynthesis`.
 */
export async function tryPlayOpenAiSpeech(text: string, apiKey: string, _language: Language): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed || !apiKey.trim()) return false;

  cancelOpenAiPlayback();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "nova",
        input: trimmed.slice(0, 4096),
        response_format: "mp3",
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
