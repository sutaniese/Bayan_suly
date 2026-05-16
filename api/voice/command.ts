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

function localMatch(raw: string): string | null {
  const t = normalize(raw);
  const has = (...p: string[]) => p.some((w) => t.includes(w));
  if (has("open map", "map", "карта", "открой карту", "картаны аш")) return "open_map";
  if (has("open memory", "memory game", "memor", "almaty", "алматы", "жад ойыны")) return "open_memory_game";
  if (has("open word", "word game", "turkestan", "туркестан", "слова", "сөз ойыны")) return "open_words_game";
  if (has("open math", "math game", "astana", "астана", "математика", "санау ойыны")) return "open_math_game";
  if (has("open pattern", "pattern game", "karaganda", "караганда", "узор")) return "open_patterns_game";
  if (has("open culture", "culture game", "shymkent", "шымкент", "мәдениет")) return "open_culture_game";
  if (has("open rewards", "rewards", "награды", "сыйлық")) return "open_rewards";
  if (has("open album", "album", "альбом", "жинақ")) return "open_album";
  if (has("open garden", "garden", "сад", "бақ")) return "open_garden";
  if (has("open qr", "scan package", "qr", "скан", "пакет")) return "open_qr";
  if (has("open chest", "daily chest", "сундук", "сандық")) return "open_daily_chest";
  if (has("daily task", "задани", "тапсырма", "ежедневн")) return "open_daily_tasks";
  if (has("photo frame", "фото", "рамка", "фото бота", "ботамен фото")) return "open_photo_frame";
  if (has("repeat", "повтори", "қайтала")) return "repeat_instruction";
  if (has("read screen", "read this", "прочитай экран", "экранды оқы")) return "read_current_screen";
  if (has("coins", "монеты", "тиын")) return "show_coins";
  if (has("parent", "родитель", "ата ана")) return "open_parent_mode";
  if (has("large text", "крупный текст", "үлкен мәтін")) return "enable_large_text";
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
