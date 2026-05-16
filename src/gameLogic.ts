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

export type UserProfile = {
  name: string;
  age: Age;
  language: Language;
  coins: number;
  completedGames: string[];
  unlockedLocations: string[];
  badges: string[];
  accessibility: AccessibilitySettings;
  awardedEvents: string[];
};

export const defaultAccessibility: AccessibilitySettings = {
  largeButtons: false,
  highContrast: false,
  noTimer: false,
  reducedAnimations: false,
  textHints: false,
  voiceInstructions: false,
  gestureAnswerMode: false,
};

export function makeProfile(name: string, age: Age, language: Language): UserProfile {
  return {
    name,
    age,
    language,
    coins: 0,
    completedGames: [],
    unlockedLocations: ["almaty", "turkestan", "astana"],
    badges: [],
    accessibility: defaultAccessibility,
    awardedEvents: [],
  };
}

export function applyGameAward(profile: UserProfile, gameId: string, badge: string | undefined, baseCoins = 20, bonus = 10) {
  const eventId = `game:${gameId}`;
  const alreadyAwarded = profile.awardedEvents.includes(eventId);
  const coinsEarned = alreadyAwarded ? 0 : baseCoins + bonus;

  return {
    profile: {
      ...profile,
      coins: profile.coins + coinsEarned,
      completedGames: Array.from(new Set([...profile.completedGames, gameId])),
      badges: badge ? Array.from(new Set([...profile.badges, badge])) : profile.badges,
      awardedEvents: alreadyAwarded ? profile.awardedEvents : [...profile.awardedEvents, eventId],
    },
    coinsEarned,
    alreadyAwarded,
  };
}

export function applyQrUnlock(profile: UserProfile): UserProfile {
  const alreadyAwarded = profile.awardedEvents.includes("qr:secret");
  return {
    ...profile,
    coins: profile.coins + (alreadyAwarded ? 0 : 15),
    unlockedLocations: Array.from(new Set([...profile.unlockedLocations, "secret"])),
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
