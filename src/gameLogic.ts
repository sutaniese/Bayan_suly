export type Age = 7 | 8 | 9 | 10 | 11;
export type Language = "ru" | "kz";

export type SupportNeed = "vision" | "hearing" | "motor" | "focus" | "standard";

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
  },
  {
    id: "qr-bota-chocolate",
    title: "Chocolate Mountain Pack",
    productName: "Bota Chocolate",
    rewardStickerId: "sticker-almaty-mountains",
    rewardCoins: 20,
    unlockMessage: "Bota Chocolate unlocked a mountain reward!",
  },
  {
    id: "qr-bota-cookie",
    title: "Cookie Yurt Pack",
    productName: "Bota Cookies",
    rewardStickerId: "sticker-yurt",
    rewardCoins: 15,
    unlockMessage: "Bota Cookies unlocked a cozy yurt sticker!",
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

export function makeMathQuestions(age: Age) {
  if (age === 7) {
    return [
      { prompt: "Bota had 3 sweets and found 2 more. How many?", answer: 5, options: [4, 5, 6] },
      { prompt: "There are 4 apples and 3 more arrive. Total?", answer: 7, options: [6, 7, 8] },
      { prompt: "Bota sees 5 stars and 5 more. Total?", answer: 10, options: [9, 10, 11] },
    ];
  }
  if (age <= 9) {
    return [
      { prompt: "Bota has 14 sweets and shares 5. How many remain?", answer: 9, options: [8, 9, 10] },
      { prompt: "A basket has 8 apples. Add 7 more. Total?", answer: 15, options: [14, 15, 16] },
      { prompt: "20 coins minus 6 coins equals?", answer: 14, options: [12, 14, 16] },
    ];
  }
  return [
    { prompt: "Bota packs 3 boxes with 4 sweets each. Total?", answer: 12, options: [10, 12, 14] },
    { prompt: "Two families each get 6 candies. Total?", answer: 12, options: [8, 12, 16] },
    { prompt: "Which number completes 5, 10, 15, ?", answer: 20, options: [18, 20, 25] },
  ];
}
