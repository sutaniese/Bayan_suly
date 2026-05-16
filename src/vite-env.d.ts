/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Groq API key for optional cloud TTS. Exposed in the client bundle — use only for demos or with a proxy. */
  readonly VITE_GROQ_API_KEY?: string;
  /** Optional override, e.g. `canopylabs/orpheus-v1-english` */
  readonly VITE_GROQ_TTS_MODEL?: string;
  /** Optional override, e.g. `hannah` — see Groq Orpheus docs */
  readonly VITE_GROQ_TTS_VOICE?: string;
  /** Optional: `wav` (default) or `mp3` */
  readonly VITE_GROQ_TTS_FORMAT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
