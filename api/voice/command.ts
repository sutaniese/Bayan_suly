export const config = { runtime: "edge" };

const GROQ_API_BASE = "https://api.groq.com/openai/v1";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

const COMMAND_PHRASES: Array<[string, string[]]> = [
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

function localMatch(raw: string): string | null {
  const t = normalize(raw);
  const has = (...p: string[]) => p.some((w) => t.includes(w));
  for (const [command, phrases] of COMMAND_PHRASES) {
    if (has(...phrases)) return command;
  }
  return null;
}

function extractJson(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text.trim()); } catch { /* ignore */ }
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s === -1 || e <= s) return null;
  try { return JSON.parse(text.slice(s, e + 1)); } catch { return null; }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return json({ error: "Server misconfiguration: missing GROQ_API_KEY" }, 500);

  let body: { transcript?: string; context?: Record<string, unknown> };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const transcript = body.transcript?.trim();
  const context = body.context;
  if (!transcript || !context) return json({ error: "Missing transcript or context" }, 400);

  const allowedCommands = Array.isArray(context.allowedCommands) ? context.allowedCommands as string[] : [];
  const fallback = localMatch(transcript);
  const fallbackAction = fallback && allowedCommands.includes(fallback) ? fallback : null;
  if (fallbackAction) {
    return json({ action: fallbackAction, replyText: "Okay.", transcript, source: "fallback" });
  }

  const chatModel = process.env.GROQ_CHAT_MODEL?.trim() || "llama-3.1-8b-instant";

  try {
    const system = [
      "You are Bota Voice Agent for a children's learning app.",
      "Map the user's spoken transcript to exactly one allowed app action or null.",
      "Only use commands from allowedCommands. Do not invent actions.",
      "Keep replyText short, friendly, and safe for a child.",
      'Return JSON only: {"action":"command_or_null","replyText":"short reply"}',
    ].join(" ");

    const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: chatModel,
        temperature: 0.1,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ transcript, ...context }) },
        ],
      }),
    });

    if (!res.ok) {
      return json({ action: fallbackAction, replyText: fallbackAction ? "Okay." : "I could not understand that.", transcript, source: "fallback" });
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(raw);
    const act = typeof parsed?.action === "string" && allowedCommands.includes(parsed.action as string) ? parsed.action as string : fallbackAction;
    const reply = typeof parsed?.replyText === "string" && parsed.replyText.trim() ? parsed.replyText.trim() : act ? "Okay." : "I could not understand that command.";

    return json({ action: act, replyText: reply, transcript, source: parsed?.action === act ? "llm" : "fallback" });
  } catch {
    return json({ action: fallbackAction, replyText: fallbackAction ? "Okay." : "I could not understand that.", transcript, source: "fallback" });
  }
}
