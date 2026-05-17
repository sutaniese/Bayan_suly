import { describe, expect, it } from "vitest";
import { matchVoiceCommand, normalizeVoiceTranscript } from "./voice";

describe("voice command matching", () => {
  it("matches game navigation commands in Russian and Kazakh", () => {
    expect(matchVoiceCommand("Открой слова")).toBe("open_words_game");
    expect(matchVoiceCommand("Математика ойыны")).toBe("open_math_game");
    expect(matchVoiceCommand("Покажи игру с узорами")).toBe("open_patterns_game");
    expect(matchVoiceCommand("мәдениет ойыны")).toBe("open_culture_game");
  });

  it("matches app navigation commands in Russian and Kazakh", () => {
    expect(matchVoiceCommand("Открой карту")).toBe("open_map");
    expect(matchVoiceCommand("Сыйлықтар")).toBe("open_rewards");
    expect(matchVoiceCommand("Сканерді аш")).toBe("open_qr");
    expect(matchVoiceCommand("Сколько монет?")).toBe("show_coins");
  });

  it("normalizes punctuation and mixed casing before matching", () => {
    expect(normalizeVoiceTranscript("  ОТКРОЙ,   КАРТУ! ")).toBe("открой карту");
    expect(matchVoiceCommand("Ата-ана режимі")).toBe("open_parent_mode");
  });
});
