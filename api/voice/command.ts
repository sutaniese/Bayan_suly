import { extractJsonObject, errorResponse, getGroqConfig, jsonResponse, parseGroqError, postGroqJson } from "../_lib/groq";
import type { VoiceAgentContext, VoiceCommand, VoiceCommandResolution } from "../../shared/voice";
import { matchVoiceCommand } from "../../shared/voice";

export const runtime = "nodejs";

type CommandRequest = {
  transcript?: string;
  context?: VoiceAgentContext;
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let body: CommandRequest;
  try {
    body = (await request.json()) as CommandRequest;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const transcript = body.transcript?.trim();
  const context = body.context;
  if (!transcript || !context) {
    return errorResponse("Missing transcript or context", 400);
  }

  try {
    const { chatModel } = getGroqConfig();
    const allowedCommands = Array.from(new Set(context.allowedCommands));
    const fallback = matchVoiceCommand(transcript);
    const fallbackAction = fallback && allowedCommands.includes(fallback) ? fallback : null;

    const system = [
      "You are Bota Voice Agent for a children's learning app.",
      "Map the user's spoken transcript to exactly one allowed app action or null.",
      "Only use commands from allowedCommands.",
      "Do not invent actions.",
      "Keep replyText short, friendly, and safe for a child.",
      "Return JSON only with shape:",
      '{"action": "allowed_command_or_null", "replyText": "short reply"}',
    ].join(" ");

    const user = JSON.stringify({
      transcript,
      view: context.view,
      language: context.language,
      coins: context.coins,
      screenSummary: context.screenSummary,
      instructionTitle: context.instructionTitle,
      instructionHint: context.instructionHint,
      allowedCommands,
      guidance: {
        repeat_instruction: "Use when user asks to repeat or explain current instructions.",
        read_current_screen: "Use when user asks what is on the screen or to read the current screen.",
        show_coins: "Use when user asks about Bota Coins balance.",
      },
    });

    const response = await postGroqJson("/chat/completions", {
      model: chatModel,
      temperature: 0.1,
      max_tokens: 120,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    if (!response.ok) {
      return jsonResponse(
        {
          action: fallbackAction,
          replyText: fallbackAction ? "Using a simple local voice fallback." : "I could not understand that command.",
          transcript,
          source: "fallback",
          error: await parseGroqError(response),
        } satisfies VoiceCommandResolution & { error: string },
        { status: response.status },
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJsonObject(raw);
    const actionValue = parsed?.action;
    const action =
      typeof actionValue === "string" && allowedCommands.includes(actionValue as VoiceCommand)
        ? (actionValue as VoiceCommand)
        : fallbackAction;
    const replyText =
      typeof parsed?.replyText === "string" && parsed.replyText.trim()
        ? parsed.replyText.trim()
        : action
          ? "Okay."
          : "I could not understand that command.";

    return jsonResponse({
      action,
      replyText,
      transcript,
      source: actionValue === action ? "llm" : "fallback",
    } satisfies VoiceCommandResolution);
  } catch (error) {
    const fallback = matchVoiceCommand(transcript);
    const action = fallback && context.allowedCommands.includes(fallback) ? fallback : null;
    return jsonResponse(
      {
        action,
        replyText: action ? "Using a simple local voice fallback." : "I could not understand that command.",
        transcript,
        source: "fallback",
      } satisfies VoiceCommandResolution,
      { status: 500 },
    );
  }
}
