import type { AccessibilitySettings } from "./gameLogic";

type QuestAnswerFeedbackProps = {
  outcome: "correct" | "wrong";
  headline: string;
  detail: string;
  accessibility: AccessibilitySettings;
  onSpeak?: (text: string) => void;
};

/** In-quest correct / try-again feedback: text, icon, layout (not color-only), optional read-aloud — never audio-only. */
export function QuestAnswerFeedback({ outcome, headline, detail, accessibility, onSpeak }: QuestAnswerFeedbackProps) {
  const icon = outcome === "correct" ? "✅" : "💡";
  const motion = !accessibility.reducedAnimations;
  const voiceLine = `${headline} ${detail}`;
  return (
    <div
      role="status"
      data-outcome={outcome}
      className={`multimodal-feedback multimodal-feedback--answer multimodal-feedback--${outcome}${motion ? " multimodal-feedback--motion" : ""}`}
    >
      <span className="multimodal-feedback__icon" aria-hidden>
        {icon}
      </span>
      <div className="multimodal-feedback__body">
        <p className="multimodal-feedback__headline">{headline}</p>
        <p className="multimodal-feedback__detail">{detail}</p>
      </div>
      {accessibility.voiceInstructions && onSpeak ? (
        <button type="button" className="multimodal-feedback__voice" onClick={() => onSpeak(voiceLine)} aria-label="Read feedback aloud">
          🔊
        </button>
      ) : null}
    </div>
  );
}

type RewardEarnedBannerProps = {
  coins: number;
  extraLine?: string;
  accessibility: AccessibilitySettings;
  onSpeak?: (text: string) => void;
};

/** Coin reward: text + 🪙 + optional voice (still paired with visible text). */
export function RewardEarnedBanner({ coins, extraLine, accessibility, onSpeak }: RewardEarnedBannerProps) {
  const motion = !accessibility.reducedAnimations;
  const headline = `You earned ${coins} Bota Coins!`;
  const voiceLine = [headline, extraLine].filter(Boolean).join(" ");
  return (
    <div role="status" className={`multimodal-feedback multimodal-feedback--reward${motion ? " multimodal-feedback--motion" : ""}`}>
      <span className="multimodal-feedback__icon" aria-hidden>
        🪙
      </span>
      <div className="multimodal-feedback__body">
        <p className="multimodal-feedback__headline">{headline}</p>
        {extraLine ? <p className="multimodal-feedback__detail">{extraLine}</p> : null}
      </div>
      {accessibility.voiceInstructions && onSpeak ? (
        <button type="button" className="multimodal-feedback__voice" onClick={() => onSpeak(voiceLine)} aria-label="Read reward aloud">
          🔊
        </button>
      ) : null}
    </div>
  );
}

type GentleNoticeProps = {
  headline: string;
  detail: string;
  accessibility: AccessibilitySettings;
  onSpeak?: (text: string) => void;
};

/** Non-punishing notice (PIN hint, memory mismatch): text + 💡 + optional voice. */
export function GentleNotice({ headline, detail, accessibility, onSpeak }: GentleNoticeProps) {
  const motion = !accessibility.reducedAnimations;
  const voiceLine = `${headline} ${detail}`;
  return (
    <div role="alert" className={`multimodal-feedback multimodal-feedback--notice${motion ? " multimodal-feedback--motion" : ""}`}>
      <span className="multimodal-feedback__icon" aria-hidden>
        💡
      </span>
      <div className="multimodal-feedback__body">
        <p className="multimodal-feedback__headline">{headline}</p>
        <p className="multimodal-feedback__detail">{detail}</p>
      </div>
      {accessibility.voiceInstructions && onSpeak ? (
        <button type="button" className="multimodal-feedback__voice" onClick={() => onSpeak(voiceLine)} aria-label="Read notice aloud">
          🔊
        </button>
      ) : null}
    </div>
  );
}
