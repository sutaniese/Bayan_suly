export type VoiceCommand =
  | "open_map"
  | "open_memory_game"
  | "open_words_game"
  | "open_math_game"
  | "open_patterns_game"
  | "open_culture_game"
  | "open_rewards"
  | "open_album"
  | "open_garden"
  | "open_qr"
  | "open_daily_chest"
  | "open_daily_tasks"
  | "open_photo_frame"
  | "open_leaderboard"
  | "repeat_instruction"
  | "read_current_screen"
  | "show_coins"
  | "open_parent_mode"
  | "enable_large_text";

export type VoiceAgentContext = {
  view: string;
  language: "ru" | "kz" | "en";
  coins: number;
  screenSummary: string;
  instructionTitle: string;
  instructionHint: string;
  allowedCommands: VoiceCommand[];
};

export type VoiceCommandResolution = {
  action: VoiceCommand | null;
  replyText: string;
  transcript?: string;
  source?: "llm" | "fallback";
};

export function normalizeVoiceTranscript(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchVoiceCommand(rawTranscript: string): VoiceCommand | null {
  const text = normalizeVoiceTranscript(rawTranscript);
  const hasAny = (...phrases: string[]) => phrases.some((phrase) => text.includes(phrase));

  if (hasAny("open map", "map", "карта", "открой карту", "аш картаны", "картаны аш")) return "open_map";
  if (hasAny("open memory", "memory game", "memor", "almaty", "алматы", "ойын память", "жад ойыны")) return "open_memory_game";
  if (hasAny("open word", "word game", "turkestan", "туркестан", "түркістан", "слова", "сөз ойыны")) return "open_words_game";
  if (hasAny("open math", "math game", "astana", "астана", "математика", "санау ойыны")) return "open_math_game";
  if (hasAny("open pattern", "pattern game", "karaganda", "караганда", "қарағанды", "узор", "pattern")) return "open_patterns_game";
  if (hasAny("open culture", "culture game", "shymkent", "шимкент", "шымкент", "culture match", "мәдениет")) return "open_culture_game";
  if (hasAny("open rewards", "rewards", "награды", "сыйлық", "сыйлықтар")) return "open_rewards";
  if (hasAny("open album", "album", "альбом", "жинақ")) return "open_album";
  if (hasAny("open garden", "garden", "сад", "бақ", "skill garden")) return "open_garden";
  if (hasAny("open qr", "scan package", "qr", "куар", "скан", "пакет")) return "open_qr";
  if (hasAny("open chest", "daily chest", "сундук", "сандық")) return "open_daily_chest";
  if (hasAny("daily task", "задани", "тапсырма", "ежедневн")) return "open_daily_tasks";
  if (hasAny("photo frame", "фото", "рамка", "фото бота", "ботамен фото")) return "open_photo_frame";
  if (hasAny("leaderboard", "лидер", "көшбасшы", "рейтинг", "таблица лидеров")) return "open_leaderboard";
  if (hasAny("repeat", "repeat instruction", "повтори", "повтори инструкцию", "қайтала", "нұсқауды қайтала")) return "repeat_instruction";
  if (hasAny("read screen", "read this", "what is on screen", "прочитай экран", "что на экране", "экранды оқы", "не көріп тұрмын")) return "read_current_screen";
  if (hasAny("coins", "how many coins", "монеты", "сколько монет", "тиын", "coin")) return "show_coins";
  if (hasAny("parent", "call parent", "родитель", "родительский режим", "ата ана", "ата ана режимі")) return "open_parent_mode";
  if (hasAny("large text", "turn on large text", "крупный текст", "үлкен мәтін")) return "enable_large_text";

  return null;
}
