import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CORE_LOCATION_IDS,
  STORAGE_KEY,
  DAILY_CHEST_REWARD,
  STICKERS,
  applyDailyChest,
  applyGameAward,
  applyQrItemScan,
  getSessionForDate,
  getUserProfile,
  createMemoryDeck,
  makeMathQuestions,
  makeProfile,
  mathStepHintForQuestion,
  memoryDoubleTapGuardMs,
  memoryFlipBackMs,
  memoryPairCountForSettings,
  memorySpeakCardOnReveal,
  saveUserProfile,
  QR_ITEMS,
  SESSION_ACTIVITY_LABELS,
  SESSION_SKILL_LABELS,
  SKILL_GARDEN,
  buildAccessibilitySettings,
  buildRecommendationSummary,
  getGrowthStage,
  sessionHasLearningActivity,
  skillPracticeSummaryForGame,
  totalSkillProgress,
  wordChoicesForSettings,
} from "./gameLogic";
import type {
  AccessibilitySettings,
  AdaptiveInstruction,
  Age,
  Language,
  LearningSession,
  QrItem,
  SupportNeed,
  UserProfile,
} from "./gameLogic";
import { cancelGroqPlayback, tryPlayGroqSpeech } from "./groqTts";
import { GentleNotice, QuestAnswerFeedback, RewardEarnedBanner } from "./multimodalFeedback";

type VoiceCommand =
  | "open_map"
  | "open_words_game"
  | "open_rewards"
  | "repeat_instruction"
  | "show_coins"
  | "open_parent_mode"
  | "enable_large_text";

type View =
  | "onboarding"
  | "adaptive-profile-result"
  | "map"
  | "memory"
  | "words"
  | "math"
  | "patterns"
  | "culture"
  | "result"
  | "rewards"
  | "daily-chest"
  | "album"
  | "parent-pin"
  | "parent"
  | "accessibility"
  | "qr"
  | "secret"
  | "garden";
type Skill = "memory" | "math" | "language" | "culture" | "logic";

type GameResult = {
  gameId: string;
  title: string;
  score: number;
  coinsEarned: number;
  skill: Skill;
  badge?: string;
  completedAt: string;
  alreadyAwarded: boolean;
  stickersUnlocked: string[];
  skillPracticeSummary: string;
};

type GameResultInput = Omit<GameResult, "coinsEarned" | "completedAt" | "alreadyAwarded" | "stickersUnlocked" | "skillPracticeSummary">;

type Location = {
  id: string;
  title: string;
  city: string;
  gameId?: View;
  skill: string;
  icon: string;
  x: number;
  y: number;
  locked?: boolean;
};

type Reward = {
  id: string;
  title: string;
  cost: number;
  type: "badge" | "coupon" | "qr_bonus";
  description: string;
  code?: string;
  discount?: string;
};

const locations: Location[] = [
  { id: "almaty", city: "Almaty", title: "Collect the Sweets", gameId: "memory", skill: "Memory", icon: "⛰️", x: 69, y: 78 },
  { id: "turkestan", city: "Turkestan", title: "Find the Kazakh Word", gameId: "words", skill: "Kazakh language", icon: "🕌", x: 47, y: 78 },
  { id: "astana", city: "Astana", title: "Counting with Bota", gameId: "math", skill: "Math", icon: "🏛️", x: 58, y: 35 },
  { id: "karaganda", city: "Karaganda", title: "Pattern Caravan", gameId: "patterns", skill: "Logic", icon: "🔷", x: 59, y: 50 },
  { id: "shymkent", city: "Shymkent", title: "Culture Match", gameId: "culture", skill: "Culture", icon: "🎒", x: 43, y: 84 },
  { id: "secret", city: "Secret Location", title: "Package Adventure", skill: "QR reward", icon: "✨", x: 80, y: 56, locked: true },
];

const rewards: Reward[] = [
  { id: "badge", title: "Digital Badge", cost: 50, type: "badge", description: "A bright Bota progress badge." },
  {
    id: "coupon",
    title: "100 KZT Bota Coupon",
    cost: 100,
    type: "coupon",
    description: "Conceptual coupon for Bota products.",
    code: "BOTA-LEARN-100",
    discount: "100 KZT",
  },
  {
    id: "family",
    title: "Family Bonus",
    cost: 250,
    type: "coupon",
    description: "A mock family reward for repeat learning.",
    code: "BOTA-FAMILY-250",
    discount: "Family bonus",
  },
  {
    id: "qr",
    title: "QR Package Reward",
    cost: 0,
    type: "qr_bonus",
    description: "Unlocked after scanning a Bota package.",
    code: "BOTA-QR-SECRET",
    discount: "QR-only",
  },
];

const wordQuestions = [
  { icon: "🐫", prompt: "Camel", answer: "түйе", options: ["түйе", "тау", "су", "алма"], fact: "Түйе means camel." },
  { icon: "⛰️", prompt: "Mountain", answer: "тау", options: ["алма", "тау", "дала", "түйе"], fact: "Тау means mountain." },
  { icon: "🍎", prompt: "Apple", answer: "алма", options: ["су", "алма", "түйе", "дала"], fact: "Алма means apple." },
  { icon: "💧", prompt: "Water", answer: "су", options: ["дала", "су", "тау", "алма"], fact: "Су means water." },
  { icon: "🌾", prompt: "Steppe", answer: "дала", options: ["дала", "алма", "түйе", "тау"], fact: "Дала means steppe." },
];

const getToday = () => new Date().toISOString().slice(0, 10);

const patternQuestions = [
  { sequence: ["🍬", "🍫", "🍬", "🍫", "?"], answer: "🍬", options: ["🍬", "🍭", "🐫"], rule: "The sweets alternate." },
  { sequence: ["1", "2", "4", "7", "?"], answer: "11", options: ["9", "10", "11"], rule: "Add 1, then 2, then 3, then 4." },
  { sequence: ["🔴", "🔵", "🔵", "🔴", "🔵", "🔵", "?"], answer: "🔴", options: ["🔴", "🔵", "🟡"], rule: "One red, then two blue repeats." },
];

const cultureQuestions = [
  { prompt: "Which place is famous for Baiterek?", answer: "Astana", options: ["Astana", "Almaty", "Turkestan"], fact: "Baiterek is a landmark in Astana." },
  { prompt: "Which city is known for mountains nearby?", answer: "Almaty", options: ["Shymkent", "Almaty", "Karaganda"], fact: "Almaty sits near the Ile Alatau mountains." },
  { prompt: "Which city is linked with the Mausoleum of Khoja Ahmed Yasawi?", answer: "Turkestan", options: ["Turkestan", "Astana", "Atyrau"], fact: "Turkestan is one of Kazakhstan's historic cultural centers." },
];

const MEMORY_INSTRUCTION: AdaptiveInstruction = {
  default: "Flip two cards and find every matching pair.",
  simple: "Tap two cards. If they match, they stay open.",
  audioText: "Flip two cards at a time and find every matching pair of sweets.",
};

const WORDS_INSTRUCTION: AdaptiveInstruction = {
  default: "Choose the Kazakh word that matches the picture.",
  simple: "Find the word for this picture.",
  audioText: "Look at the picture and choose the correct Kazakh word.",
};

const MATH_INSTRUCTION: AdaptiveInstruction = {
  default: "Pick the correct answer.",
  simple: "Choose the right answer for the question.",
  audioText: "Read the question and pick the correct answer.",
};

const PATTERN_INSTRUCTION: AdaptiveInstruction = {
  default: "Find what comes next in the pattern.",
  simple: "What comes next in the pattern?",
  audioText: "Look at the pattern and choose what comes next.",
};

const CULTURE_INSTRUCTION: AdaptiveInstruction = {
  default: "Match Kazakhstan places with the right fact.",
  simple: "Pick the right city for the clue.",
  audioText: "Read the clue and choose the matching place in Kazakhstan.",
};

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? getUserProfile() : null;
  } catch {
    return null;
  }
}

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [view, setView] = useState<View>(() => (loadProfile() ? "map" : "onboarding"));
  const [result, setResult] = useState<GameResult | null>(null);
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const gameInstructionRef = useRef<{ title: string; hint: string }>({ title: "", hint: "" });
  const registerGameInstruction = useCallback((info: { title: string; hint: string }) => {
    gameInstructionRef.current = info;
  }, []);

  useEffect(() => {
    if (profile) saveUserProfile(profile);
  }, [profile]);

  const className = useMemo(() => {
    const a = profile?.adaptiveProfile.settings;
    return [
      "app",
      a?.largeText ? "access-large-text" : "",
      a?.largeButtons ? "access-large-buttons large-buttons" : "",
      a?.extraLargeTouchTargets ? "access-extra-large-touch" : "",
      a?.highContrast ? "access-high-contrast high-contrast" : "",
      a?.reducedAnimations ? "access-reduced-motion reduced-motion" : "",
      a?.simplifiedVisuals ? "access-simplified-visuals" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [profile]);

  const awardGame = (
    game: GameResultInput,
    baseCoins = 20,
    bonus = 10,
    stickerId?: string,
  ) => {
    if (!profile) return;
    const award = applyGameAward(profile, game.gameId, game.badge, baseCoins, bonus, stickerId);
    const nextProfile = {
      ...award.profile,
      unlockedStickers: Array.from(new Set([...award.profile.unlockedStickers, "sticker-bota"])),
    };
    const prevStickers = new Set(profile.unlockedStickers);
    const stickersUnlocked = nextProfile.unlockedStickers.filter((id) => !prevStickers.has(id));
    const nextResult = {
      ...game,
      coinsEarned: award.coinsEarned,
      completedAt: new Date().toISOString(),
      alreadyAwarded: award.alreadyAwarded,
      stickersUnlocked,
      skillPracticeSummary: skillPracticeSummaryForGame(game.gameId),
    };
    setProfile(nextProfile);
    setResult(nextResult);
    setView("result");
  };

  const scanQrItem = (itemId: string) => {
    if (!profile) return;
    const item = QR_ITEMS.find((entry) => entry.id === itemId);
    if (!item) return;
    const result = applyQrItemScan(profile, item);
    setProfile(result.profile);
    setQrMessage(result.alreadyScanned ? `${item.productName} already collected.` : item.unlockMessage);
  };

  const resetProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setResult(null);
    setView("onboarding");
  };

  const openDailyChest = () => {
    if (!profile) return;
    const update = applyDailyChest(profile, getToday());
    setProfile(update.profile);
  };

  const speak = useCallback(
    (text: string) => {
      const groqKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
      const runBrowser = () => {
        cancelGroqPlayback();
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const lang = profile?.language === "kz" ? "kk-KZ" : "ru-RU";
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
      };
      if (groqKey) {
        void tryPlayGroqSpeech(text, groqKey, profile?.language ?? "ru").then((ok) => {
          if (!ok) runBrowser();
        });
        return;
      }
      runBrowser();
    },
    [profile?.language],
  );

  const showChildHub =
    Boolean(profile) &&
    (view === "map" ||
      view === "album" ||
      view === "garden" ||
      view === "rewards" ||
      view === "qr" ||
      view === "daily-chest");

  return (
    <main className={className}>
      <div className={`phone ${showChildHub ? "phone--with-hub" : ""}`}>
        <div className="phone-body">
          {profile && view !== "onboarding" && (
            <TopBar profile={profile} onMap={() => setView("map")} onRewards={() => setView("rewards")} onParent={() => setView("parent-pin")} />
          )}
          {view === "onboarding" && <Onboarding onStart={(next) => { setProfile(next); setView("adaptive-profile-result"); }} />}
          {profile && view === "adaptive-profile-result" && <AdaptiveProfileResult profile={profile} onContinue={() => setView("map")} />}
          {profile && view === "map" && <MapScreen profile={profile} onGo={setView} />}
          {profile && view === "garden" && <SkillGarden profile={profile} onBack={() => setView("map")} />}
          {profile && view === "memory" && (
            <MemoryGame
              language={profile.language}
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={() =>
                awardGame({ gameId: "memory", title: "Collect the Sweets", score: 100, skill: "memory", badge: "Memory Master" }, 20, 10, "sticker-almaty-mountains")
              }
              onSpeak={speak}
            />
          )}
          {profile && view === "words" && (
            <WordsGame
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={(score) =>
                awardGame({ gameId: "words", title: "Find the Kazakh Word", score, skill: "language", badge: "Kazakh Word Explorer" }, 20, score === 100 ? 10 : 0, "sticker-turkestan")
              }
              onSpeak={speak}
            />
          )}
          {profile && view === "math" && (
            <MathGame
              age={profile.age}
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={(score) =>
                awardGame({ gameId: "math", title: "Counting with Bota", score, skill: "math", badge: "Young Mathematician" }, 20, score >= 80 ? 10 : 0, "sticker-baiterek")
              }
              onSpeak={speak}
            />
          )}
          {profile && view === "patterns" && (
            <PatternGame
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={(score) => awardGame({ gameId: "patterns", title: "Pattern Caravan", score, skill: "logic", badge: "Pattern Pathfinder" }, 20, score === 100 ? 10 : 0)}
              onSpeak={speak}
            />
          )}
          {profile && view === "culture" && (
            <CultureGame
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={(score) => awardGame({ gameId: "culture", title: "Culture Match", score, skill: "culture", badge: "Culture Explorer" }, 20, score === 100 ? 10 : 0)}
              onSpeak={speak}
            />
          )}
          {profile && view === "result" && result && (
            <ResultScreen
              result={result}
              accessibility={profile.adaptiveProfile.settings}
              onSpeak={speak}
              onMap={() => setView("map")}
              onRewards={() => setView("rewards")}
              onAlbum={() => setView("album")}
              onGarden={() => setView("garden")}
            />
          )}
          {profile && view === "rewards" && <RewardsShop profile={profile} onMap={() => setView("map")} onAlbum={() => setView("album")} onParent={() => setView("parent-pin")} />}
          {profile && view === "daily-chest" && <DailyChest profile={profile} onOpen={openDailyChest} onBack={() => setView("map")} onSpeak={speak} />}
          {profile && view === "album" && <StickerAlbum profile={profile} onBack={() => setView("map")} />}
          {profile && view === "parent-pin" && (
            <ParentPin accessibility={profile.adaptiveProfile.settings} onSpeak={speak} onSuccess={() => setView("parent")} />
          )}
          {profile && view === "parent" && (
            <ParentDashboard
              profile={profile}
              onAlbum={() => setView("album")}
              onGarden={() => setView("garden")}
              onSettings={() => setView("accessibility")}
              onQr={() => setView("qr")}
              onReset={resetProgress}
            />
          )}
          {profile && view === "accessibility" && <AccessibilityPanel profile={profile} onChange={setProfile} onBack={() => setView("parent")} />}
          {profile && view === "qr" && <QrCollection profile={profile} items={QR_ITEMS} message={qrMessage} onScan={scanQrItem} onSecret={() => setView("secret")} />}
          {profile && view === "secret" && <SecretLocation onMap={() => setView("map")} />}
        </div>
        {showChildHub && <ChildHubNav active={view as HubTabView} onGo={setView} onParent={() => setView("parent-pin")} />}
        {profile && (
          <BotaVoiceGuide
            profile={profile}
            view={view}
            showChildHub={showChildHub}
            lastInstructionRef={gameInstructionRef}
            speak={speak}
            setView={setView}
            setProfile={setProfile}
          />
        )}
      </div>
    </main>
  );
}

function BotaVoiceGuide({
  profile,
  view,
  showChildHub,
  lastInstructionRef,
  speak,
  setView,
  setProfile,
}: {
  profile: UserProfile;
  view: View;
  showChildHub: boolean;
  lastInstructionRef: React.MutableRefObject<{ title: string; hint: string }>;
  speak: (text: string) => void;
  setView: (v: View) => void;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}) {
  const [open, setOpen] = useState(false);
  const [coinFlash, setCoinFlash] = useState<string | null>(null);
  const settings = profile.adaptiveProfile.settings;
  const enabled = settings.botaVoiceGuide || settings.voiceInstructions;
  const hidden =
    view === "onboarding" ||
    view === "adaptive-profile-result" ||
    view === "parent-pin" ||
    view === "parent" ||
    view === "accessibility";
  if (!enabled || hidden) return null;

  const confirmIfVoice = (phrase: string) => {
    if (settings.voiceInstructions) speak(phrase);
  };

  const run = (cmd: VoiceCommand) => {
    switch (cmd) {
      case "open_map":
        setView("map");
        confirmIfVoice("Opening the map.");
        break;
      case "open_words_game":
        setView("words");
        confirmIfVoice("Opening Find the Kazakh Word.");
        break;
      case "open_rewards":
        setView("rewards");
        confirmIfVoice("Opening rewards.");
        break;
      case "repeat_instruction": {
        const { hint, title } = lastInstructionRef.current;
        const line = hint ? `${title ? `${title}. ` : ""}${hint}` : "Pick a quest on the map to hear a game instruction.";
        speak(line);
        break;
      }
      case "show_coins": {
        const n = profile.coins;
        speak(`You have ${n} Bota Coins.`);
        setCoinFlash(`🪙 ${n} Bota Coins`);
        window.setTimeout(() => setCoinFlash(null), 4500);
        break;
      }
      case "open_parent_mode":
        setView("parent-pin");
        confirmIfVoice("Opening parent mode. A grown-up will need the PIN.");
        break;
      case "enable_large_text":
        setProfile((p) => {
          if (!p) return p;
          return {
            ...p,
            adaptiveProfile: {
              ...p.adaptiveProfile,
              settings: { ...p.adaptiveProfile.settings, largeText: true },
            },
          };
        });
        confirmIfVoice("Large text is on.");
        break;
      default:
        break;
    }
    setOpen(false);
  };

  const chips: { cmd: VoiceCommand; label: string }[] = [
    { cmd: "open_map", label: "Open map" },
    { cmd: "open_words_game", label: "Open word game" },
    { cmd: "open_rewards", label: "Open rewards" },
    { cmd: "repeat_instruction", label: "Repeat instruction" },
    { cmd: "show_coins", label: "How many coins?" },
    { cmd: "open_parent_mode", label: "Call parent" },
    { cmd: "enable_large_text", label: "Turn on large text" },
  ];

  return (
    <div className={`voice-guide-root ${showChildHub ? "voice-guide-root--hub" : ""}`}>
      {open && (
        <div className="voice-guide-panel" id="voice-guide-panel" role="dialog" aria-label="Bota Voice Guide">
          <div className="voice-guide-panel-head">
            <strong>Bota Voice Guide</strong>
            <button type="button" className="voice-guide-close" onClick={() => setOpen(false)} aria-label="Close voice guide">
              ✕
            </button>
          </div>
          <p className="voice-guide-lead">Tap a command. Everything works with buttons — voice is optional.</p>
          <div className="voice-guide-chips">
            {chips.map(({ cmd, label }) => (
              <button key={cmd} type="button" className="voice-guide-chip" onClick={() => run(cmd)}>
                {label}
              </button>
            ))}
          </div>
          {coinFlash && <p className="voice-guide-status" role="status">{coinFlash}</p>}
        </div>
      )}
      <button
        type="button"
        className="voice-guide-fab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="voice-guide-panel"
        aria-label="Open Bota Voice Guide"
      >
        🐫
      </button>
    </div>
  );
}

function TopBar({ profile, onMap, onRewards, onParent }: { profile: UserProfile; onMap: () => void; onRewards: () => void; onParent: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-button" onClick={onMap} aria-label="Map">🗺️</button>
      <div className="brand-lockup">
        <strong>Bota Quest</strong>
        <span>🪙 {profile.coins} coins</span>
      </div>
      <div className="top-actions">
        <button className="icon-button" onClick={onRewards} aria-label="Rewards">🎁</button>
        <button className="icon-button" onClick={onParent} aria-label="Parent mode">🔒</button>
      </div>
    </header>
  );
}

type HubTabView = "map" | "album" | "garden" | "rewards" | "qr" | "daily-chest";

function ChildHubNav({ active, onGo, onParent }: { active: HubTabView; onGo: (view: View) => void; onParent: () => void }) {
  const tabs: { view: HubTabView; icon: string; label: string }[] = [
    { view: "map", icon: "🗺️", label: "Map" },
    { view: "album", icon: "📔", label: "Album" },
    { view: "garden", icon: "🌱", label: "Garden" },
    { view: "rewards", icon: "🎁", label: "Rewards" },
    { view: "qr", icon: "📦", label: "QR" },
    { view: "daily-chest", icon: "🧰", label: "Chest" },
  ];
  return (
    <nav className="child-hub-nav" aria-label="Quick navigation">
      <div className="child-hub-nav-scroll">
        {tabs.map((tab) => (
          <button
            key={tab.view}
            type="button"
            className={`hub-nav-item ${active === tab.view ? "is-active" : ""}`}
            aria-current={active === tab.view ? "page" : undefined}
            onClick={() => onGo(tab.view)}
          >
            <span className="hub-nav-icon" aria-hidden>{tab.icon}</span>
            <span className="hub-nav-label">{tab.label}</span>
          </button>
        ))}
        <button type="button" className="hub-nav-item hub-nav-item--parent" onClick={onParent} aria-label="Parent mode (PIN required)">
          <span className="hub-nav-icon" aria-hidden>🔒</span>
          <span className="hub-nav-label">Parent</span>
        </button>
      </div>
    </nav>
  );
}

function Onboarding({ onStart }: { onStart: (profile: UserProfile) => void }) {
  type Step = "profile" | "comfort";
  const [step, setStep] = useState<Step>("profile");
  const [name, setName] = useState("Amina");
  const [age, setAge] = useState<Age>(8);
  const [language, setLanguage] = useState<Language>("kz");
  const [supportNeeds, setSupportNeeds] = useState<SupportNeed[]>(["standard"]);
  const [showMockRecommendation, setShowMockRecommendation] = useState(false);
  const [mockProcessing, setMockProcessing] = useState(false);

  const normalizedNeeds = useMemo(() => {
    const needs = supportNeeds.length ? supportNeeds : (["standard"] as SupportNeed[]);
    const uniq = Array.from(new Set(needs));
    return uniq.length ? uniq : (["standard"] as SupportNeed[]);
  }, [supportNeeds]);

  const toggleNeed = (need: SupportNeed) => {
    setSupportNeeds((prev) => {
      const set = new Set(prev);
      if (need === "standard") return ["standard"];
      if (set.has(need)) set.delete(need);
      else set.add(need);
      set.delete("standard");
      const next = Array.from(set) as SupportNeed[];
      return next.length ? next : ["standard"];
    });
  };

  const startWithNeeds = (needs: SupportNeed[], setupSource: "manual" | "default" | "mock_document") => {
    const base = makeProfile(name.trim() || "Bota Friend", age, language);
    const cleanNeeds = needs.length ? needs : (["standard"] as SupportNeed[]);
    const settings = buildAccessibilitySettings(cleanNeeds);
    const recommendationSummary = buildRecommendationSummary(cleanNeeds, settings);
    onStart({
      ...base,
      adaptiveProfile: {
        ...base.adaptiveProfile,
        supportNeeds: cleanNeeds,
        setupSource,
        settings,
        recommendationSummary,
      },
    });
  };

  const useSampleRecommendation = () => {
    if (mockProcessing) return;
    setMockProcessing(true);
    window.setTimeout(() => {
      setMockProcessing(false);
      startWithNeeds(["vision", "focus"], "mock_document");
    }, 1000);
  };

  const nextFromProfile = (event: FormEvent) => {
    event.preventDefault();
    setStep("comfort");
  };

  return (
    <section className="screen hero-screen">
      <div className="mascot">🐫</div>
      <h1>Bota Quest</h1>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>
          Hi there! I'm <strong>Bota the Camel</strong>! Let's explore Kazakhstan together, play fun learning games, and earn shiny coins!
        </p>
      </div>
      {step === "profile" ? (
        <form className="panel" onSubmit={nextFromProfile}>
          <label>
            What's your name?
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Type your name..." />
          </label>
          <label>
            How old are you?
            <select value={age} onChange={(event) => setAge(Number(event.target.value) as Age)}>
              {[7, 8, 9, 10, 11].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Pick your language</legend>
            <div className="segmented">
              <button type="button" className={language === "kz" ? "active" : ""} onClick={() => setLanguage("kz")}>
                Қазақша
              </button>
              <button type="button" className={language === "ru" ? "active" : ""} onClick={() => setLanguage("ru")}>
                Русский
              </button>
            </div>
          </fieldset>
          <div className="cta-row">
            <button className="primary" type="submit">
              Next: Comfort setup
            </button>
            <button type="button" onClick={() => startWithNeeds(["standard"], "default")}>
              Skip for now
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="eyebrow">Learning Comfort Setup</p>
          <h2>Make Botara comfortable for your child</h2>
          <p className="lead">Choose how the app should adapt. You can change this later in Parent Mode.</p>

          {(() => {
            const settings = buildAccessibilitySettings(normalizedNeeds);
            const summary = buildRecommendationSummary(normalizedNeeds, settings);
            if (!summary.length) return null;
            return (
              <div className="panel">
                <strong>What will change</strong>
                <ul className="recommendation-list">
                  {summary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            );
          })()}

          <div className="support-grid" role="group" aria-label="Support needs">
            {(
              [
                ["vision", "Better visibility", "Larger text, high contrast, voice instructions, and fewer small details."],
                ["hearing", "Text instead of sound", "Subtitles, visual feedback, and no audio-only tasks."],
                ["motor", "Easier touch controls", "Bigger buttons, no drag-only actions, and optional gesture answers."],
                ["focus", "Calm focus mode", "No timer, fewer animations, simpler instructions, and one task at a time."],
                ["standard", "Standard mode", "Use the regular Bota Quest experience."],
              ] as const
            ).map(([key, title, description]) => {
              const selected = normalizedNeeds.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`support-card ${selected ? "is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => toggleNeed(key)}
                >
                  <div className="support-card-top">
                    <strong>{title}</strong>
                    <span className="support-card-state">{selected ? "Selected" : "Tap to select"}</span>
                  </div>
                  <p>{description}</p>
                </button>
              );
            })}
          </div>

          <div className="cta-row">
            <button className="primary" type="button" onClick={() => startWithNeeds(normalizedNeeds, "manual")}>
              Create adaptive profile
            </button>
            <button type="button" onClick={() => startWithNeeds(["standard"], "default")}>
              Skip for now
            </button>
          </div>

          <button type="button" onClick={() => setShowMockRecommendation((v) => !v)} aria-expanded={showMockRecommendation}>
            Optional recommendation
          </button>

          {showMockRecommendation && (
            <div className="panel" aria-live="polite">
              <strong>Optional recommendation</strong>
              <p className="lead">
                In the future, Botara could use a specialist recommendation to suggest accessibility settings. For this MVP, uploaded files are not stored
                or processed.
              </p>
              {mockProcessing ? <p className="status">Using sample recommendation…</p> : null}
              <div className="cta-row">
                <button className="primary" type="button" onClick={useSampleRecommendation} disabled={mockProcessing}>
                  Use sample recommendation
                </button>
                <button type="button" onClick={() => setShowMockRecommendation(false)} disabled={mockProcessing}>
                  Continue with manual setup
                </button>
                <button type="button" onClick={() => setShowMockRecommendation(false)} disabled={mockProcessing}>
                  Skip
                </button>
              </div>
            </div>
          )}

          <button type="button" onClick={() => setStep("profile")}>
            ← Back
          </button>
        </>
      )}
    </section>
  );
}

function AdaptiveProfileResult({ profile, onContinue }: { profile: UserProfile; onContinue: () => void }) {
  const needs = profile.adaptiveProfile.supportNeeds;
  const settings = profile.adaptiveProfile.settings;
  const summary = profile.adaptiveProfile.recommendationSummary;

  const needLabels: Record<SupportNeed, string> = {
    vision: "Better visibility",
    hearing: "Text instead of sound",
    motor: "Easier touch controls",
    focus: "Calm focus mode",
    standard: "Standard mode",
  };

  const selectedNeedsText = needs.length ? needs.map((n) => needLabels[n] ?? n).join(" · ") : "Standard mode";

  const enabledSettings = [
    settings.largeText ? "Large text" : null,
    settings.largeButtons ? "Large buttons" : null,
    settings.highContrast ? "High contrast" : null,
    settings.textHints ? "Text hints" : null,
    settings.subtitles ? "Subtitles" : null,
    settings.voiceInstructions ? "Voice instructions" : null,
    settings.noTimer ? "No timer" : null,
    settings.reducedAnimations ? "Reduced animations" : null,
    settings.gestureAnswerMode ? "Gesture Answer Mode (mock)" : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <section className="screen center">
      <p className="eyebrow">Adaptive profile</p>
      <h2>Botara is ready for {profile.name}.</h2>
      <p className="lead">We adjusted the app to make learning more comfortable. You can change these settings anytime in Parent Mode.</p>

      <div className="panel adaptive-result-panel">
        <strong>Selected support needs</strong>
        <p className="adaptive-result-needs">{selectedNeedsText}</p>

        {summary.length > 0 && (
          <>
            <strong>What will change</strong>
            <ul className="recommendation-list">
              {summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        )}

        {enabledSettings.length > 0 && (
          <>
            <strong>Enabled settings</strong>
            <div className="pill-row" aria-label="Enabled settings">
              {enabledSettings.map((label) => (
                <span key={label} className="pill">
                  {label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <button className="primary" onClick={onContinue}>
        Continue to the map 🗺️
      </button>
    </section>
  );
}

function MapScreen({ profile, onGo }: { profile: UserProfile; onGo: (view: View) => void }) {
  const completedCount = locations.filter((location) => location.gameId && profile.completedGames.includes(location.gameId)).length;
  const nextQuest = locations.find((location) => location.gameId && !profile.completedGames.includes(location.gameId));
  const today = getToday();
  const chestOpened = profile.openedDailyChestDates.includes(today);
  return (
    <section className="screen map-screen">
      <div className="map-hero">
        <div>
          <p className="eyebrow">Quest Map</p>
          <h2>Where to next, {profile.name}?</h2>
          <p className="lead">Each city has a learning quest waiting for you. Complete them all to become a Bota Champion!</p>
        </div>
        <div className="progress-card">
          <span>{completedCount}/{CORE_LOCATION_IDS.length}</span>
          <strong>quests complete</strong>
        </div>
      </div>
      <div className="desktop-map-layout">
        <div className="kazakhstan-map" aria-label="Interactive Kazakhstan quest map">
          <img className="real-map" src="/assets/kazakhstan-map.svg" alt="Map of Kazakhstan" />
          {locations.map((location) => {
            const unlocked = profile.unlockedLocations.includes(location.id);
            const completed = location.gameId ? profile.completedGames.includes(location.gameId) : false;
            return (
              <button
                key={location.id}
                className={`map-pin location-${location.id} ${unlocked ? "" : "locked"} ${completed ? "completed" : ""}`}
                disabled={!unlocked}
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
                onClick={() => location.gameId ? onGo(location.gameId) : onGo("secret")}
                aria-label={`${location.city}: ${location.title}`}
              >
                <span className="pin-icon">{completed ? "✓" : unlocked ? location.icon : "🔒"}</span>
                <span className="pin-label">
                  <strong>{location.city}</strong>
                  <small>{location.title}</small>
                  <em>{completed ? "Completed" : unlocked ? location.skill : "Scan package"}</em>
                </span>
              </button>
            );
          })}
          <p className="map-credit">Map: Wikimedia Commons, Incall, CC BY-SA 4.0</p>
        </div>
        <aside className="quest-panel">
          <div className="guide-card">
            <div className="guide-avatar">🐫</div>
            <div>
              <p>{nextQuest ? "Tap a city on the map to start a quest!" : "Wow, you finished all city quests!"}</p>
              <strong>{nextQuest ? `Try next: ${nextQuest.city}` : "🎉 All city quests complete!"}</strong>
            </div>
          </div>
          <div className="quest-list">
            {locations.map((location) => {
              const unlocked = profile.unlockedLocations.includes(location.id);
              const completed = location.gameId ? profile.completedGames.includes(location.gameId) : false;
              return (
                <button key={location.id} className={`quest-row ${completed ? "completed" : ""}`} disabled={!unlocked} onClick={() => location.gameId ? onGo(location.gameId) : onGo("secret")}>
                  <span>{completed ? "✓" : unlocked ? location.icon : "🔒"}</span>
                  <strong>{location.city}</strong>
                  <small>{location.title}</small>
                </button>
              );
            })}
          </div>
          <div className="daily-chest-card">
            <div className="daily-chest-icon">🧰</div>
            <div className="daily-chest-content">
              <p className="eyebrow">Daily Chest • Күнделікті сандық</p>
              <h3>{chestOpened ? "Chest opened today" : "Open today's chest"}</h3>
              <p className="daily-caption">
                {chestOpened
                  ? `Come back tomorrow for more Bota Coins and a Kazakhstan fact.`
                  : `Earn +${DAILY_CHEST_REWARD.coins} coins and learn a Kazakhstan fact today.`}
              </p>
              <div className={`daily-status ${chestOpened ? "opened" : "ready"}`}>
                {chestOpened ? "Opened" : "Ready to open"}
              </div>
            </div>
            <button className="primary" onClick={() => onGo("daily-chest")}>
              {chestOpened ? "See reward" : "Open chest"}
            </button>
          </div>
          <div className="cta-row">
            <button onClick={() => onGo("garden")}>🌱 Skill Garden</button>
            <button onClick={() => onGo("album")}>📔 Sticker Album</button>
            <button onClick={() => onGo("qr")}>📦 Package Collection</button>
            <button onClick={() => onGo("rewards")}>🎁 Rewards</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SkillGarden({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const sp = profile.skillProgress;
  const total = totalSkillProgress(sp);
  const gardenSticker = profile.unlockedStickers.includes("sticker-skill-garden");
  return (
    <section className="screen skill-garden-screen">
      <p className="eyebrow">My Skill Garden</p>
      <h2>Watch your skills grow 🌱</h2>
      <p className="lead">Each quest waters a different plant. Play games, open the daily chest, and scan packages to help them grow!</p>
      <div className="skill-garden-total">
        <strong>Total learning points: {total}</strong>
        <small>
          {gardenSticker
            ? "You earned the Skill Garden sticker — check your album!"
            : `${Math.max(0, 100 - total)} more points until the Skill Garden sticker unlocks.`}
        </small>
        <div className="skill-bar large" role="progressbar" aria-valuenow={Math.min(100, total)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.min(100, total)}%` }} />
        </div>
        <p className="skill-garden-caption">Points add up from Memory, Math, Kazakh Words, and Culture (each skill can grow up to 100%).</p>
      </div>
      <div className="skill-garden-grid">
        {SKILL_GARDEN.map((entry) => {
          const value = sp[entry.skill];
          return (
            <article key={entry.skill} className="skill-plant-card">
              <div className="skill-plant-top">
                <span className="skill-plant-icon">{entry.visual}</span>
                <div>
                  <h3>{entry.label}</h3>
                  <p className="skill-stage">{getGrowthStage(value)}</p>
                </div>
              </div>
              <p className="skill-plant-desc">{entry.description}</p>
              <div className="skill-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${value}%` }} />
              </div>
              <p className="skill-percent">{value}%</p>
            </article>
          );
        })}
      </div>
      {gardenSticker && (
        <div className="garden-unlocked-banner">
          🌱 <strong>Skill Garden sticker</strong> is waiting in your sticker album.
        </div>
      )}
      <button className="primary" onClick={onBack}>
        ← Back to Map
      </button>
    </section>
  );
}

function DailyChest({
  profile,
  onOpen,
  onBack,
  onSpeak,
}: {
  profile: UserProfile;
  onOpen: () => void;
  onBack: () => void;
  onSpeak: (text: string) => void;
}) {
  const today = getToday();
  const opened = profile.openedDailyChestDates.includes(today);
  const reward = DAILY_CHEST_REWARD;
  const rewardSticker = reward.stickerId ? STICKERS.find((sticker) => sticker.id === reward.stickerId) : null;

  return (
    <section className="screen center daily-chest-screen">
      <div className="daily-chest-hero">
        <div className={`daily-chest-icon ${opened ? "opened" : ""}`}>🧰</div>
        <p className="eyebrow">Daily Chest • Күнделікті сандық</p>
        <h2>{opened ? "Today's chest is open!" : "Open today's chest"}</h2>
        <p className="lead">
          {opened
            ? "Come back tomorrow for another warm surprise."
            : `Earn +${reward.coins} Bota Coins and learn something new about Kazakhstan.`}
        </p>
      </div>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>{opened ? "Great job! Here's your reward and a fun fact for today." : "Tap the button and I'll open the chest with you!"}</p>
      </div>
      {opened ? (
        <>
          <div className="daily-reward">
            <RewardEarnedBanner
              coins={reward.coins}
              extraLine={rewardSticker ? `Plus a sticker: ${rewardSticker.title}.` : "Keep collecting facts about Kazakhstan."}
              accessibility={profile.adaptiveProfile.settings}
              onSpeak={onSpeak}
            />
            {rewardSticker && (
              <div className="sticker-pill">{rewardSticker.imageEmoji} {rewardSticker.title}</div>
            )}
          </div>
          <div className="fact-card">
            <strong>Kazakhstan fact</strong>
            <p>{reward.fact}</p>
          </div>
          {profile.adaptiveProfile.settings.voiceInstructions && (
            <button onClick={() => onSpeak(reward.fact)}>🔊 Read fact aloud</button>
          )}
          {profile.adaptiveProfile.settings.textHints && (
            <p className="hint">You can open one chest per day. Come back tomorrow for another fact.</p>
          )}
        </>
      ) : (
        <>
          {profile.adaptiveProfile.settings.textHints && (
            <p className="hint">Daily chests give small rewards without streak pressure.</p>
          )}
          {profile.adaptiveProfile.settings.voiceInstructions && (
            <button onClick={() => onSpeak(`Open today's chest for ${reward.coins} coins and a Kazakhstan fact.`)}>🔊 Read aloud</button>
          )}
          <button className="primary" onClick={onOpen}>Open chest 🎁</button>
        </>
      )}
      <button onClick={onBack}>Back to Map</button>
    </section>
  );
}

function StickerAlbum({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const unlockedSet = new Set(profile.unlockedStickers);
  const unlockedCount = profile.unlockedStickers.length;
  const activeSticker = activeId ? STICKERS.find((sticker) => sticker.id === activeId) : null;
  const activeUnlocked = activeSticker ? unlockedSet.has(activeSticker.id) : false;
  const detailText = activeSticker
    ? activeUnlocked
      ? activeSticker.description
      : "Keep playing quests to unlock this sticker."
    : "Tap a sticker to see its story.";

  return (
    <section className="screen album-screen">
      <p className="eyebrow">My Kazakhstan Album</p>
      <h2>My Kazakhstan Album</h2>
      <p className="lead">Collect stickers by exploring cities, opening the daily chest, and scanning packages.</p>
      <div className="album-progress">{unlockedCount}/{STICKERS.length} stickers collected</div>
      <div className="album-grid">
        {STICKERS.map((sticker) => {
          const unlocked = unlockedSet.has(sticker.id);
          return (
            <button
              key={sticker.id}
              className={`sticker-card ${unlocked ? "unlocked" : "locked"}`}
              onClick={() => setActiveId(sticker.id)}
            >
              <span className="sticker-emoji">{unlocked ? sticker.imageEmoji : "❔"}</span>
              <span className="sticker-title">{unlocked ? sticker.title : "Locked"}</span>
            </button>
          );
        })}
      </div>
      <div className="sticker-detail">
        <strong>{activeSticker ? activeSticker.title : "Sticker details"}</strong>
        <p>{detailText}</p>
      </div>
      <button className="primary" onClick={onBack}>Back to Map</button>
    </section>
  );
}

const MEMORY_CARD_VOICE: Record<string, { ru: string; kz: string }> = {
  "🍬": { ru: "конфета", kz: "қант" },
  "🍫": { ru: "шоколад", kz: "шоколад" },
  "🍭": { ru: "леденец", kz: "тәтті сағыз" },
  "🐫": { ru: "верблюд", kz: "түйе" },
};

function MemoryGame({
  language,
  accessibility,
  onDone,
  onSpeak,
  onRegisterInstruction,
}: {
  language: Language;
  accessibility: AccessibilitySettings;
  onDone: () => void;
  onSpeak: (text: string) => void;
  onRegisterInstruction?: (info: { title: string; hint: string }) => void;
}) {
  const pairCount = memoryPairCountForSettings(accessibility);
  const deck = useMemo(() => createMemoryDeck(pairCount), [pairCount]);
  const flipMs = memoryFlipBackMs(accessibility);
  const speakOnReveal = memorySpeakCardOnReveal(accessibility);
  const doubleTapGuardMs = memoryDoubleTapGuardMs(accessibility);
  const lastTapRef = useRef<{ index: number; t: number }>({ index: -1, t: 0 });

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [mismatchFlash, setMismatchFlash] = useState(false);

  const largeCards = accessibility.largeText || accessibility.extraLargeTouchTargets || accessibility.largeButtons;

  useEffect(() => {
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setMismatchFlash(false);
  }, [pairCount]);

  useEffect(() => {
    if (flipped.length !== 2) {
      if (flipped.length === 0) setMismatchFlash(false);
      return;
    }
    const [a, b] = flipped;
    setMismatchFlash(deck[a] !== deck[b]);
  }, [flipped, deck]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    setMoves((value) => value + 1);
    const [a, b] = flipped;
    if (deck[a] === deck[b]) setMatched((value) => [...value, a, b]);
    window.setTimeout(() => setFlipped([]), flipMs);
  }, [flipped, deck, flipMs]);

  useEffect(() => {
    if (matched.length === deck.length && deck.length > 0) onDone();
  }, [matched, deck, onDone]);

  const tapCard = (index: number) => {
    const visible = flipped.includes(index) || matched.includes(index);
    if (visible || flipped.length === 2) return;
    if (flipped.includes(index)) return;
    const now = Date.now();
    if (doubleTapGuardMs > 0 && lastTapRef.current.index === index && now - lastTapRef.current.t < doubleTapGuardMs) return;
    lastTapRef.current = { index, t: now };
    if (speakOnReveal) {
      const sym = deck[index];
      const labels = MEMORY_CARD_VOICE[sym];
      const line = labels ? (language === "kz" ? labels.kz : labels.ru) : sym;
      queueMicrotask(() => onSpeak(line));
    }
    setFlipped((prev) => [...prev, index]);
  };

  const gridPairsClass = pairCount === 2 ? "memory-grid--pairs2" : pairCount === 3 ? "memory-grid--pairs3" : "memory-grid--pairs4";

  return (
    <GameShell
      title="Collect the Sweets"
      instruction={MEMORY_INSTRUCTION}
      accessibility={accessibility}
      onSpeak={onSpeak}
      onRegisterInstruction={onRegisterInstruction}
    >
      <div className={`memory-grid ${gridPairsClass}${largeCards ? " memory-grid--large-cards" : ""}`}>
        {deck.map((card, index) => {
          const visible = flipped.includes(index) || matched.includes(index);
          return (
            <button
              key={`${card}-${index}`}
              type="button"
              className={`memory-card${largeCards ? " memory-card--boost" : ""}${accessibility.reducedAnimations ? " memory-card--calm" : ""}`}
              disabled={visible || flipped.length === 2}
              onClick={() => tapCard(index)}
            >
              {visible ? card : "?"}
            </button>
          );
        })}
      </div>
      {mismatchFlash ? (
        <GentleNotice
          accessibility={accessibility}
          onSpeak={onSpeak}
          headline="Different cards"
          detail="No worries — they flip back so you can try another pair."
        />
      ) : null}
      <p className="status">
        🎯 Moves: {moves} · Matches: {matched.length / 2}/{pairCount}
      </p>
    </GameShell>
  );
}

function WordsGame({
  accessibility,
  onDone,
  onSpeak,
  onRegisterInstruction,
}: {
  accessibility: AccessibilitySettings;
  onDone: (score: number) => void;
  onSpeak: (text: string) => void;
  onRegisterInstruction?: (info: { title: string; hint: string }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [active, setActive] = useState(0);
  const [lastOk, setLastOk] = useState<boolean | null>(null);
  const question = wordQuestions[index];

  const options = useMemo(
    () => wordChoicesForSettings(wordQuestions[index].options, wordQuestions[index].answer, accessibility),
    [index, accessibility.fewerAnswerOptions],
  );

  const readOptionAloud = accessibility.voiceInstructions && (accessibility.largeText || accessibility.highContrast);
  const hearingText = accessibility.subtitles || accessibility.textHints;

  useEffect(() => {
    setActive(0);
  }, [index, options.length]);

  const answer = (option: string) => {
    const ok = option === question.answer;
    setLastOk(ok);
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    window.setTimeout(() => {
      if (index === wordQuestions.length - 1) onDone(Math.round((nextCorrect / wordQuestions.length) * 100));
      else {
        setIndex(index + 1);
        setLastOk(null);
      }
    }, 700);
  };

  return (
    <GameShell
      title="Find the Kazakh Word"
      instruction={WORDS_INSTRUCTION}
      accessibility={accessibility}
      onSpeak={onSpeak}
      onRegisterInstruction={onRegisterInstruction}
    >
      <div className="question-card">
        <div className="big-icon">{question.icon}</div>
        <h3>{question.prompt}</h3>
        {hearingText && <p className="word-prompt-text">Pick the Kazakh word that matches the picture. Everything is written — no sound required.</p>}
      </div>
      {accessibility.gestureAnswerMode && options.length > 0 && (
        <div className="gesture-box">
          <strong>Gesture Mode mock</strong>
          <p>👍 selects active answer. ✋ repeats instruction. 👉 moves to next option.</p>
          <div className="cta-row">
            <button type="button" onClick={() => setActive((active + 1) % options.length)}>👉 Next</button>
            <button type="button" onClick={() => onSpeak(WORDS_INSTRUCTION.audioText)}>✋ Repeat</button>
            <button
              type="button"
              onClick={() => {
                const opt = options[active];
                if (!opt) return;
                answer(opt);
              }}
            >
              👍 Select {options[active]}
            </button>
          </div>
        </div>
      )}
      <div className={`answers answers--words${accessibility.extraLargeTouchTargets ? " answers--xlarge" : ""}`}>
        {options.map((option, optionIndex) => (
          <div className="answer-with-audio" key={option}>
            <button
              type="button"
              className={`answer-main ${optionIndex === active ? "active-answer" : ""}`}
              onClick={() => answer(option)}
            >
              {option}
            </button>
            {readOptionAloud && (
              <button type="button" className="answer-read" aria-label="Read this word aloud" onClick={() => onSpeak(option)}>
                🔊
              </button>
            )}
          </div>
        ))}
      </div>
      {lastOk !== null ? (
        <QuestAnswerFeedback
          outcome={lastOk ? "correct" : "wrong"}
          headline={lastOk ? "Correct!" : "Try again"}
          detail={lastOk ? question.fact : `Here is a hint: ${question.fact}`}
          accessibility={accessibility}
          onSpeak={onSpeak}
        />
      ) : null}
    </GameShell>
  );
}

function MathGame({
  age,
  accessibility,
  onDone,
  onSpeak,
  onRegisterInstruction,
}: {
  age: Age;
  accessibility: AccessibilitySettings;
  onDone: (score: number) => void;
  onSpeak: (text: string) => void;
  onRegisterInstruction?: (info: { title: string; hint: string }) => void;
}) {
  const mathSettingsKey = `${accessibility.fewerAnswerOptions}-${accessibility.oneTaskAtATime}`;
  const questions = useMemo(() => makeMathQuestions(age, accessibility), [age, mathSettingsKey]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answerFlash, setAnswerFlash] = useState<null | { ok: boolean; detail: string }>(null);
  const question = questions[index];
  const focusMath = accessibility.fewerAnswerOptions || accessibility.oneTaskAtATime;
  const readProblemAloud = accessibility.voiceInstructions && (accessibility.largeText || accessibility.highContrast);

  useEffect(() => {
    setIndex(0);
    setCorrect(0);
    setActive(0);
    setPicked(null);
    setAnswerFlash(null);
  }, [age, mathSettingsKey]);

  const advance = (nextCorrect: number) => {
    if (index === questions.length - 1) onDone(Math.round((nextCorrect / questions.length) * 100));
    else {
      setIndex(index + 1);
      setActive(0);
      setPicked(null);
    }
  };

  const submitAnswer = (option: number) => {
    const ok = option === question.answer;
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    const hintLine = mathStepHintForQuestion(question.prompt);
    if (ok) {
      setAnswerFlash({ ok: true, detail: "Nice counting — next step is on the way!" });
      window.setTimeout(() => {
        setAnswerFlash(null);
        advance(nextCorrect);
      }, 420);
    } else {
      setAnswerFlash({ ok: false, detail: `Here is a hint: ${hintLine}` });
      window.setTimeout(() => {
        setAnswerFlash(null);
        advance(nextCorrect);
      }, 780);
    }
  };

  const pickOption = (option: number) => {
    if (accessibility.confirmBeforeActions) {
      setPicked((prev) => (prev === option ? null : option));
      return;
    }
    submitAnswer(option);
  };

  return (
    <GameShell title="Counting with Bota" instruction={MATH_INSTRUCTION} accessibility={accessibility} onSpeak={onSpeak} onRegisterInstruction={onRegisterInstruction}>
      <div className={`question-card${accessibility.largeText || accessibility.highContrast ? " question-card--math-large" : ""}`}>
        <h3>{question.prompt}</h3>
        {focusMath && <p className="math-step-hint">{mathStepHintForQuestion(question.prompt)}</p>}
        {readProblemAloud && (
          <button type="button" className="read-problem-btn" onClick={() => onSpeak(question.prompt)}>
            🔊 Read question
          </button>
        )}
      </div>
      {accessibility.gestureAnswerMode && (
        <div className="gesture-box">
          <strong>Gesture Mode mock</strong>
          <p>👍 selects active answer. ✋ repeats instruction. 👉 moves to next option.</p>
          <div className="cta-row">
            <button type="button" onClick={() => setActive((active + 1) % question.options.length)}>👉 Next</button>
            <button type="button" onClick={() => onSpeak(question.prompt)}>✋ Repeat</button>
            <button
              type="button"
              onClick={() => {
                const opt = question.options[active];
                if (opt === undefined) return;
                if (accessibility.confirmBeforeActions) setPicked(opt);
                else submitAnswer(opt);
              }}
            >
              👍 Select {question.options[active]}
            </button>
          </div>
        </div>
      )}
      {accessibility.confirmBeforeActions && picked !== null && (
        <div className="confirm-answer-bar" role="region" aria-label="Confirm your answer">
          <span>Selected: {picked}</span>
          <button type="button" className="primary" onClick={() => submitAnswer(picked)}>
            Confirm answer
          </button>
          <button type="button" onClick={() => setPicked(null)}>
            Change
          </button>
        </div>
      )}
      {answerFlash ? (
        <QuestAnswerFeedback
          outcome={answerFlash.ok ? "correct" : "wrong"}
          headline={answerFlash.ok ? "Correct!" : "Try again"}
          detail={answerFlash.detail}
          accessibility={accessibility}
          onSpeak={onSpeak}
        />
      ) : null}
      <div className={`answers${accessibility.extraLargeTouchTargets ? " answers--xlarge" : ""}`}>
        {question.options.map((option, optionIndex) => (
          <button
            key={option}
            type="button"
            className={`${optionIndex === active ? "active-answer" : ""}${picked === option ? " picked-answer" : ""}`}
            onClick={() => pickOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </GameShell>
  );
}

function PatternGame({
  accessibility,
  onDone,
  onSpeak,
  onRegisterInstruction,
}: {
  accessibility: AccessibilitySettings;
  onDone: (score: number) => void;
  onSpeak: (text: string) => void;
  onRegisterInstruction?: (info: { title: string; hint: string }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [active, setActive] = useState(0);
  const [lastOk, setLastOk] = useState<boolean | null>(null);
  const question = patternQuestions[index];

  useEffect(() => {
    setActive(0);
  }, [index, question.options.length]);

  const answer = (option: string) => {
    const ok = option === question.answer;
    setLastOk(ok);
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    window.setTimeout(() => {
      if (index === patternQuestions.length - 1) onDone(Math.round((nextCorrect / patternQuestions.length) * 100));
      else {
        setIndex(index + 1);
        setLastOk(null);
      }
    }, 850);
  };

  return (
    <GameShell title="Pattern Caravan" instruction={PATTERN_INSTRUCTION} accessibility={accessibility} onSpeak={onSpeak} onRegisterInstruction={onRegisterInstruction}>
      <div className="sequence-card">{question.sequence.map((item, itemIndex) => <span key={`${item}-${itemIndex}`}>{item}</span>)}</div>
      {accessibility.gestureAnswerMode && question.options.length > 0 && (
        <div className="gesture-box">
          <strong>Gesture Mode mock</strong>
          <p>👍 selects active answer. ✋ repeats instruction. 👉 moves to next option.</p>
          <div className="cta-row">
            <button type="button" onClick={() => setActive((active + 1) % question.options.length)}>👉 Next</button>
            <button type="button" onClick={() => onSpeak(PATTERN_INSTRUCTION.audioText)}>✋ Repeat</button>
            <button type="button" onClick={() => answer(question.options[active]!)}>
              👍 Select {question.options[active]}
            </button>
          </div>
        </div>
      )}
      <div className="answers">
        {question.options.map((option, optionIndex) => (
          <button key={option} type="button" className={optionIndex === active ? "active-answer" : ""} onClick={() => answer(option)}>
            {option}
          </button>
        ))}
      </div>
      {lastOk !== null ? (
        <QuestAnswerFeedback
          outcome={lastOk ? "correct" : "wrong"}
          headline={lastOk ? "Correct!" : "Try again"}
          detail={lastOk ? question.rule : `Here is a hint: ${question.rule}`}
          accessibility={accessibility}
          onSpeak={onSpeak}
        />
      ) : null}
    </GameShell>
  );
}

function CultureGame({
  accessibility,
  onDone,
  onSpeak,
  onRegisterInstruction,
}: {
  accessibility: AccessibilitySettings;
  onDone: (score: number) => void;
  onSpeak: (text: string) => void;
  onRegisterInstruction?: (info: { title: string; hint: string }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [active, setActive] = useState(0);
  const [lastOk, setLastOk] = useState<boolean | null>(null);
  const question = cultureQuestions[index];

  useEffect(() => {
    setActive(0);
  }, [index, question.options.length]);

  const answer = (option: string) => {
    const ok = option === question.answer;
    setLastOk(ok);
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    window.setTimeout(() => {
      if (index === cultureQuestions.length - 1) onDone(Math.round((nextCorrect / cultureQuestions.length) * 100));
      else {
        setIndex(index + 1);
        setLastOk(null);
      }
    }, 850);
  };

  return (
    <GameShell title="Culture Match" instruction={CULTURE_INSTRUCTION} accessibility={accessibility} onSpeak={onSpeak} onRegisterInstruction={onRegisterInstruction}>
      <div className="question-card culture-card">
        <div className="big-icon">🧭</div>
        <h3>{question.prompt}</h3>
      </div>
      {accessibility.gestureAnswerMode && question.options.length > 0 && (
        <div className="gesture-box">
          <strong>Gesture Mode mock</strong>
          <p>👍 selects active answer. ✋ repeats instruction. 👉 moves to next option.</p>
          <div className="cta-row">
            <button type="button" onClick={() => setActive((active + 1) % question.options.length)}>👉 Next</button>
            <button type="button" onClick={() => onSpeak(CULTURE_INSTRUCTION.audioText)}>✋ Repeat</button>
            <button type="button" onClick={() => answer(question.options[active]!)}>
              👍 Select {question.options[active]}
            </button>
          </div>
        </div>
      )}
      <div className="answers">
        {question.options.map((option, optionIndex) => (
          <button key={option} type="button" className={optionIndex === active ? "active-answer" : ""} onClick={() => answer(option)}>
            {option}
          </button>
        ))}
      </div>
      {lastOk !== null ? (
        <QuestAnswerFeedback
          outcome={lastOk ? "correct" : "wrong"}
          headline={lastOk ? "Correct!" : "Good try"}
          detail={lastOk ? question.fact : `Here is a hint: ${question.fact}`}
          accessibility={accessibility}
          onSpeak={onSpeak}
        />
      ) : null}
    </GameShell>
  );
}

function GameShell({
  title,
  instruction,
  accessibility,
  onSpeak,
  onRegisterInstruction,
  children,
}: {
  title: string;
  instruction: AdaptiveInstruction;
  accessibility: AccessibilitySettings;
  onSpeak: (text: string) => void;
  onRegisterInstruction?: (info: { title: string; hint: string }) => void;
  children: React.ReactNode;
}) {
  const [explainSimpler, setExplainSimpler] = useState(false);
  const showingSimple = accessibility.simplifiedInstructions || explainSimpler;
  const displayed = showingSimple ? instruction.simple : instruction.default;

  useEffect(() => {
    onRegisterInstruction?.({ title, hint: displayed });
  }, [title, displayed, onRegisterInstruction]);

  const handleExplainSimpler = () => {
    setExplainSimpler(true);
    if (accessibility.voiceInstructions) {
      onSpeak(instruction.simple);
    }
  };

  return (
    <section className="screen">
      <p className="eyebrow">Educational quest</p>
      <h2>{title}</h2>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>{displayed}</p>
      </div>
      <div className="instruction-toolbar">
        {accessibility.voiceInstructions && (
          <button type="button" onClick={() => onSpeak(instruction.audioText)}>
            🔊 Read aloud
          </button>
        )}
        <button type="button" className="instruction-explain" onClick={handleExplainSimpler}>
          Explain simpler
        </button>
      </div>
      {accessibility.textHints && <p className="hint">Take your time! There's no rush. Audio is optional.</p>}
      {accessibility.noTimer && <p className="status">No timer — go at your own pace!</p>}
      {children}
    </section>
  );
}

function ResultScreen({
  result,
  accessibility,
  onSpeak,
  onMap,
  onRewards,
  onAlbum,
  onGarden,
}: {
  result: GameResult;
  accessibility: AccessibilitySettings;
  onSpeak: (text: string) => void;
  onMap: () => void;
  onRewards: () => void;
  onAlbum: () => void;
  onGarden: () => void;
}) {
  const great = result.score >= 80;
  const stickerDetails = result.stickersUnlocked
    .map((id) => STICKERS.find((s) => s.id === id))
    .filter((s): s is (typeof STICKERS)[number] => Boolean(s));
  const showLearningFocus = !result.alreadyAwarded && Boolean(result.skillPracticeSummary);
  const rewardExtra = great ? "Great work on this quest!" : "Every step counts — nice effort!";
  return (
    <section className="screen center result-screen">
      <div className={`celebration ${accessibility.reducedAnimations ? "celebration--static" : ""}`}>
        <span>⭐</span><span>🌟</span><span>✨</span><span>🌟</span><span>⭐</span>
      </div>
      <p className="eyebrow">Quest complete!</p>
      <h2>{great ? "Amazing job!" : "Well done!"}</h2>
      <div className="score">{result.score}%</div>
      <div className="bota-bubble">
        <div className="bota-face">{great ? "🎉" : "🐫"}</div>
        <p>{result.alreadyAwarded
          ? "Great practice! You already earned coins for this quest."
          : "Your quest is finished. Below is what you earned — you can read it or tap read aloud."
        }</p>
      </div>
      {!result.alreadyAwarded && result.coinsEarned > 0 && (
        <div className="result-reward-row">
          <RewardEarnedBanner
            coins={result.coinsEarned}
            extraLine={rewardExtra}
            accessibility={accessibility}
            onSpeak={onSpeak}
          />
        </div>
      )}
      {showLearningFocus && (
        <p className="result-learning-focus">
          <strong>Learning focus:</strong> {result.skillPracticeSummary}
        </p>
      )}
      {!result.alreadyAwarded && stickerDetails.length > 0 && (
        <div className="result-stickers">
          <strong>New in your album</strong>
          <ul>
            {stickerDetails.map((sticker) => (
              <li key={sticker.id}>
                <span className="result-sticker-emoji">{sticker.imageEmoji}</span>
                <span>{sticker.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.badge && <p className="badge">🏅 Badge: {result.badge}</p>}
      <div className="cta-row">
        <button className="primary" onClick={onMap}>Back to Map 🗺️</button>
        <button onClick={onGarden}>Skill Garden 🌱</button>
        <button onClick={onRewards}>Rewards 🎁</button>
        <button onClick={onAlbum}>Sticker Album 📔</button>
      </div>
    </section>
  );
}

function RewardsShop({
  profile,
  onMap,
  onAlbum,
  onParent,
}: {
  profile: UserProfile;
  onMap: () => void;
  onAlbum: () => void;
  onParent: () => void;
}) {
  const unlockedRewards = rewards.filter((reward) => reward.type === "qr_bonus" ? profile.unlockedLocations.includes("secret") : profile.coins >= reward.cost);
  const nextReward = rewards.find((reward) => reward.cost > profile.coins && reward.type !== "qr_bonus");
  const couponReward = rewards.find((reward) => reward.id === "coupon");
  const couponUnlocked = Boolean(couponReward && profile.coins >= couponReward.cost);
  const progress = nextReward ? Math.min(100, Math.round((profile.coins / nextReward.cost) * 100)) : 100;

  return (
    <section className="screen rewards-screen">
      <div className="rewards-hero">
        <div>
          <p className="eyebrow">Rewards shop</p>
          <h2>Your Bota Rewards 🎁</h2>
          <p className="lead">Play quests to earn coins and unlock cool rewards, badges, and coupons!</p>
          <div className="cta-row">
            <button onClick={onAlbum}>Sticker Album 📔</button>
          </div>
        </div>
        <div className="coin-wallet">
          <span>{profile.coins}</span>
          <strong>Bota Coins</strong>
          <small>{unlockedRewards.length}/{rewards.length} rewards available</small>
        </div>
      </div>

      <div className="rewards-layout">
        <section className="featured-coupon">
          <div>
            <p className="eyebrow">Featured coupon</p>
            <h3>100 KZT Bota product coupon</h3>
            <p>{couponUnlocked ? "Ready to show to a parent." : `${Math.max(0, 100 - profile.coins)} more coins to unlock this coupon.`}</p>
          </div>
          <div className={`coupon-ticket ${couponUnlocked ? "unlocked" : ""}`}>
            <span>BOTA</span>
            <strong>{couponUnlocked ? "BOTA-LEARN-100" : "LOCKED"}</strong>
            <small>Concept only. Real cashier/POS integration is a future step.</small>
            <button disabled={!couponUnlocked} onClick={onParent}>Show to Parent</button>
          </div>
        </section>

        <aside className="next-reward-card">
          <p className="eyebrow">Next unlock</p>
          <h3>{nextReward ? nextReward.title : "All coin rewards unlocked"}</h3>
          <div className="reward-progress"><span style={{ width: `${progress}%` }} /></div>
          <p>{nextReward ? `${profile.coins}/${nextReward.cost} coins` : "Keep playing for badges and practice."}</p>
          <button onClick={onMap}>Earn More Coins</button>
        </aside>
      </div>

      <div className="reward-grid">
        {rewards.map((reward) => {
          const unlocked = reward.type === "qr_bonus" ? profile.unlockedLocations.includes("secret") : profile.coins >= reward.cost;
          const missing = Math.max(0, reward.cost - profile.coins);
          return (
            <article className={`reward-card ${unlocked ? "available" : "locked"}`} key={reward.id}>
              <div className="reward-card-top">
                <span className="reward-icon">{reward.type === "badge" ? "🏅" : reward.type === "qr_bonus" ? "✨" : "🎟️"}</span>
                <span className="reward-cost">{reward.cost ? `${reward.cost} coins` : "QR only"}</span>
              </div>
              <h3>{reward.title}</h3>
              <p>{reward.description}</p>
              <div className="reward-state">
                <strong>{unlocked ? "Available" : reward.type === "qr_bonus" ? "Scan package" : `${missing} coins needed`}</strong>
              </div>
              {reward.code && unlocked && <div className="coupon"><b>{reward.code}</b><small>{reward.discount}</small><button onClick={onParent}>Show to Parent</button><em>Concept only. Real cashier/POS integration is a future step.</em></div>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ParentPin({
  accessibility,
  onSpeak,
  onSuccess,
}: {
  accessibility: AccessibilitySettings;
  onSpeak: (text: string) => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="screen center">
      <p className="eyebrow">Parent Mode</p>
      <h2>🔒 Enter PIN</h2>
      <p className="lead">This area is for grown-ups only.</p>
      <input className="pin" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="1234" />
      {error ? (
        <GentleNotice
          accessibility={accessibility}
          onSpeak={onSpeak}
          headline="That PIN did not match"
          detail={error}
        />
      ) : null}
      <button className="primary" onClick={() => pin === "1234" ? onSuccess() : setError("Try 1234 for the MVP demo — no penalty, just try again.")}>Unlock 🔓</button>
    </section>
  );
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildParentSummaryParagraph(profile: UserProfile, session: LearningSession): string {
  const name = profile.name;
  const gameLabels = session.gamesCompleted.map((g) => SESSION_ACTIVITY_LABELS[g] ?? g.replace(/-/g, " "));
  const qrBits = session.qrItemsScanned.map((id) => {
    if (id === "package-qr") return "a Bota package unlock (demo)";
    const item = QR_ITEMS.find((q) => q.id === id);
    return item ? `scanning ${item.productName}` : "a package activity";
  });
  const activities = [...gameLabels, ...qrBits];
  const n = activities.length;
  const activityText =
    n === 0
      ? "used the app for learning"
      : `completed ${n} educational activit${n === 1 ? "y" : "ies"}: ${joinWithAnd(activities)}`;
  const stickers = session.stickersEarned
    .map((id) => STICKERS.find((s) => s.id === id)?.title ?? id)
    .filter(Boolean);
  const stickerPhrase =
    stickers.length === 0
      ? "did not add new album stickers in this summary window"
      : stickers.length === 1
        ? `collected a new sticker (${stickers[0]})`
        : `collected ${stickers.length} new stickers (${joinWithAnd(stickers)})`;
  const skills = session.skillsTrained.map((s) => SESSION_SKILL_LABELS[s]);
  const skillPhrase =
    skills.length === 0 ? "has not logged skill practice yet today" : `trained learning progress in ${joinWithAnd(skills)}`;
  return `Today, ${name} ${activityText}. ${name} earned ${session.coinsEarned} Bota Coins, ${stickerPhrase}, and ${skillPhrase}.`;
}

function ParentSummaryCard({
  profile,
  calendarDay,
  onGarden,
  onAlbum,
}: {
  profile: UserProfile;
  calendarDay: string;
  onGarden: () => void;
  onAlbum: () => void;
}) {
  const session = getSessionForDate(profile, calendarDay);
  const hasData = session && sessionHasLearningActivity(session);

  return (
    <div className="parent-summary-card">
      <p className="eyebrow">Today's learning summary</p>
      <h3>Learning at a glance</h3>
      {hasData && session ? (
        <>
          <p className="parent-summary-lead">{buildParentSummaryParagraph(profile, session)}</p>
          <ul className="parent-summary-meta">
            <li>
              <strong>Educational activities today</strong>
              <span>{session.gamesCompleted.length + session.qrItemsScanned.length}</span>
            </li>
            <li>
              <strong>Bota Coins earned today</strong>
              <span>{session.coinsEarned}</span>
            </li>
            <li>
              <strong>New stickers today</strong>
              <span>{session.stickersEarned.length}</span>
            </li>
            <li>
              <strong>Skills trained today</strong>
              <span>{session.skillsTrained.length ? session.skillsTrained.map((s) => SESSION_SKILL_LABELS[s]).join(" · ") : "—"}</span>
            </li>
            <li>
              <strong>Screen time</strong>
              <span>Guided limit in this demo: 30 minutes per day. Learning stays short and focused.</span>
            </li>
          </ul>
        </>
      ) : (
        <p className="parent-summary-empty">
          Today's learning journey has not started yet. Complete a mini-game with Bota to see progress here.
        </p>
      )}
      <div className="parent-summary-cta">
        <button className="primary" type="button" onClick={onGarden}>
          Open Skill Garden 🌱
        </button>
        <button type="button" onClick={onAlbum}>
          Open Sticker Album 📔
        </button>
      </div>
    </div>
  );
}

function ParentDashboard({
  profile,
  onAlbum,
  onGarden,
  onSettings,
  onQr,
  onReset,
}: {
  profile: UserProfile;
  onAlbum: () => void;
  onGarden: () => void;
  onSettings: () => void;
  onQr: () => void;
  onReset: () => void;
}) {
  const skills = profile.completedGames.map((game) => ({ memory: "Memory", words: "Kazakh language", math: "Math", patterns: "Logic", culture: "Culture" })[game] ?? game);
  const [confirmReset, setConfirmReset] = useState(false);
  const sp = profile.skillProgress;
  return (
    <section className="screen">
      <p className="eyebrow">Parent dashboard</p>
      <h2>📊 {profile.name}'s Progress</h2>
      <ParentSummaryCard profile={profile} calendarDay={getToday()} onGarden={onGarden} onAlbum={onAlbum} />
      <div className="stats">
        <span>Age <b>{profile.age}</b></span>
        <span>Language <b>{profile.language.toUpperCase()}</b></span>
        <span>Coins <b>{profile.coins}</b></span>
        <span>Screen time <b>30 min/day</b></span>
      </div>
      <div className="panel">
        <strong>Completed games</strong>
        <p>{profile.completedGames.length ? profile.completedGames.join(", ") : "No games yet"}</p>
        <strong>Skills trained</strong>
        <p>{skills.length ? Array.from(new Set(skills)).join(", ") : "Start a quest to train skills"}</p>
        <strong>Badges</strong>
        <p>{profile.badges.length ? profile.badges.join(", ") : "No badges yet"}</p>
        <strong>Skill garden (estimated growth)</strong>
        <p>
          Memory: {sp.memory}% · Math: {sp.math}% · Kazakh words: {sp.language}% · Culture: {sp.culture}%
        </p>
        <button onClick={onGarden}>Open Skill Garden 🌱</button>
        <strong>Sticker album</strong>
        <p>{profile.unlockedStickers.length}/{STICKERS.length} stickers collected</p>
        <button onClick={onAlbum}>Open Sticker Album</button>
      </div>
      <div className="cta-row">
        <button className="primary" onClick={onSettings}>♿ Learning Comfort Profile</button>
        <button onClick={onQr}>📦 QR Unlock</button>
      </div>
      <div className="danger-zone">
        <div>
          <strong>Reset demo progress</strong>
          <p>Clears local coins, badges, completed games, QR unlock, and profile data on this device.</p>
        </div>
        {confirmReset ? (
          <div className="reset-actions">
            <button className="danger" onClick={onReset}>Confirm Reset</button>
            <button onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button className="secondary-danger" onClick={() => setConfirmReset(true)}>Reset Progress</button>
        )}
      </div>
    </section>
  );
}

function AccessibilityPanel({ profile, onChange, onBack }: { profile: UserProfile; onChange: (profile: UserProfile) => void; onBack: () => void }) {
  const set = (key: keyof AccessibilitySettings) =>
    onChange({
      ...profile,
      adaptiveProfile: {
        ...profile.adaptiveProfile,
        settings: { ...profile.adaptiveProfile.settings, [key]: !profile.adaptiveProfile.settings[key] },
      },
    });
  const items: [keyof AccessibilitySettings, string][] = [
    ["largeButtons", "Large Buttons"],
    ["highContrast", "High Contrast"],
    ["textHints", "Text Hints"],
    ["voiceInstructions", "Voice Instructions"],
    ["botaVoiceGuide", "Bota Voice Guide"],
    ["simplifiedInstructions", "Simpler instructions"],
    ["noTimer", "No Timer"],
    ["reducedAnimations", "Reduced Animations"],
    ["gestureAnswerMode", "Gesture Answer Mode"],
  ];
  return (
    <section className="screen">
      <p className="eyebrow">Qolaily Mode</p>
      <h2>♿ Learning Comfort Profile</h2>
      <p className="lead">Let’s make the app comfortable for your child. You can change these anytime in Parent Mode.</p>
      <div className="toggle-list">{items.map(([key, label]) => <label className="toggle" key={key}><span>{label}</span><input type="checkbox" checked={profile.adaptiveProfile.settings[key]} onChange={() => set(key)} /></label>)}</div>
      <button className="primary" onClick={onBack}>← Back to Parent Mode</button>
    </section>
  );
}

function QrCollection({
  profile,
  items,
  message,
  onScan,
  onSecret,
}: {
  profile: UserProfile;
  items: QrItem[];
  message: string | null;
  onScan: (itemId: string) => void;
  onSecret: () => void;
}) {
  const unlocked = profile.unlockedLocations.includes("secret");
  return (
    <section className="screen qr-collection-screen">
      <div className="qr-collection-hero">
        <div className="qr">▦</div>
        <div>
          <p className="eyebrow">Package Collection</p>
          <h2>Scan Bota Packages</h2>
          <p className="lead">Each Bota package unlocks a new educational reward and keeps kids exploring.</p>
        </div>
      </div>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>Pick a Bota package and tap “Simulate Scan” to unlock coins and stickers.</p>
      </div>
      {message && <p className="status">{message}</p>}
      <div className="qr-grid">
        {items.map((item) => {
          const scanned = profile.scannedQrItems.includes(item.id);
          const rewardSticker = STICKERS.find((sticker) => sticker.id === item.rewardStickerId);
          return (
            <article className={`qr-card ${scanned ? "scanned" : ""}`} key={item.id}>
              <div className="qr-card-top">
                <span className="qr-badge">{scanned ? "Collected" : "New"}</span>
                <span className="qr-coins">+{item.rewardCoins} coins</span>
              </div>
              <h3>{item.title}</h3>
              <p className="qr-product">{item.productName}</p>
              <p className="qr-reward">
                Reward: {rewardSticker ? `${rewardSticker.imageEmoji} ${rewardSticker.title}` : "Sticker"}
              </p>
              <button className="primary" disabled={scanned} onClick={() => onScan(item.id)}>
                {scanned ? "Already collected" : "Simulate Scan"}
              </button>
            </article>
          );
        })}
      </div>
      <div className="qr-note">
        Each Bota package can unlock a new educational reward. This connects physical products with digital learning and repeat engagement.
      </div>
      {unlocked && (
        <button onClick={onSecret}>🌟 Open Secret Location</button>
      )}
    </section>
  );
}

function QrUnlock({ profile, onUnlock, onSecret }: { profile: UserProfile; onUnlock: () => void; onSecret: () => void }) {
  const unlocked = profile.unlockedLocations.includes("secret");
  return (
    <section className="screen center">
      <div className="qr">▦</div>
      <p className="eyebrow">Bota Package</p>
      <h2>Unlock a Secret Adventure!</h2>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>{unlocked ? <><strong>Amazing!</strong> Your Bota package unlocked a secret quest!</> : "Got a Bota product? Scan the package to find a hidden adventure!"}</p>
      </div>
      <div className="cta-row">
        <button className="primary" onClick={onUnlock}>📱 Scan Package</button>
        {unlocked && <button onClick={onSecret}>🌟 Secret Quest</button>}
      </div>
    </section>
  );
}

function SecretLocation({ onMap }: { onMap: () => void }) {
  return (
    <section className="screen center secret-screen">
      <div className="celebration">
        <span>✨</span><span>🌟</span><span>⭐</span><span>🌟</span><span>✨</span>
      </div>
      <p className="eyebrow">Secret Location</p>
      <h2>You Found It! 🗝️</h2>
      <div className="bota-bubble">
        <div className="bota-face">🎉</div>
        <p><strong>Congratulations!</strong> Every Bota package opens a new learning adventure. Keep collecting and exploring!</p>
      </div>
      <button className="primary" onClick={onMap}>Back to Map 🗺️</button>
    </section>
  );
}

export default App;
