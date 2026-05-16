export type Age = 7 | 8 | 9 | 10 | 11;
export type Language = "ru" | "kz" | "en";

export type SupportNeed = "vision" | "hearing" | "motor" | "focus" | "standard";

/** Per-game instruction copy for accessibility (Phase 7). */
export type AdaptiveInstruction = {
  default: string;
  simple: string;
  audioText: string;
};

export type AccessibilitySettings = {
  enabled: boolean;

  // Visual support
  largeText: boolean;
  largeButtons: boolean;
  highContrast: boolean;
  simplifiedVisuals: boolean;

  // Hearing support
  textHints: boolean;
  subtitles: boolean;
  visualFeedback: boolean;
  soundRequired: boolean;

  // Motor support
  extraLargeTouchTargets: boolean;
  noDragRequired: boolean;
  gestureAnswerMode: boolean;
  confirmBeforeActions: boolean;

  // Cognitive / focus support
  noTimer: boolean;
  reducedAnimations: boolean;
  simplifiedInstructions: boolean;
  oneTaskAtATime: boolean;
  fewerAnswerOptions: boolean;

  // Voice guide
  voiceInstructions: boolean;
  voiceNavigation: boolean;
  botaVoiceGuide: boolean;
};

export type AdaptiveProfile = {
  supportNeeds: SupportNeed[];
  settings: AccessibilitySettings;
  setupSource: "manual" | "mock_document" | "default";
  recommendationSummary: string[];
};

export type SkillProgress = {
  memory: number;
  math: number;
  language: number;
  culture: number;
};

export type LearningSession = {
  id: string;
  date: string;
  gamesCompleted: string[];
  coinsEarned: number;
  skillsTrained: Array<"memory" | "math" | "language" | "culture">;
  stickersEarned: string[];
  qrItemsScanned: string[];
};

export type Sticker = {
  id: string;
  title: string;
  description: string;
  category: "city" | "culture" | "nature" | "bota" | "product";
  unlockType: "game" | "daily_chest" | "qr" | "skill";
  imageEmoji: string;
};

export type QrItem = {
  id: string;
  title: string;
  productName: string;
  rewardStickerId: string;
  rewardCoins: number;
  unlockMessage: string;
  unlocksLocation?: string;
};

export type DailyTaskType = "play_game" | "earn_coins" | "open_chest" | "collect_sticker";

export type DailyTask = {
  id: string;
  type: DailyTaskType;
  label: { ru: string; kz: string; en: string };
  target: number;
  progress: number;
  rewardCoins: number;
  completed: boolean;
};

export const STICKERS: Sticker[] = [
  {
    id: "sticker-bota",
    title: "Bota Explorer",
    description: "You started your journey with Bota.",
    category: "bota",
    unlockType: "game",
    imageEmoji: "🐫",
  },
  {
    id: "sticker-baiterek",
    title: "Baiterek",
    description: "A famous symbol of Astana.",
    category: "city",
    unlockType: "game",
    imageEmoji: "🏙️",
  },
  {
    id: "sticker-almaty-mountains",
    title: "Almaty Mountains",
    description: "You explored the mountains near Almaty.",
    category: "nature",
    unlockType: "game",
    imageEmoji: "⛰️",
  },
  {
    id: "sticker-turkestan",
    title: "Turkestan",
    description: "You discovered a historic city of Kazakhstan.",
    category: "culture",
    unlockType: "game",
    imageEmoji: "🕌",
  },
  {
    id: "sticker-dombyra",
    title: "Dombyra",
    description: "A traditional Kazakh musical instrument.",
    category: "culture",
    unlockType: "daily_chest",
    imageEmoji: "🎵",
  },
  {
    id: "sticker-yurt",
    title: "Yurt",
    description: "A traditional home of nomadic people.",
    category: "culture",
    unlockType: "daily_chest",
    imageEmoji: "⛺",
  },
  {
    id: "sticker-bota-pack",
    title: "Bota Package",
    description: "Unlocked from a Bota product package.",
    category: "product",
    unlockType: "qr",
    imageEmoji: "🍬",
  },
  {
    id: "sticker-skill-garden",
    title: "Skill Garden",
    description: "Your learning garden is growing.",
    category: "bota",
    unlockType: "skill",
    imageEmoji: "🌱",
  },
];

export const QR_ITEMS: QrItem[] = [
  {
    id: "qr-bota-caramel",
    title: "Caramel Adventure Pack",
    productName: "Bota Caramel",
    rewardStickerId: "sticker-bota-pack",
    rewardCoins: 15,
    unlockMessage: "Bota Caramel unlocked a sweet steppe adventure!",
    unlocksLocation: "almaty",
  },
  {
    id: "qr-bota-chocolate",
    title: "Chocolate Mountain Pack",
    productName: "Bota Chocolate",
    rewardStickerId: "sticker-almaty-mountains",
    rewardCoins: 20,
    unlockMessage: "Bota Chocolate unlocked a mountain reward!",
    unlocksLocation: "astana",
  },
  {
    id: "qr-bota-cookie",
    title: "Cookie Yurt Pack",
    productName: "Bota Cookies",
    rewardStickerId: "sticker-yurt",
    rewardCoins: 15,
    unlockMessage: "Bota Cookies unlocked a cozy yurt sticker!",
    unlocksLocation: "turkestan",
  },
  {
    id: "qr-bota-waffle",
    title: "Waffle Steppe Pack",
    productName: "Bota Waffles",
    rewardStickerId: "sticker-dombyra",
    rewardCoins: 15,
    unlockMessage: "Bota Waffles unlocked a steppe adventure!",
    unlocksLocation: "karaganda",
  },
  {
    id: "qr-bota-marshmallow",
    title: "Marshmallow Culture Pack",
    productName: "Bota Marshmallows",
    rewardStickerId: "sticker-turkestan",
    rewardCoins: 20,
    unlockMessage: "Bota Marshmallows unlocked a cultural discovery!",
    unlocksLocation: "shymkent",
  },
];

export type UserProfile = {
  name: string;
  age: Age;
  language: Language;
  coins: number;
  completedGames: string[];
  unlockedLocations: string[];
  badges: string[];
  unlockedStickers: string[];
  openedDailyChestDates: string[];
  scannedQrItems: string[];
  skillProgress: SkillProgress;
  sessionHistory: LearningSession[];
  adaptiveProfile: AdaptiveProfile;
  awardedEvents: string[];
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  dailyTasks: DailyTask[];
  dailyTasksDate: string | null;
};

export const CORE_LOCATION_IDS = ["almaty", "turkestan", "astana", "karaganda", "shymkent"];
export const STORAGE_KEY = "botaQuest:v1";

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  enabled: false,
  largeText: false,
  largeButtons: false,
  highContrast: false,
  simplifiedVisuals: false,
  textHints: true,
  subtitles: true,
  visualFeedback: true,
  soundRequired: false,
  extraLargeTouchTargets: false,
  noDragRequired: false,
  gestureAnswerMode: false,
  confirmBeforeActions: false,
  noTimer: false,
  reducedAnimations: false,
  simplifiedInstructions: false,
  oneTaskAtATime: false,
  fewerAnswerOptions: false,
  voiceInstructions: false,
  voiceNavigation: false,
  botaVoiceGuide: false,
};

export const defaultSkillProgress: SkillProgress = {
  memory: 0,
  math: 0,
  language: 0,
  culture: 0,
};

export const SKILL_GARDEN = [
  { skill: "memory" as const, label: "Memory", visual: "🌸", description: "Grows when you complete memory games." },
  { skill: "math" as const, label: "Math", visual: "🌳", description: "Grows when you solve counting tasks." },
  { skill: "language" as const, label: "Kazakh Words", visual: "⛺", description: "Grows when you learn Kazakh words." },
  { skill: "culture" as const, label: "Kazakhstan Culture", visual: "☀️", description: "Grows when you discover facts about Kazakhstan." },
];

export function buildAccessibilitySettings(needs: SupportNeed[]): AccessibilitySettings {
  const uniq = Array.from(new Set(needs));
  const clean = uniq.length ? uniq : (["standard"] as SupportNeed[]);
  const onlyStandard = clean.length === 1 && clean[0] === "standard";
  if (onlyStandard) return { ...DEFAULT_ACCESSIBILITY_SETTINGS, enabled: false };

  const base: AccessibilitySettings = { ...DEFAULT_ACCESSIBILITY_SETTINGS, enabled: true, soundRequired: false };
  const out = { ...base };

  const has = (need: SupportNeed) => clean.includes(need);

  if (has("vision")) {
    out.largeText = true;
    out.largeButtons = true;
    out.highContrast = true;
    out.simplifiedVisuals = true;
    out.voiceInstructions = true;
    out.voiceNavigation = true;
    out.botaVoiceGuide = true;
    out.textHints = true;
    out.visualFeedback = true;
    out.soundRequired = false;
  }

  if (has("hearing")) {
    out.textHints = true;
    out.subtitles = true;
    out.visualFeedback = true;
    out.soundRequired = false;
  }

  if (has("motor")) {
    out.largeButtons = true;
    out.extraLargeTouchTargets = true;
    out.noDragRequired = true;
    out.gestureAnswerMode = true;
    out.confirmBeforeActions = true;
    out.noTimer = true;
  }

  if (has("focus")) {
    out.reducedAnimations = true;
    out.simplifiedInstructions = true;
    out.oneTaskAtATime = true;
    out.fewerAnswerOptions = true;
    out.noTimer = true;
    out.simplifiedVisuals = true;
    out.textHints = true;
  }

  return out;
}

export function buildRecommendationSummary(needs: SupportNeed[], settings: AccessibilitySettings): string[] {
  const uniq = Array.from(new Set(needs));
  const clean = uniq.length ? uniq : (["standard"] as SupportNeed[]);
  const onlyStandard = clean.length === 1 && clean[0] === "standard";
  if (onlyStandard || !settings.enabled) return [];

  const lines: string[] = [];

  if (settings.largeText && settings.highContrast) lines.push("Large text and high contrast enabled for better visibility.");
  else if (settings.largeText) lines.push("Large text enabled to make reading easier.");
  else if (settings.highContrast) lines.push("High contrast enabled to improve readability.");

  if (settings.voiceInstructions || settings.botaVoiceGuide) {
    lines.push("Voice instructions and Bota Voice Guide enabled (audio is optional).");
  }

  if (settings.voiceNavigation) {
    lines.push("Voice navigation enabled for simple spoken commands.");
  }

  if (settings.subtitles) lines.push("Subtitles and text hints enabled so learning never depends only on sound.");

  if (settings.noTimer) lines.push("Timers removed to reduce pressure.");

  if (settings.largeButtons || settings.extraLargeTouchTargets) lines.push("Buttons enlarged for easier interaction.");

  if (settings.reducedAnimations) lines.push("Reduced animations enabled for a calmer experience.");

  if (settings.simplifiedInstructions || settings.oneTaskAtATime || settings.fewerAnswerOptions) {
    lines.push("Instructions simplified and tasks made less overwhelming.");
  }

  if (settings.gestureAnswerMode) lines.push("Gesture Answer Mode available as a non-precise touch fallback.");

  return lines;
}

function capSkillValue(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function getGrowthStage(value: number) {
  if (value >= 81) return "Fully grown";
  if (value >= 51) return "Strong";
  if (value >= 21) return "Growing";
  return "Seed";
}

export function totalSkillProgress(sp: SkillProgress) {
  return sp.memory + sp.math + sp.language + sp.culture;
}

export function mergeSkillProgress(profile: UserProfile, deltas: Partial<SkillProgress>): UserProfile {
  const sp = profile.skillProgress;
  const next: SkillProgress = {
    memory: capSkillValue(sp.memory + (deltas.memory ?? 0)),
    math: capSkillValue(sp.math + (deltas.math ?? 0)),
    language: capSkillValue(sp.language + (deltas.language ?? 0)),
    culture: capSkillValue(sp.culture + (deltas.culture ?? 0)),
  };
  const unlockedStickers =
    totalSkillProgress(next) >= 100 && !profile.unlockedStickers.includes("sticker-skill-garden")
      ? Array.from(new Set([...profile.unlockedStickers, "sticker-skill-garden"]))
      : profile.unlockedStickers;
  return { ...profile, skillProgress: next, unlockedStickers };
}

function skillDeltasForGame(gameId: string): Partial<SkillProgress> | null {
  if (gameId === "memory") return { memory: 20 };
  if (gameId === "math") return { math: 20 };
  if (gameId === "words") return { language: 20, culture: 10 };
  if (gameId === "patterns") return { memory: 15 };
  if (gameId === "culture") return { culture: 20 };
  return null;
}

/** Parent-facing labels for activities logged on today's learning session */
export const SESSION_ACTIVITY_LABELS: Record<string, string> = {
  memory: "memory matching",
  math: "counting and math",
  words: "Kazakh language practice",
  patterns: "patterns and logic",
  culture: "Kazakhstan culture",
  "daily-chest": "the daily learning chest",
};

export const SESSION_SKILL_LABELS: Record<LearningSession["skillsTrained"][number], string> = {
  memory: "memory",
  math: "math",
  language: "Kazakh language",
  culture: "culture and facts",
};

function skillsForGame(gameId: string): LearningSession["skillsTrained"] {
  if (gameId === "memory" || gameId === "patterns") return ["memory"];
  if (gameId === "math") return ["math"];
  if (gameId === "words") return ["language", "culture"];
  if (gameId === "culture") return ["culture"];
  return [];
}

/** Short phrase for quest result / parent-facing copy */
export function skillPracticeSummaryForGame(gameId: string): string {
  const skills = skillsForGame(gameId);
  if (!skills.length) return "General learning";
  return skills.map((s) => SESSION_SKILL_LABELS[s]).join(" · ");
}

function uniqMergeStrings(a: string[], b?: string[]): string[] {
  if (!b?.length) return a;
  const seen = new Set(a);
  const out = [...a];
  for (const x of b) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function uniqMergeSkills(
  a: LearningSession["skillsTrained"],
  b?: LearningSession["skillsTrained"],
): LearningSession["skillsTrained"] {
  if (!b?.length) return a;
  const seen = new Set<string>(a);
  const out = [...a] as LearningSession["skillsTrained"];
  for (const x of b) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

/** Append activity to the session for `date` (YYYY-MM-DD), creating the row if needed. */
export function appendSessionDelta(
  profile: UserProfile,
  date: string,
  delta: {
    gamesCompleted?: string[];
    coinsEarned?: number;
    skillsTrained?: LearningSession["skillsTrained"];
    stickersEarned?: string[];
    qrItemsScanned?: string[];
  },
): UserProfile {
  const sessions = [...profile.sessionHistory];
  let idx = sessions.findIndex((s) => s.date === date);
  if (idx === -1) {
    sessions.push({
      id: `session-${date}-${Math.random().toString(36).slice(2, 9)}`,
      date,
      gamesCompleted: [],
      coinsEarned: 0,
      skillsTrained: [],
      stickersEarned: [],
      qrItemsScanned: [],
    });
    idx = sessions.length - 1;
  }
  const cur = sessions[idx];
  sessions[idx] = {
    ...cur,
    gamesCompleted: uniqMergeStrings(cur.gamesCompleted, delta.gamesCompleted),
    coinsEarned: cur.coinsEarned + (delta.coinsEarned ?? 0),
    skillsTrained: uniqMergeSkills(cur.skillsTrained, delta.skillsTrained),
    stickersEarned: uniqMergeStrings(cur.stickersEarned, delta.stickersEarned),
    qrItemsScanned: uniqMergeStrings(cur.qrItemsScanned, delta.qrItemsScanned),
  };
  return { ...profile, sessionHistory: sessions };
}

export function getSessionForDate(profile: UserProfile, date: string): LearningSession | undefined {
  return profile.sessionHistory.find((s) => s.date === date);
}

export function sessionHasLearningActivity(session: LearningSession): boolean {
  return (
    session.coinsEarned > 0 ||
    session.gamesCompleted.length > 0 ||
    session.stickersEarned.length > 0 ||
    session.qrItemsScanned.length > 0
  );
}

export function makeProfile(name: string, age: Age, language: Language): UserProfile {
  return {
    name,
    age,
    language,
    coins: 0,
    completedGames: [],
    unlockedLocations: CORE_LOCATION_IDS,
    badges: [],
    unlockedStickers: [],
    openedDailyChestDates: [],
    scannedQrItems: [],
    skillProgress: { ...defaultSkillProgress },
    sessionHistory: [],
    adaptiveProfile: {
      supportNeeds: ["standard"],
      settings: { ...DEFAULT_ACCESSIBILITY_SETTINGS },
      setupSource: "default",
      recommendationSummary: [],
    },
    awardedEvents: [],
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    dailyTasks: [],
    dailyTasksDate: null,
  };
}

function hydrateAccessibilitySettings(raw: unknown): AccessibilitySettings {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<AccessibilitySettings>;
  return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...obj };
}

function hydrateAdaptiveProfile(raw: unknown): AdaptiveProfile {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<AdaptiveProfile> & { settings?: unknown };
  const supportNeeds =
    Array.isArray(obj.supportNeeds) && obj.supportNeeds.length ? (obj.supportNeeds as SupportNeed[]) : (["standard"] as SupportNeed[]);
  return {
    supportNeeds,
    settings: hydrateAccessibilitySettings(obj.settings),
    setupSource: obj.setupSource ?? "default",
    recommendationSummary: Array.isArray(obj.recommendationSummary) ? (obj.recommendationSummary as string[]) : [],
  };
}

function hydrateProfile(raw: any): UserProfile {
  const base = makeProfile(raw?.name ?? "", raw?.age ?? 7, raw?.language ?? "ru");
  const legacyAccessibility = raw?.accessibility;
  const adaptiveProfile = raw?.adaptiveProfile
    ? hydrateAdaptiveProfile(raw.adaptiveProfile)
    : hydrateAdaptiveProfile({ settings: legacyAccessibility });

  return {
    ...base,
    ...raw,
    completedGames: raw.completedGames ?? [],
    unlockedLocations: raw.unlockedLocations ?? base.unlockedLocations,
    badges: raw.badges ?? [],
    unlockedStickers: raw.unlockedStickers ?? [],
    openedDailyChestDates: raw.openedDailyChestDates ?? [],
    scannedQrItems: raw.scannedQrItems ?? [],
    skillProgress: { ...defaultSkillProgress, ...(raw.skillProgress ?? {}) },
    sessionHistory: raw.sessionHistory ?? [],
    adaptiveProfile,
    awardedEvents: raw.awardedEvents ?? [],
    currentStreak: raw.currentStreak ?? 0,
    longestStreak: raw.longestStreak ?? 0,
    lastActiveDate: raw.lastActiveDate ?? null,
    dailyTasks: Array.isArray(raw.dailyTasks) ? raw.dailyTasks : [],
    dailyTasksDate: raw.dailyTasksDate ?? null,
  };
}

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeProfile("", 7, "ru");
    return hydrateProfile(JSON.parse(raw) as Partial<UserProfile>);
  } catch {
    return makeProfile("", 7, "ru");
  }
}

export function saveUserProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function updateUserProfile(updater: (profile: UserProfile) => UserProfile) {
  const next = updater(getUserProfile());
  saveUserProfile(next);
}

export type DailyChestReward = {
  coins: number;
  fact: string;
  stickerId?: string;
};

export const DAILY_CHEST_REWARD: DailyChestReward = {
  coins: 10,
  fact: "The dombyra is a traditional Kazakh musical instrument.",
  stickerId: "sticker-dombyra",
};

export function applyDailyChest(profile: UserProfile, date: string, reward: DailyChestReward = DAILY_CHEST_REWARD) {
  const alreadyOpened = profile.openedDailyChestDates.includes(date);
  if (alreadyOpened) {
    return {
      profile,
      alreadyOpened,
      coinsEarned: 0,
      stickerUnlocked: false,
      reward,
    };
  }

  const stickerUnlocked = reward.stickerId ? !profile.unlockedStickers.includes(reward.stickerId) : false;
  const unlockedStickers = reward.stickerId
    ? Array.from(new Set([...profile.unlockedStickers, reward.stickerId]))
    : profile.unlockedStickers;

  const withSkills = mergeSkillProgress(
    {
      ...profile,
      coins: profile.coins + reward.coins,
      openedDailyChestDates: Array.from(new Set([...profile.openedDailyChestDates, date])),
      unlockedStickers,
    },
    { culture: 5 },
  );

  const newStickers = withSkills.unlockedStickers.filter((id) => !profile.unlockedStickers.includes(id));
  const profileWithSession = appendSessionDelta(withSkills, date, {
    gamesCompleted: ["daily-chest"],
    coinsEarned: reward.coins,
    skillsTrained: ["culture"],
    stickersEarned: newStickers,
  });

  return {
    profile: profileWithSession,
    alreadyOpened: false,
    coinsEarned: reward.coins,
    stickerUnlocked,
    reward,
  };
}

export function applyQrItemScan(profile: UserProfile, item: QrItem) {
  const alreadyScanned = profile.scannedQrItems.includes(item.id);
  if (alreadyScanned) {
    return {
      profile,
      alreadyScanned: true,
      coinsEarned: 0,
      stickerUnlocked: false,
      secretUnlocked: false,
    };
  }

  const stickerUnlocked = !profile.unlockedStickers.includes(item.rewardStickerId);
  const unlockedStickers = Array.from(new Set([...profile.unlockedStickers, item.rewardStickerId]));
  const secretUnlocked = !profile.unlockedLocations.includes("secret");
  const unlockedLocations = secretUnlocked
    ? Array.from(new Set([...profile.unlockedLocations, "secret"]))
    : profile.unlockedLocations;

  const afterScan = {
    ...profile,
    coins: profile.coins + item.rewardCoins,
    scannedQrItems: Array.from(new Set([...profile.scannedQrItems, item.id])),
    unlockedStickers,
    unlockedLocations,
    awardedEvents: Array.from(new Set([...profile.awardedEvents, `qr-item:${item.id}`])),
  };

  const finalProfile = mergeSkillProgress(afterScan, { culture: 5 });
  const day = new Date().toISOString().slice(0, 10);
  const newStickers = finalProfile.unlockedStickers.filter((id) => !profile.unlockedStickers.includes(id));

  return {
    profile: appendSessionDelta(finalProfile, day, {
      qrItemsScanned: [item.id],
      coinsEarned: item.rewardCoins,
      skillsTrained: ["culture"],
      stickersEarned: newStickers,
    }),
    alreadyScanned: false,
    coinsEarned: item.rewardCoins,
    stickerUnlocked,
    secretUnlocked,
  };
}

export function applyGameAward(
  profile: UserProfile,
  gameId: string,
  badge: string | undefined,
  baseCoins = 20,
  bonus = 10,
  stickerId?: string,
) {
  const eventId = `game:${gameId}`;
  const alreadyAwarded = profile.awardedEvents.includes(eventId);
  const coinsEarned = alreadyAwarded ? 0 : baseCoins + bonus;
  const unlockedStickers = stickerId
    ? Array.from(new Set([...profile.unlockedStickers, stickerId]))
    : profile.unlockedStickers;

  let nextProfile: UserProfile = {
    ...profile,
    coins: profile.coins + coinsEarned,
    completedGames: Array.from(new Set([...profile.completedGames, gameId])),
    badges: badge ? Array.from(new Set([...profile.badges, badge])) : profile.badges,
    unlockedStickers,
    awardedEvents: alreadyAwarded ? profile.awardedEvents : [...profile.awardedEvents, eventId],
  };
  if (!alreadyAwarded) {
    const deltas = skillDeltasForGame(gameId);
    if (deltas) nextProfile = mergeSkillProgress(nextProfile, deltas);
  }
  if (!alreadyAwarded && coinsEarned > 0) {
    const day = new Date().toISOString().slice(0, 10);
    const newStickers = nextProfile.unlockedStickers.filter((id) => !profile.unlockedStickers.includes(id));
    nextProfile = appendSessionDelta(nextProfile, day, {
      gamesCompleted: [gameId],
      coinsEarned,
      skillsTrained: skillsForGame(gameId),
      stickersEarned: newStickers,
    });
  }

  return {
    profile: nextProfile,
    coinsEarned,
    alreadyAwarded,
  };
}

/** Default emoji pool for the memory mini-game (pairs are drawn from the start of this list). */
export const DEFAULT_MEMORY_SYMBOLS = ["🍬", "🍫", "🍭", "🐫"] as const;

/** How many matching pairs to show: focus loads use fewer cards (Phase 8). */
export function memoryPairCountForSettings(settings: AccessibilitySettings): 2 | 3 | 4 {
  if (settings.fewerAnswerOptions) return 2;
  if (settings.oneTaskAtATime) return 3;
  return 4;
}

/** Build a shuffled deck of `pairCount * 2` cards (two of each symbol). */
export function createMemoryDeck(pairCount: 2 | 3 | 4, pool: readonly string[] = DEFAULT_MEMORY_SYMBOLS): string[] {
  const symbols = pool.slice(0, pairCount);
  const deck = symbols.flatMap((card) => [card, card]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = deck[i];
    deck[i] = deck[j]!;
    deck[j] = t!;
  }
  return deck;
}

/** Flip-back delay for mismatched memory cards (ms). */
export function memoryFlipBackMs(settings: AccessibilitySettings): number {
  return settings.reducedAnimations ? 320 : 650;
}

/** Speak the revealed card when vision-style support is on (optional audio cue). */
export function memorySpeakCardOnReveal(settings: AccessibilitySettings): boolean {
  return settings.voiceInstructions && (settings.largeText || settings.highContrast || settings.simplifiedVisuals);
}

/** Ignore rapid repeat taps on the same card (motor / accidental double-tap). */
export function memoryDoubleTapGuardMs(settings: AccessibilitySettings): number {
  return settings.extraLargeTouchTargets || settings.confirmBeforeActions ? 420 : 0;
}

/** Kazakh word game: standard shows all choices; focus mode shows two (correct + one distractor). */
export function wordChoicesForSettings(allOptions: string[], answer: string, settings: AccessibilitySettings): string[] {
  if (!settings.fewerAnswerOptions) return allOptions;
  const wrong = allOptions.filter((o) => o !== answer).sort((a, b) => a.localeCompare(b, "kk"));
  const pick = wrong[0] ?? answer;
  return [answer, pick].sort((a, b) => a.localeCompare(b, "kk"));
}

/** Keep `answer` and up to `maxWrong` wrong options, sorted for stable UI/tests. */
export function narrowNumericOptions(answer: number, options: number[], maxTotal: 2 | 3): number[] {
  const wrong = options.filter((n) => n !== answer).sort((a, b) => a - b);
  const wrongKeep = wrong.slice(0, maxTotal - 1);
  return [...wrongKeep, answer].sort((a, b) => a - b);
}

/** Short hint for step-by-step math support (focus / cognitive load). */
export function mathStepHintForQuestion(prompt: string): string {
  if (/=\s*\?\s*$/.test(prompt) || /^\d+\s*,\s*\d+/.test(prompt.trim())) {
    return "Hint: work out the numbers step by step, then pick the matching answer.";
  }
  if (/how many\?/i.test(prompt) || /total\?/i.test(prompt) || /equals\?/i.test(prompt)) {
    return "Hint: add or subtract the numbers in the story, then pick your answer.";
  }
  if (/shares|minus|remain/i.test(prompt)) {
    return "Hint: start with the first number, then take away the second.";
  }
  if (/completes/i.test(prompt)) {
    return "Hint: look at how the list grows from one number to the next.";
  }
  if (/each|boxes/i.test(prompt)) {
    return "Hint: multiply or add the same amount several times.";
  }
  return "Hint: read the story slowly, then choose the number that fits.";
}

export function applyQrUnlock(profile: UserProfile): UserProfile {
  const alreadyAwarded = profile.awardedEvents.includes("qr:secret");
  const unlockedStickers = Array.from(new Set([...profile.unlockedStickers, "sticker-bota-pack"]));
  const base = {
    ...profile,
    coins: profile.coins + (alreadyAwarded ? 0 : 15),
    unlockedLocations: Array.from(new Set([...profile.unlockedLocations, "secret"])),
    unlockedStickers,
    awardedEvents: alreadyAwarded ? profile.awardedEvents : [...profile.awardedEvents, "qr:secret"],
  };
  if (alreadyAwarded) return base;
  const merged = mergeSkillProgress(base, { culture: 5 });
  const day = new Date().toISOString().slice(0, 10);
  const newStickers = merged.unlockedStickers.filter((id) => !profile.unlockedStickers.includes(id));
  return appendSessionDelta(merged, day, {
    coinsEarned: 15,
    skillsTrained: ["culture"],
    stickersEarned: newStickers,
    qrItemsScanned: ["package-qr"],
  });
}

type MathQuestionSeed = { prompt: string; shortPrompt: string; answer: number; options: number[] };

function adaptMathQuestionRow(seed: MathQuestionSeed, settings?: AccessibilitySettings) {
  const cognitive = Boolean(settings?.fewerAnswerOptions || settings?.oneTaskAtATime);
  const prompt = cognitive ? seed.shortPrompt : seed.prompt;
  let options = seed.options;
  if (settings?.fewerAnswerOptions) {
    options = narrowNumericOptions(seed.answer, seed.options, 2);
  } else if (settings?.oneTaskAtATime) {
    options = narrowNumericOptions(seed.answer, seed.options, 3);
  }
  return { prompt, answer: seed.answer, options };
}

// ──── Daily tasks & streak system ────

const DAILY_TASK_POOL: Array<{ type: DailyTaskType; label: { ru: string; kz: string; en: string }; target: number; reward: number }> = [
  { type: "play_game", label: { ru: "Пройди 1 игру", kz: "1 ойын ойна", en: "Play 1 game" }, target: 1, reward: 5 },
  { type: "play_game", label: { ru: "Пройди 2 игры", kz: "2 ойын ойна", en: "Play 2 games" }, target: 2, reward: 10 },
  { type: "earn_coins", label: { ru: "Заработай 10 монет", kz: "10 тиын жина", en: "Earn 10 coins" }, target: 10, reward: 5 },
  { type: "earn_coins", label: { ru: "Заработай 20 монет", kz: "20 тиын жина", en: "Earn 20 coins" }, target: 20, reward: 10 },
  { type: "open_chest", label: { ru: "Открой сундук", kz: "Сандықты аш", en: "Open chest" }, target: 1, reward: 5 },
  { type: "collect_sticker", label: { ru: "Получи стикер", kz: "Стикер жина", en: "Collect a sticker" }, target: 1, reward: 5 },
];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    const t = out[i]!; out[i] = out[j]!; out[j] = t;
  }
  return out;
}

export function generateDailyTasks(date: string): DailyTask[] {
  const seed = date.split("-").reduce((a, b) => a * 31 + Number(b), 0);
  const shuffled = seededShuffle(DAILY_TASK_POOL, seed);
  const picked = shuffled.slice(0, 3);
  return picked.map((t, i) => ({
    id: `task-${date}-${i}`,
    type: t.type,
    label: t.label,
    target: t.target,
    progress: 0,
    rewardCoins: t.reward,
    completed: false,
  }));
}

function dateDiffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function updateStreak(profile: UserProfile, today: string): UserProfile {
  if (profile.lastActiveDate === today) return profile;

  let streak = profile.currentStreak;
  if (profile.lastActiveDate && dateDiffDays(profile.lastActiveDate, today) === 1) {
    streak += 1;
  } else if (profile.lastActiveDate !== today) {
    streak = 1;
  }

  const longestStreak = Math.max(profile.longestStreak, streak);
  let tasks = profile.dailyTasks;
  let tasksDate = profile.dailyTasksDate;
  if (tasksDate !== today) {
    tasks = generateDailyTasks(today);
    tasksDate = today;
  }

  let bonusCoins = 0;
  const badges = [...profile.badges];
  if (streak === 3 && !profile.awardedEvents.includes("streak:3")) bonusCoins = 5;
  if (streak === 7 && !profile.awardedEvents.includes("streak:7")) bonusCoins = 15;
  if (streak === 30 && !profile.awardedEvents.includes("streak:30")) {
    bonusCoins = 50;
    if (!badges.includes("Streak Master")) badges.push("Streak Master");
  }

  const events = [...profile.awardedEvents];
  if (bonusCoins > 0 && streak >= 3) events.push(`streak:${streak}`);

  return {
    ...profile,
    currentStreak: streak,
    longestStreak,
    lastActiveDate: today,
    dailyTasks: tasks,
    dailyTasksDate: tasksDate,
    coins: profile.coins + bonusCoins,
    badges,
    awardedEvents: events,
  };
}

export type DailyTaskEvent = {
  gamesPlayed?: number;
  coinsEarned?: number;
  chestsOpened?: number;
  stickersCollected?: number;
};

export function checkDailyTaskProgress(profile: UserProfile, event: DailyTaskEvent): UserProfile {
  let totalBonus = 0;
  const tasks = profile.dailyTasks.map((task) => {
    if (task.completed) return task;
    let delta = 0;
    if (task.type === "play_game") delta = event.gamesPlayed ?? 0;
    else if (task.type === "earn_coins") delta = event.coinsEarned ?? 0;
    else if (task.type === "open_chest") delta = event.chestsOpened ?? 0;
    else if (task.type === "collect_sticker") delta = event.stickersCollected ?? 0;
    if (delta <= 0) return task;
    const progress = Math.min(task.target, task.progress + delta);
    const completed = progress >= task.target;
    if (completed && !task.completed) totalBonus += task.rewardCoins;
    return { ...task, progress, completed };
  });
  return { ...profile, dailyTasks: tasks, coins: profile.coins + totalBonus };
}

export const STREAK_MILESTONES = [
  { days: 3, coins: 5, label: { ru: "3 дня подряд: +5 монет", kz: "3 күн қатарынан: +5 тиын", en: "3-day streak: +5 coins" } },
  { days: 7, coins: 15, label: { ru: "7 дней подряд: +15 монет", kz: "7 күн қатарынан: +15 тиын", en: "7-day streak: +15 coins" } },
  { days: 30, coins: 50, label: { ru: "30 дней: +50 монет + значок", kz: "30 күн: +50 тиын + белгі", en: "30 days: +50 coins + badge" } },
];

// ──── Leaderboard ────

export type LeaderboardEntry = {
  name: string;
  coins: number;
  streak: number;
  badges: number;
  avatar: string;
  isPlayer: boolean;
};

const SIMULATED_PLAYERS: Omit<LeaderboardEntry, "isPlayer">[] = [
  { name: "Аружан", coins: 220, streak: 12, badges: 4, avatar: "👧" },
  { name: "Ернар", coins: 185, streak: 7, badges: 3, avatar: "👦" },
  { name: "Дана", coins: 150, streak: 5, badges: 2, avatar: "👧" },
  { name: "Алихан", coins: 130, streak: 4, badges: 2, avatar: "👦" },
  { name: "Мадина", coins: 95, streak: 3, badges: 1, avatar: "👧" },
  { name: "Тимур", coins: 75, streak: 2, badges: 1, avatar: "👦" },
  { name: "Айгерім", coins: 60, streak: 1, badges: 1, avatar: "👧" },
  { name: "Нұрсұлтан", coins: 40, streak: 1, badges: 0, avatar: "👦" },
  { name: "Камила", coins: 25, streak: 0, badges: 0, avatar: "👧" },
  { name: "Арман", coins: 10, streak: 0, badges: 0, avatar: "👦" },
];

export function buildLeaderboard(profile: UserProfile): LeaderboardEntry[] {
  const player: LeaderboardEntry = {
    name: profile.name || "You",
    coins: profile.coins,
    streak: profile.currentStreak,
    badges: profile.badges.length,
    avatar: "🐫",
    isPlayer: true,
  };
  const all: LeaderboardEntry[] = [
    player,
    ...SIMULATED_PLAYERS.map((p) => ({ ...p, isPlayer: false })),
  ];
  all.sort((a, b) => b.coins - a.coins);
  return all;
}

// ──── UI strings (trilingual) ────

type I18n = { ru: string; kz: string; en: string };
export const UI_STRINGS: Record<string, I18n> = {
  // ── Landing ──
  landing_headline: { ru: "Учись играя с Ботой!", kz: "Ботамен ойнай оқы!", en: "Learn by playing with Bota!" },
  landing_subtitle: { ru: "Образовательное приключение по Казахстану для детей 7-11 лет", kz: "7-11 жас балаларға арналған Қазақстан бойынша білім беру оқиғасы", en: "An educational adventure across Kazakhstan for kids aged 7-11" },
  landing_start: { ru: "Начать обучение", kz: "Оқуды бастау", en: "Start Learning" },
  landing_continue: { ru: "Продолжить как", kz: "Жалғастыру:", en: "Continue as" },
  landing_new: { ru: "Новое приключение", kz: "Жаңа оқиға", en: "New Adventure" },
  landing_feat_games: { ru: "5 обучающих мини-игр", kz: "5 білім беру ойыны", en: "5 educational mini-games" },
  landing_feat_voice: { ru: "Голосовой помощник Бота", kz: "Бота дауыс көмекшісі", en: "Bota voice assistant" },
  landing_feat_rewards: { ru: "Монеты, стикеры и награды", kz: "Тиындар, стикерлер, сыйлықтар", en: "Coins, stickers & rewards" },
  landing_feat_qr: { ru: "QR-сканер упаковок", kz: "Орама QR-сканері", en: "Package QR scanner" },
  landing_feat_streak: { ru: "Ежедневные задания и серии", kz: "Күнделікті тапсырмалар", en: "Daily tasks & streaks" },
  landing_feat_access: { ru: "Адаптивный профиль доступности", kz: "Бейімделген қолжетімділік", en: "Adaptive accessibility" },
  // ── Welcome / Bota hints ──
  welcome_map: { ru: "Привет! Выбери город для приключения!", kz: "Сәлем! Қаланы таңда!", en: "Hi! Pick a city for your adventure!" },
  welcome_memory: { ru: "Найди все пары сладостей!", kz: "Барлық тәттілердің жұбын тап!", en: "Find all the matching sweet pairs!" },
  welcome_words: { ru: "Выбери казахское слово для картинки!", kz: "Суретке сәйкес қазақ сөзін таңда!", en: "Pick the Kazakh word for the picture!" },
  welcome_math: { ru: "Посчитай с Ботой!", kz: "Ботамен сана!", en: "Count with Bota!" },
  welcome_patterns: { ru: "Найди следующий элемент узора!", kz: "Өрнектің келесі элементін тап!", en: "Find the next pattern element!" },
  welcome_culture: { ru: "Узнай больше о Казахстане!", kz: "Қазақстан туралы көбірек біл!", en: "Learn more about Kazakhstan!" },
  welcome_daily_chest: { ru: "У тебя есть подарок!", kz: "Сыйлығың бар!", en: "You have a gift!" },
  welcome_rewards: { ru: "Твои награды и купоны!", kz: "Сыйлықтарың мен купондарың!", en: "Your rewards & coupons!" },
  welcome_album: { ru: "Твой альбом стикеров!", kz: "Стикер жинағың!", en: "Your sticker album!" },
  welcome_garden: { ru: "Смотри как растут твои навыки!", kz: "Дағдыларыңның өсуін қара!", en: "Watch your skills grow!" },
  welcome_qr: { ru: "Сканируй упаковку Бота!", kz: "Бота орамасын сканерле!", en: "Scan a Bota package!" },
  chest_opened: { ru: "Молодец! Вот твоя награда!", kz: "Жарайсың! Міне сыйлығың!", en: "Great job! Here's your reward!" },
  stuck_hint: { ru: "Нужна помощь? Попробуй нажать на одну из кнопок!", kz: "Көмек керек пе? Батырмалардың бірін бас!", en: "Need help? Try tapping one of the buttons!" },
  // ── Nav labels ──
  open_map: { ru: "Карта", kz: "Карта", en: "Map" },
  open_rewards: { ru: "Награды", kz: "Сыйлық", en: "Rewards" },
  open_album: { ru: "Альбом", kz: "Жинақ", en: "Album" },
  open_garden: { ru: "Сад навыков", kz: "Дағды бағы", en: "Skill Garden" },
  open_qr: { ru: "QR сканер", kz: "QR сканер", en: "QR Scanner" },
  open_chest: { ru: "Сундук", kz: "Сандық", en: "Chest" },
  open_photo_frame: { ru: "Фото с Ботой", kz: "Ботамен фото", en: "Photo with Bota" },
  open_leaderboard: { ru: "Лидерборд", kz: "Көшбасшылар", en: "Leaderboard" },
  // ── Daily tasks / streaks ──
  daily_tasks: { ru: "Ежедневные задания", kz: "Күнделікті тапсырмалар", en: "Daily Tasks" },
  streak_label: { ru: "дней подряд", kz: "күн қатарынан", en: "day streak" },
  all_tasks_done: { ru: "Все задания выполнены!", kz: "Барлық тапсырмалар орындалды!", en: "All tasks completed!" },
  // ── Sharing / QR ──
  share_whatsapp: { ru: "Отправить в WhatsApp", kz: "WhatsApp-қа жіберу", en: "Share on WhatsApp" },
  download_photo: { ru: "Скачать фото", kz: "Фотоны жүктеу", en: "Download photo" },
  scan_camera: { ru: "Сканировать камерой", kz: "Камерамен сканерлеу", en: "Scan with camera" },
  level_unlocked: { ru: "Уровень разблокирован!", kz: "Деңгей ашылды!", en: "Level unlocked!" },
  // ── Onboarding ──
  onb_whats_name: { ru: "Как тебя зовут?", kz: "Сенің атың кім?", en: "What's your name?" },
  onb_how_old: { ru: "Сколько тебе лет?", kz: "Жасың нешеде?", en: "How old are you?" },
  onb_pick_lang: { ru: "Выбери язык", kz: "Тілді таңда", en: "Pick your language" },
  onb_next_comfort: { ru: "Далее: настройка комфорта", kz: "Келесі: ыңғайлылық", en: "Next: Comfort setup" },
  onb_skip: { ru: "Пропустить", kz: "Өткізіп жіберу", en: "Skip for now" },
  onb_intro: { ru: "Привет! Я Бота-верблюд! Давай учиться и играть вместе!", kz: "Сәлем! Мен Бота-түйе! Бірге оқып ойнайық!", en: "Hi! I'm Bota the Camel! Let's learn and play together!" },
  onb_comfort_title: { ru: "Настройка комфорта", kz: "Ыңғайлылық баптау", en: "Learning Comfort Setup" },
  onb_comfort_subtitle: { ru: "Настройте приложение для вашего ребёнка", kz: "Балаңыз үшін қолданбаны баптаңыз", en: "Make the app comfortable for your child" },
  onb_create_profile: { ru: "Создать профиль", kz: "Профиль жасау", en: "Create adaptive profile" },
  // ── Map screen ──
  map_title: { ru: "Куда дальше", kz: "Келесі қайда", en: "Where to next" },
  map_lead: { ru: "В каждом городе тебя ждёт задание. Пройди все и стань Чемпионом Бота!", kz: "Әр қалада тапсырма күтеді. Барлығын өт — Бота Чемпионы бол!", en: "Each city has a quest. Complete them all to become a Bota Champion!" },
  map_quests_complete: { ru: "квестов пройдено", kz: "квест өтілді", en: "quests complete" },
  map_all_done: { ru: "Все квесты пройдены!", kz: "Барлық квесттер өтілді!", en: "All quests complete!" },
  map_try_next: { ru: "Попробуй:", kz: "Келесі:", en: "Try next:" },
  map_tap_city: { ru: "Нажми на город для начала квеста!", kz: "Қаланы басып квестті бастаңыз!", en: "Tap a city to start a quest!" },
  // ── Game shell ──
  game_eyebrow: { ru: "Обучающий квест", kz: "Білім беру квесті", en: "Educational quest" },
  game_read_aloud: { ru: "Прочитать вслух", kz: "Дауыстап оқу", en: "Read aloud" },
  game_explain_simpler: { ru: "Объяснить проще", kz: "Оңайырақ түсіндіру", en: "Explain simpler" },
  game_hint_no_rush: { ru: "Не торопись! Аудио опционально.", kz: "Асықпа! Аудио қосымша.", en: "Take your time! Audio is optional." },
  game_no_timer: { ru: "Без таймера — в своём темпе!", kz: "Таймерсіз — өз қарқынында!", en: "No timer — go at your own pace!" },
  // ── Results ──
  result_title_great: { ru: "Отлично!", kz: "Керемет!", en: "Amazing job!" },
  result_title_ok: { ru: "Молодец!", kz: "Жарайсың!", en: "Well done!" },
  result_quest_complete: { ru: "Квест пройден!", kz: "Квест өтілді!", en: "Quest complete!" },
  result_earned: { ru: "Ты заработал(а)", kz: "Сен жинадың", en: "You earned" },
  result_practice: { ru: "Отличная практика!", kz: "Тамаша жаттығу!", en: "Great practice!" },
  result_learning_focus: { ru: "Тема обучения:", kz: "Оқу тақырыбы:", en: "Learning focus:" },
  result_new_stickers: { ru: "Новые в альбоме", kz: "Жинаққа жаңа", en: "New in your album" },
  result_back_map: { ru: "Назад на карту", kz: "Картаға оралу", en: "Back to Map" },
  // ── Rewards ──
  rewards_title: { ru: "Твои награды Бота", kz: "Бота сыйлықтарың", en: "Your Bota Rewards" },
  rewards_lead: { ru: "Играй в квесты, зарабатывай монеты и открывай награды!", kz: "Квесттер ойна, тиын жина, сыйлық аш!", en: "Play quests, earn coins and unlock rewards!" },
  rewards_coins: { ru: "Монеты Бота", kz: "Бота тиындары", en: "Bota Coins" },
  // ── Chest ──
  chest_title_open: { ru: "Открой сундук", kz: "Сандықты аш", en: "Open today's chest" },
  chest_title_done: { ru: "Сундук открыт!", kz: "Сандық ашылды!", en: "Today's chest is open!" },
  chest_come_back: { ru: "Приходи завтра за новым сюрпризом.", kz: "Ертең жаңа сюрприз алуға кел.", en: "Come back tomorrow for another surprise." },
  chest_fact_label: { ru: "Факт о Казахстане", kz: "Қазақстан туралы факт", en: "Kazakhstan fact" },
  // ── Album ──
  album_title: { ru: "Мой альбом Казахстана", kz: "Менің Қазақстан жинағым", en: "My Kazakhstan Album" },
  album_lead: { ru: "Собирай стикеры, исследуя города и сканируя упаковки.", kz: "Қалаларды зерттеп, орамаларды сканерлеп стикер жина.", en: "Collect stickers by exploring cities and scanning packages." },
  album_collected: { ru: "стикеров собрано", kz: "стикер жиналды", en: "stickers collected" },
  // ── Garden ──
  garden_title: { ru: "Мой сад навыков", kz: "Менің дағды бағым", en: "My Skill Garden" },
  garden_lead: { ru: "Каждый квест поливает свой навык. Играй и расти!", kz: "Әр квест дағдыны суарады. Ойна және өс!", en: "Each quest waters a skill. Play and grow!" },
  garden_total: { ru: "Всего очков обучения:", kz: "Жалпы оқу ұпайлары:", en: "Total learning points:" },
  // ── Parent ──
  parent_pin_title: { ru: "Режим родителя", kz: "Ата-ана режимі", en: "Parent Mode" },
  parent_enter_pin: { ru: "Введите ПИН", kz: "PIN енгізіңіз", en: "Enter PIN" },
  parent_dashboard: { ru: "Панель родителя", kz: "Ата-ана панелі", en: "Parent Dashboard" },
  parent_progress: { ru: "Прогресс", kz: "Прогресс", en: "Progress" },
  parent_reset: { ru: "Сбросить прогресс", kz: "Прогресті қалпына келтіру", en: "Reset Progress" },
  parent_settings: { ru: "Профиль комфорта", kz: "Ыңғайлылық профилі", en: "Learning Comfort Profile" },
  // ── Leaderboard ──
  lb_title: { ru: "Лидерборд", kz: "Көшбасшылар тізімі", en: "Leaderboard" },
  lb_rank: { ru: "Место", kz: "Орын", en: "Rank" },
  lb_name: { ru: "Имя", kz: "Есім", en: "Name" },
  lb_coins_col: { ru: "Монеты", kz: "Тиындар", en: "Coins" },
  lb_streak_col: { ru: "Серия", kz: "Серия", en: "Streak" },
  lb_you: { ru: "(вы)", kz: "(сіз)", en: "(you)" },
  // ── Common ──
  back: { ru: "Назад", kz: "Артқа", en: "Back" },
  correct: { ru: "Правильно!", kz: "Дұрыс!", en: "Correct!" },
  try_again: { ru: "Попробуй ещё", kz: "Қайта тырыс", en: "Try again" },
  coins_label: { ru: "монет", kz: "тиын", en: "coins" },
  completed: { ru: "Пройдено", kz: "Өтілді", en: "Completed" },
  locked: { ru: "Заблокировано", kz: "Бекітілген", en: "Locked" },
  ready: { ru: "Готово", kz: "Дайын", en: "Ready" },
};

export function uiStr(key: string, lang: Language): string {
  return UI_STRINGS[key]?.[lang] ?? UI_STRINGS[key]?.en ?? key;
}

export function makeMathQuestions(age: Age, settings?: AccessibilitySettings) {
  const seeds: MathQuestionSeed[] =
    age === 7
      ? [
          {
            prompt: "Bota had 3 sweets and found 2 more. How many?",
            shortPrompt: "3 + 2 = ?",
            answer: 5,
            options: [4, 5, 6],
          },
          {
            prompt: "There are 4 apples and 3 more arrive. Total?",
            shortPrompt: "4 + 3 = ?",
            answer: 7,
            options: [6, 7, 8],
          },
          {
            prompt: "Bota sees 5 stars and 5 more. Total?",
            shortPrompt: "5 + 5 = ?",
            answer: 10,
            options: [9, 10, 11],
          },
        ]
      : age <= 9
        ? [
            {
              prompt: "Bota has 14 sweets and shares 5. How many remain?",
              shortPrompt: "14 − 5 = ?",
              answer: 9,
              options: [8, 9, 10],
            },
            {
              prompt: "A basket has 8 apples. Add 7 more. Total?",
              shortPrompt: "8 + 7 = ?",
              answer: 15,
              options: [14, 15, 16],
            },
            {
              prompt: "20 coins minus 6 coins equals?",
              shortPrompt: "20 − 6 = ?",
              answer: 14,
              options: [12, 14, 16],
            },
          ]
        : [
            {
              prompt: "Bota packs 3 boxes with 4 sweets each. Total?",
              shortPrompt: "3 × 4 = ?",
              answer: 12,
              options: [10, 12, 14],
            },
            {
              prompt: "Two families each get 6 candies. Total?",
              shortPrompt: "6 + 6 = ?",
              answer: 12,
              options: [8, 12, 16],
            },
            {
              prompt: "Which number completes 5, 10, 15, ?",
              shortPrompt: "5, 10, 15, ?",
              answer: 20,
              options: [18, 20, 25],
            },
          ];
  return seeds.map((row) => adaptMathQuestionRow(row, settings));
}
