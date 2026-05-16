export type Age = 7 | 8 | 9 | 10 | 11;
export type Language = "ru" | "kz";

export type AccessibilitySettings = {
  largeButtons: boolean;
  highContrast: boolean;
  noTimer: boolean;
  reducedAnimations: boolean;
  textHints: boolean;
  voiceInstructions: boolean;
  gestureAnswerMode: boolean;
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
  accessibility: AccessibilitySettings;
  awardedEvents: string[];
};

export const CORE_LOCATION_IDS = ["almaty", "turkestan", "astana", "karaganda", "shymkent"];
export const STORAGE_KEY = "botaQuest:v1";

export const defaultAccessibility: AccessibilitySettings = {
  largeButtons: false,
  highContrast: false,
  noTimer: false,
  reducedAnimations: false,
  textHints: false,
  voiceInstructions: false,
  gestureAnswerMode: false,
};

export const defaultSkillProgress: SkillProgress = {
  memory: 0,
  math: 0,
  language: 0,
  culture: 0,
};

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
    accessibility: defaultAccessibility,
    awardedEvents: [],
  };
}

function hydrateProfile(raw: Partial<UserProfile>): UserProfile {
  const base = makeProfile(raw.name ?? "", raw.age ?? 7, raw.language ?? "ru");
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
    accessibility: { ...defaultAccessibility, ...(raw.accessibility ?? {}) },
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

  return {
    profile: {
      ...profile,
      coins: profile.coins + reward.coins,
      openedDailyChestDates: Array.from(new Set([...profile.openedDailyChestDates, date])),
      unlockedStickers,
    },
    alreadyOpened: false,
    coinsEarned: reward.coins,
    stickerUnlocked,
    reward,
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

  return {
    profile: {
      ...profile,
      coins: profile.coins + coinsEarned,
      completedGames: Array.from(new Set([...profile.completedGames, gameId])),
      badges: badge ? Array.from(new Set([...profile.badges, badge])) : profile.badges,
      unlockedStickers,
      awardedEvents: alreadyAwarded ? profile.awardedEvents : [...profile.awardedEvents, eventId],
    },
    coinsEarned,
    alreadyAwarded,
  };
}

export function applyQrUnlock(profile: UserProfile): UserProfile {
  const alreadyAwarded = profile.awardedEvents.includes("qr:secret");
  const unlockedStickers = Array.from(new Set([...profile.unlockedStickers, "sticker-bota-pack"]));
  return {
    ...profile,
    coins: profile.coins + (alreadyAwarded ? 0 : 15),
    unlockedLocations: Array.from(new Set([...profile.unlockedLocations, "secret"])),
    unlockedStickers,
    awardedEvents: alreadyAwarded ? profile.awardedEvents : [...profile.awardedEvents, "qr:secret"],
  };
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
