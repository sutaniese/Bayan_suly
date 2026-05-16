/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OpenAI API key for optional cloud TTS (`/v1/audio/speech`). Exposed in the client bundle — use only for demos or with a proxy key. */
  readonly VITE_OPENAI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
