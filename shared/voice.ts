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

const COMMAND_PHRASES: Array<[VoiceCommand, string[]]> = [
  ["open_map", ["open map", "map", "карта", "карту", "открой карту", "покажи карту", "аш картаны", "картаны аш", "картаны көрсет"]],
  [
    "open_memory_game",
    [
      "open memory",
      "memory game",
      "memor",
      "almaty",
      "алматы",
      "память",
      "игра память",
      "открой память",
      "открой игру память",
      "сладости",
      "конфеты",
      "жад ойыны",
      "есте сақтау",
      "есте сақтау ойыны",
    ],
  ],
  [
    "open_words_game",
    [
      "open word",
      "word game",
      "words game",
      "turkestan",
      "туркестан",
      "түркістан",
      "слова",
      "слово",
      "казахское слово",
      "найди слово",
      "открой слова",
      "сөз",
      "сөз ойыны",
      "қазақ сөзі",
    ],
  ],
  [
    "open_math_game",
    [
      "open math",
      "math game",
      "counting",
      "astana",
      "астана",
      "математика",
      "счет",
      "счёт",
      "считать",
      "открой математику",
      "санау",
      "санау ойыны",
      "математика ойыны",
      "есеп",
    ],
  ],
  [
    "open_patterns_game",
    [
      "open pattern",
      "pattern game",
      "patterns game",
      "karaganda",
      "караганда",
      "қарағанды",
      "узор",
      "узоры",
      "паттерн",
      "караван узоров",
      "өрнек",
      "өрнектер",
      "өрнек ойыны",
    ],
  ],
  [
    "open_culture_game",
    [
      "open culture",
      "culture game",
      "culture match",
      "shymkent",
      "шимкент",
      "шымкент",
      "культура",
      "культур",
      "мәдениет",
      "мәдениет ойыны",
      "сәйкестік",
    ],
  ],
  ["open_rewards", ["open rewards", "rewards", "reward shop", "награды", "награду", "магазин наград", "сыйлық", "сыйлықтар", "марапат", "марапаттар"]],
  ["open_album", ["open album", "album", "sticker album", "альбом", "наклейки", "стикеры", "жинақ", "альбомды аш", "стикер", "жапсырма"]],
  ["open_garden", ["open garden", "garden", "skill garden", "сад", "сад навыков", "навыки", "бақ", "дағды бағы", "дағдылар"]],
  ["open_qr", ["open qr", "scan package", "qr", "куар", "кьюар", "скан", "сканер", "пакет", "упаковка", "қаптама", "сканерді аш"]],
  ["open_daily_chest", ["open chest", "daily chest", "chest", "сундук", "ежедневный сундук", "сандық", "күнделікті сандық"]],
  ["open_daily_tasks", ["daily task", "daily tasks", "tasks", "задани", "задачи", "ежедневн", "тапсырма", "күнделікті тапсырма"]],
  ["open_photo_frame", ["photo frame", "фото", "рамка", "фоторамка", "фото бота", "ботамен фото", "сурет", "жақтау", "ботамен сурет"]],
  ["open_leaderboard", ["leaderboard", "leader board", "leaders", "лидер", "көшбасшы", "рейтинг", "таблица лидеров", "көшбасшылар"]],
  ["repeat_instruction", ["repeat", "repeat instruction", "повтори", "повтори инструкцию", "қайтала", "нұсқауды қайтала"]],
  ["read_current_screen", ["read screen", "read this", "what is on screen", "прочитай экран", "что на экране", "экранды оқы", "не көріп тұрмын"]],
  ["show_coins", ["coins", "how many coins", "монеты", "монет", "сколько монет", "тиын", "тиындар", "coin"]],
  ["open_parent_mode", ["parent", "call parent", "родитель", "родительский режим", "ата ана", "ата ана режимі"]],
  ["enable_large_text", ["large text", "turn on large text", "крупный текст", "үлкен мәтін"]],
];

export function matchVoiceCommand(rawTranscript: string): VoiceCommand | null {
  const text = normalizeVoiceTranscript(rawTranscript);
  const hasAny = (...phrases: string[]) => phrases.some((phrase) => text.includes(phrase));

  for (const [command, phrases] of COMMAND_PHRASES) {
    if (hasAny(...phrases)) return command;
  }

  return null;
}
