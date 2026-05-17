import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CORE_LOCATION_IDS,
  STORAGE_KEY,
  DAILY_CHEST_REWARD,
  STICKERS,
  STREAK_MILESTONES,
  buildLeaderboard,
  applyDailyChest,
  applyGameAward,
  applyQrItemScan,
  checkDailyTaskProgress,
  updateStreak,
  uiStr,
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
  DailyTaskEvent,
  Language,
  LeaderboardEntry,
  LearningSession,
  QrItem,
  SupportNeed,
  UserProfile,
} from "./gameLogic";
import { GentleNotice, QuestAnswerFeedback, RewardEarnedBanner } from "./multimodalFeedback";
import { cancelVoicePlayback, resolveVoiceCommand, speakText, transcribeAudio } from "./voiceAgent";
import type { VoiceAgentContext, VoiceCommand } from "../shared/voice";

type View =
  | "landing"
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
  | "daily-tasks"
  | "album"
  | "parent-pin"
  | "parent"
  | "accessibility"
  | "qr"
  | "secret"
  | "garden"
  | "photo-frame"
  | "leaderboard";
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
  lat?: number;
  lon?: number;
  x?: number;
  y?: number;
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

type LocalizedText = Record<Language, string>;

const pickText = (text: LocalizedText, language: Language) => text[language] ?? text.en;

const LANGUAGE_OPTIONS: Array<{ code: Language; flag: string; label: string }> = [
  { code: "kz", flag: "🇰🇿", label: "Қазақша" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
  { code: "en", flag: "🇬🇧", label: "English" },
];

const locations: Location[] = [
  // City coordinates use real-world lat/lon (GeoNames/OSM-level precision) and are projected into the map.
  { id: "astana", city: "Astana", title: "Counting with Bota", gameId: "math", skill: "Math", icon: "🏛️", lat: 51.1694, lon: 71.4491 },
  { id: "karaganda", city: "Karaganda", title: "Pattern Caravan", gameId: "patterns", skill: "Logic", icon: "🔷", lat: 49.8047, lon: 73.1094 },
  { id: "turkestan", city: "Turkestan", title: "Find the Kazakh Word", gameId: "words", skill: "Kazakh language", icon: "🕌", lat: 43.2973, lon: 68.2518 },
  { id: "shymkent", city: "Shymkent", title: "Culture Match", gameId: "culture", skill: "Culture", icon: "🎒", lat: 42.3099, lon: 69.6004 },
  { id: "almaty", city: "Almaty", title: "Collect the Sweets", gameId: "memory", skill: "Memory", icon: "⛰️", lat: 43.2525, lon: 76.9115 },
  { id: "secret", city: "Secret Location", title: "Package Adventure", skill: "QR reward", icon: "✨", x: 80, y: 56, locked: true },
];

const LOCATION_COPY: Record<string, { title: LocalizedText; skill: LocalizedText; city?: LocalizedText }> = {
  astana: {
    title: { en: "Counting with Bota", ru: "Счёт с Ботой", kz: "Ботамен санау" },
    skill: { en: "Math", ru: "Математика", kz: "Математика" },
  },
  karaganda: {
    title: { en: "Pattern Caravan", ru: "Караван узоров", kz: "Өрнек керуені" },
    skill: { en: "Logic", ru: "Логика", kz: "Логика" },
  },
  turkestan: {
    title: { en: "Find the Kazakh Word", ru: "Найди казахское слово", kz: "Қазақ сөзін тап" },
    skill: { en: "Kazakh language", ru: "Казахский язык", kz: "Қазақ тілі" },
  },
  shymkent: {
    title: { en: "Culture Match", ru: "Культурное совпадение", kz: "Мәдениет сәйкестігі" },
    skill: { en: "Culture", ru: "Культура", kz: "Мәдениет" },
  },
  almaty: {
    title: { en: "Collect the Sweets", ru: "Собери сладости", kz: "Тәттілерді жина" },
    skill: { en: "Memory", ru: "Память", kz: "Есте сақтау" },
  },
  secret: {
    city: { en: "Secret Location", ru: "Секретная локация", kz: "Құпия орын" },
    title: { en: "Package Adventure", ru: "Приключение с упаковкой", kz: "Орама оқиғасы" },
    skill: { en: "QR reward", ru: "QR-награда", kz: "QR сыйлығы" },
  },
};

function locationTitle(location: Location, language: Language): string {
  return LOCATION_COPY[location.id]?.title ? pickText(LOCATION_COPY[location.id]!.title, language) : location.title;
}

function locationSkill(location: Location, language: Language): string {
  return LOCATION_COPY[location.id]?.skill ? pickText(LOCATION_COPY[location.id]!.skill, language) : location.skill;
}

function locationCity(location: Location, language: Language): string {
  return LOCATION_COPY[location.id]?.city ? pickText(LOCATION_COPY[location.id]!.city!, language) : location.city;
}

const KZ_BOUNDS = {
  // Approximate Kazakhstan bounds (north/south/west/east).
  latMin: 40.57,
  latMax: 55.44,
  lonMin: 46.49,
  lonMax: 87.32,
} as const;

const KZ_DRAW_AREA = {
  // The silhouette in this SVG does not fill the full image box, especially vertically.
  // Project cities into the visible land area rather than the entire SVG canvas.
  xMin: 8,
  xMax: 92,
  yMin: 12,
  yMax: 70,
} as const;

function getLocationPositionPct(location: Location): { left: string; top: string } {
  if (typeof location.x === "number" && typeof location.y === "number") {
    return { left: `${location.x}%`, top: `${location.y}%` };
  }

  if (typeof location.lat !== "number" || typeof location.lon !== "number") {
    return { left: "50%", top: "50%" };
  }

  const lonPct = (location.lon - KZ_BOUNDS.lonMin) / (KZ_BOUNDS.lonMax - KZ_BOUNDS.lonMin);
  const latPct = (KZ_BOUNDS.latMax - location.lat) / (KZ_BOUNDS.latMax - KZ_BOUNDS.latMin);

  const x = KZ_DRAW_AREA.xMin + lonPct * (KZ_DRAW_AREA.xMax - KZ_DRAW_AREA.xMin);
  const y = KZ_DRAW_AREA.yMin + latPct * (KZ_DRAW_AREA.yMax - KZ_DRAW_AREA.yMin);

  return { left: `${x}%`, top: `${y}%` };
}

const GLOBAL_VOICE_COMMANDS: VoiceCommand[] = [
  "open_map",
  "open_rewards",
  "open_album",
  "open_garden",
  "open_qr",
  "open_daily_chest",
  "open_daily_tasks",
  "open_photo_frame",
  "open_leaderboard",
  "repeat_instruction",
  "read_current_screen",
  "show_coins",
  "open_parent_mode",
  "enable_large_text",
];

function getAllowedVoiceCommands(view: View): VoiceCommand[] {
  if (view === "map") {
    return [
      ...GLOBAL_VOICE_COMMANDS,
      "open_memory_game",
      "open_words_game",
      "open_math_game",
      "open_patterns_game",
      "open_culture_game",
    ];
  }
  return GLOBAL_VOICE_COMMANDS;
}

function buildVoiceScreenSummary(
  profile: UserProfile,
  view: View,
  lastInstruction: { title: string; hint: string },
  result: GameResult | null,
): string {
  const completedCount = locations.filter((location) => location.gameId && profile.completedGames.includes(location.gameId)).length;
  const nextQuest = locations.find((location) => location.gameId && !profile.completedGames.includes(location.gameId));
  const today = getToday();
  const chestOpened = profile.openedDailyChestDates.includes(today);

  switch (view) {
    case "map":
      return nextQuest
        ? `You are on the Kazakhstan quest map. ${completedCount} of ${CORE_LOCATION_IDS.length} city quests are complete. The next suggested quest is ${nextQuest.city}: ${nextQuest.title}.`
        : `You are on the Kazakhstan quest map. All ${CORE_LOCATION_IDS.length} city quests are complete.`;
    case "memory":
    case "words":
    case "math":
    case "patterns":
    case "culture":
      return lastInstruction.hint
        ? `${lastInstruction.title}. ${lastInstruction.hint}`
        : "You are in a learning game. Ask me to repeat the instruction.";
    case "rewards":
      return `You are in the rewards shop. You have ${profile.coins} Bota Coins and can unlock badges or coupons.`;
    case "album":
      return `You are in the sticker album. You have unlocked ${profile.unlockedStickers.length} stickers so far.`;
    case "garden":
      return `You are in the skill garden. Your total learning points are ${totalSkillProgress(profile.skillProgress)}.`;
    case "qr":
      return `You are in package collection. You can simulate scanning Bota packages to unlock rewards.`;
    case "daily-chest":
      return chestOpened
        ? "You are on the daily chest screen. Today's chest was already opened."
        : `You are on the daily chest screen. Opening the chest gives ${DAILY_CHEST_REWARD.coins} coins and a Kazakhstan fact.`;
    case "result":
      return result
        ? `You finished ${result.title} with score ${result.score} and earned ${result.coinsEarned} Bota Coins.`
        : "You are on the result screen.";
    default:
      return "You are in Bota Quest.";
  }
}

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
  {
    icon: "🐫",
    prompt: { en: "Camel", ru: "Верблюд", kz: "Түйе" },
    answer: "түйе",
    options: ["түйе", "тау", "су", "алма"],
    fact: { en: "Түйе means camel.", ru: "Түйе значит верблюд.", kz: "Түйе деген сөз - camel." },
  },
  {
    icon: "⛰️",
    prompt: { en: "Mountain", ru: "Гора", kz: "Тау" },
    answer: "тау",
    options: ["алма", "тау", "дала", "түйе"],
    fact: { en: "Тау means mountain.", ru: "Тау значит гора.", kz: "Тау деген сөз - mountain." },
  },
  {
    icon: "🍎",
    prompt: { en: "Apple", ru: "Яблоко", kz: "Алма" },
    answer: "алма",
    options: ["су", "алма", "түйе", "дала"],
    fact: { en: "Алма means apple.", ru: "Алма значит яблоко.", kz: "Алма деген сөз - apple." },
  },
  {
    icon: "💧",
    prompt: { en: "Water", ru: "Вода", kz: "Су" },
    answer: "су",
    options: ["дала", "су", "тау", "алма"],
    fact: { en: "Су means water.", ru: "Су значит вода.", kz: "Су деген сөз - water." },
  },
  {
    icon: "🌾",
    prompt: { en: "Steppe", ru: "Степь", kz: "Дала" },
    answer: "дала",
    options: ["дала", "алма", "түйе", "тау"],
    fact: { en: "Дала means steppe.", ru: "Дала значит степь.", kz: "Дала деген сөз - steppe." },
  },
];

const getToday = () => new Date().toISOString().slice(0, 10);

const patternQuestions = [
  {
    sequence: ["🍬", "🍫", "🍬", "🍫", "?"],
    answer: "🍬",
    options: ["🍬", "🍭", "🐫"],
    rule: { en: "The sweets alternate.", ru: "Сладости чередуются.", kz: "Тәттілер кезектесіп тұр." },
  },
  {
    sequence: ["1", "2", "4", "7", "?"],
    answer: "11",
    options: ["9", "10", "11"],
    rule: { en: "Add 1, then 2, then 3, then 4.", ru: "Прибавляй 1, потом 2, потом 3, потом 4.", kz: "Алдымен 1, кейін 2, кейін 3, кейін 4 қос." },
  },
  {
    sequence: ["🔴", "🔵", "🔵", "🔴", "🔵", "🔵", "?"],
    answer: "🔴",
    options: ["🔴", "🔵", "🟡"],
    rule: { en: "One red, then two blue repeats.", ru: "Повторяется: один красный, два синих.", kz: "Бір қызыл, екі көк қайталанады." },
  },
];

const cultureQuestions = [
  {
    prompt: { en: "Which place is famous for Baiterek?", ru: "Какой город известен Байтереком?", kz: "Бәйтерек қай қалада орналасқан?" },
    answer: "Astana",
    options: ["Astana", "Almaty", "Turkestan"],
    fact: { en: "Baiterek is a landmark in Astana.", ru: "Байтерек - символ Астаны.", kz: "Бәйтерек - Астананың көрнекті орны." },
  },
  {
    prompt: { en: "Which city is known for mountains nearby?", ru: "Какой город известен горами рядом?", kz: "Қай қала тауларымен белгілі?" },
    answer: "Almaty",
    options: ["Shymkent", "Almaty", "Karaganda"],
    fact: { en: "Almaty sits near the Ile Alatau mountains.", ru: "Алматы находится у гор Заилийского Алатау.", kz: "Алматы Іле Алатауының жанында орналасқан." },
  },
  {
    prompt: { en: "Which city is linked with the Mausoleum of Khoja Ahmed Yasawi?", ru: "Какой город связан с мавзолеем Ходжи Ахмеда Ясави?", kz: "Қожа Ахмет Ясауи кесенесі қай қалада?" },
    answer: "Turkestan",
    options: ["Turkestan", "Astana", "Atyrau"],
    fact: { en: "Turkestan is one of Kazakhstan's historic cultural centers.", ru: "Туркестан - один из исторических культурных центров Казахстана.", kz: "Түркістан - Қазақстанның тарихи мәдени орталықтарының бірі." },
  },
];

const GAME_COPY: Record<string, { title: LocalizedText; instruction: Record<keyof AdaptiveInstruction, LocalizedText> }> = {
  memory: {
    title: { en: "Collect the Sweets", ru: "Собери сладости", kz: "Тәттілерді жина" },
    instruction: {
      default: { en: "Flip two cards and find every matching pair.", ru: "Открой две карточки и найди все пары.", kz: "Екі картаны ашып, барлық жұптарды тап." },
      simple: { en: "Tap two cards. If they match, they stay open.", ru: "Нажми две карточки. Если они пара, они останутся открытыми.", kz: "Екі картаны бас. Жұп болса, ашық қалады." },
      audioText: { en: "Flip two cards at a time and find every matching pair of sweets.", ru: "Открывай по две карточки и находи одинаковые сладости.", kz: "Екі картаны ашып, бірдей тәттілерді тап." },
    },
  },
  words: {
    title: { en: "Find the Kazakh Word", ru: "Найди казахское слово", kz: "Қазақ сөзін тап" },
    instruction: {
      default: { en: "Choose the Kazakh word that matches the picture.", ru: "Выбери казахское слово к картинке.", kz: "Суретке сәйкес қазақ сөзін таңда." },
      simple: { en: "Find the word for this picture.", ru: "Найди слово для картинки.", kz: "Осы суретке сөз тап." },
      audioText: { en: "Look at the picture and choose the correct Kazakh word.", ru: "Посмотри на картинку и выбери правильное казахское слово.", kz: "Суретке қарап, дұрыс қазақ сөзін таңда." },
    },
  },
  math: {
    title: { en: "Counting with Bota", ru: "Счёт с Ботой", kz: "Ботамен санау" },
    instruction: {
      default: { en: "Pick the correct answer.", ru: "Выбери правильный ответ.", kz: "Дұрыс жауапты таңда." },
      simple: { en: "Choose the right answer for the question.", ru: "Выбери верный ответ на вопрос.", kz: "Сұраққа дұрыс жауапты таңда." },
      audioText: { en: "Read the question and pick the correct answer.", ru: "Прочитай вопрос и выбери правильный ответ.", kz: "Сұрақты оқып, дұрыс жауапты таңда." },
    },
  },
  patterns: {
    title: { en: "Pattern Caravan", ru: "Караван узоров", kz: "Өрнек керуені" },
    instruction: {
      default: { en: "Find what comes next in the pattern.", ru: "Найди, что будет дальше в узоре.", kz: "Өрнекте келесі не екенін тап." },
      simple: { en: "What comes next in the pattern?", ru: "Что идёт дальше?", kz: "Келесі не болады?" },
      audioText: { en: "Look at the pattern and choose what comes next.", ru: "Посмотри на узор и выбери следующий элемент.", kz: "Өрнекке қарап, келесі элементті таңда." },
    },
  },
  culture: {
    title: { en: "Culture Match", ru: "Культурное совпадение", kz: "Мәдениет сәйкестігі" },
    instruction: {
      default: { en: "Match Kazakhstan places with the right fact.", ru: "Соедини места Казахстана с правильным фактом.", kz: "Қазақстан орындарын дұрыс дерекпен сәйкестендір." },
      simple: { en: "Pick the right city for the clue.", ru: "Выбери город по подсказке.", kz: "Кеңеске сәйкес қаланы таңда." },
      audioText: { en: "Read the clue and choose the matching place in Kazakhstan.", ru: "Прочитай подсказку и выбери подходящее место в Казахстане.", kz: "Кеңесті оқып, Қазақстандағы дұрыс орынды таңда." },
    },
  },
};

function gameTitle(gameId: keyof typeof GAME_COPY, language: Language): string {
  return pickText(GAME_COPY[gameId].title, language);
}

function gameInstruction(gameId: keyof typeof GAME_COPY, language: Language): AdaptiveInstruction {
  const instruction = GAME_COPY[gameId].instruction;
  return {
    default: pickText(instruction.default, language),
    simple: pickText(instruction.simple, language),
    audioText: pickText(instruction.audioText, language),
  };
}

const MATH_PROMPTS: Record<string, LocalizedText> = {
  "Bota had 3 sweets and found 2 more. How many?": {
    en: "Bota had 3 sweets and found 2 more. How many?",
    ru: "У Боты было 3 сладости, он нашёл ещё 2. Сколько стало?",
    kz: "Ботада 3 тәтті болды, тағы 2 тапты. Барлығы неше?",
  },
  "There are 4 apples and 3 more arrive. Total?": {
    en: "There are 4 apples and 3 more arrive. Total?",
    ru: "Есть 4 яблока, добавили ещё 3. Сколько всего?",
    kz: "4 алма бар, тағы 3 алма қосылды. Барлығы неше?",
  },
  "Bota sees 5 stars and 5 more. Total?": {
    en: "Bota sees 5 stars and 5 more. Total?",
    ru: "Бота видит 5 звёзд и ещё 5. Сколько всего?",
    kz: "Бота 5 жұлдыз және тағы 5 жұлдыз көрді. Барлығы неше?",
  },
  "Bota has 14 sweets and shares 5. How many remain?": {
    en: "Bota has 14 sweets and shares 5. How many remain?",
    ru: "У Боты 14 сладостей, он поделился 5. Сколько осталось?",
    kz: "Ботада 14 тәтті бар, 5 тәттіні берді. Қанша қалды?",
  },
  "A basket has 8 apples. Add 7 more. Total?": {
    en: "A basket has 8 apples. Add 7 more. Total?",
    ru: "В корзине 8 яблок. Добавили ещё 7. Сколько всего?",
    kz: "Себетте 8 алма бар. Тағы 7 алма қосылды. Барлығы неше?",
  },
  "20 coins minus 6 coins equals?": {
    en: "20 coins minus 6 coins equals?",
    ru: "20 монет минус 6 монет равно?",
    kz: "20 тиыннан 6 тиын алсақ, қанша қалады?",
  },
  "Bota packs 3 boxes with 4 sweets each. Total?": {
    en: "Bota packs 3 boxes with 4 sweets each. Total?",
    ru: "Бота кладёт по 4 сладости в 3 коробки. Сколько всего?",
    kz: "Бота 3 қорапқа 4 тәттіден салды. Барлығы неше?",
  },
  "Two families each get 6 candies. Total?": {
    en: "Two families each get 6 candies. Total?",
    ru: "Две семьи получили по 6 конфет. Сколько всего?",
    kz: "Екі отбасы 6 кәмпиттен алды. Барлығы неше?",
  },
  "Which number completes 5, 10, 15, ?": {
    en: "Which number completes 5, 10, 15, ?",
    ru: "Какое число продолжит ряд 5, 10, 15, ?",
    kz: "5, 10, 15, ? қатарын қай сан жалғастырады?",
  },
};

function localizedMathPrompt(prompt: string, language: Language): string {
  return MATH_PROMPTS[prompt] ? pickText(MATH_PROMPTS[prompt], language) : prompt;
}

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
  const [view, setView] = useState<View>("landing");
  const [landingLang, setLandingLang] = useState<Language>("en");
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
    const withTasks = checkDailyTaskProgress(nextProfile, {
      gamesPlayed: 1,
      coinsEarned: award.coinsEarned,
      stickersCollected: stickersUnlocked.length,
    });
    setProfile(withTasks);
    setResult(nextResult);
    setView("result");
  };

  const scanQrItem = (itemId: string) => {
    if (!profile) return;
    const item = QR_ITEMS.find((entry) => entry.id === itemId);
    if (!item) return;
    const result = applyQrItemScan(profile, item);
    const withTasks = checkDailyTaskProgress(result.profile, {
      coinsEarned: result.coinsEarned,
      stickersCollected: result.stickerUnlocked ? 1 : 0,
    });
    setProfile(withTasks);
    setQrMessage(result.alreadyScanned ? `${item.productName} already collected.` : item.unlockMessage);
  };

  const resetProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setResult(null);
    setView("onboarding");
  };

  useEffect(() => {
    if (!profile) return;
    const today = getToday();
    const updated = updateStreak(profile, today);
    if (updated !== profile) setProfile(updated);
  }, []);

  const trackDailyTaskEvent = useCallback((event: DailyTaskEvent) => {
    setProfile((p) => p ? checkDailyTaskProgress(p, event) : p);
  }, []);

  const openDailyChest = () => {
    if (!profile) return;
    const update = applyDailyChest(profile, getToday());
    setProfile(update.profile);
    trackDailyTaskEvent({ chestsOpened: 1, coinsEarned: update.coinsEarned });
  };

  const speak = useCallback(
    (text: string) => {
      const runBrowser = () => {
        cancelVoicePlayback();
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const lang = profile?.language === "kz" ? "kk-KZ" : "ru-RU";
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
      };

      void speakText(text, profile?.language ?? "ru")
        .then((ok) => {
          if (!ok) runBrowser();
        })
        .catch(() => runBrowser());
    },
    [profile?.language],
  );

  useEffect(() => {
    if (!profile) return;
    const s = profile.adaptiveProfile.settings;
    if (!s.botaVoiceGuide) return;
    const key = `welcome_${view}` as string;
    const text = uiStr(key, profile.language);
    if (text !== key) {
      const t = window.setTimeout(() => speak(text), 600);
      return () => window.clearTimeout(t);
    }
  }, [view, profile?.language, profile?.adaptiveProfile.settings.botaVoiceGuide]);

  useEffect(() => {
    if (!profile) return;
    const s = profile.adaptiveProfile.settings;
    if (!s.botaVoiceGuide) return;
    const gameViews: View[] = ["memory", "words", "math", "patterns", "culture"];
    if (!gameViews.includes(view)) return;
    const t = window.setTimeout(() => {
      speak(uiStr("stuck_hint", profile.language));
    }, 15000);
    return () => window.clearTimeout(t);
  }, [view, profile?.language, profile?.adaptiveProfile.settings.botaVoiceGuide]);

  const showChildHub =
    Boolean(profile) &&
    (view === "map" ||
      view === "album" ||
      view === "garden" ||
      view === "rewards" ||
      view === "qr" ||
      view === "daily-chest" ||
      view === "daily-tasks" ||
      view === "photo-frame" ||
      view === "leaderboard");
  const voiceContext = useMemo<VoiceAgentContext | null>(() => {
    if (!profile) return null;
    return {
      view,
      language: profile.language,
      coins: profile.coins,
      screenSummary: buildVoiceScreenSummary(profile, view, gameInstructionRef.current, result),
      instructionTitle: gameInstructionRef.current.title,
      instructionHint: gameInstructionRef.current.hint,
      allowedCommands: getAllowedVoiceCommands(view),
    };
  }, [profile, view, result]);

  return (
    <main className={className}>
      <div className={`phone ${showChildHub ? "phone--with-hub" : ""} ${view === "landing" ? "phone--landing" : ""}`}>
        <div className="phone-body">
          {profile && view !== "onboarding" && view !== "landing" && (
            <TopBar profile={profile} onMap={() => setView("map")} onRewards={() => setView("rewards")} onParent={() => setView("parent-pin")} onLangChange={(l) => setProfile((p) => p ? { ...p, language: l } : p)} />
          )}
          {view === "landing" && (
            <Landing
              savedName={loadProfile()?.name ?? null}
              lang={landingLang}
              onLang={setLandingLang}
              onStart={() => setView("onboarding")}
              onContinue={() => {
                const saved = loadProfile();
                if (saved) { setProfile({ ...saved, language: landingLang }); setView("map"); }
                else setView("onboarding");
              }}
            />
          )}
          {view === "onboarding" && <Onboarding initialLanguage={landingLang} onStart={(next) => { setProfile(next); setView("adaptive-profile-result"); }} />}
          {profile && view === "adaptive-profile-result" && <AdaptiveProfileResult profile={profile} onContinue={() => setView("map")} />}
          {profile && view === "map" && <MapScreen profile={profile} onGo={setView} />}
          {profile && view === "garden" && <SkillGarden profile={profile} onBack={() => setView("map")} />}
          {profile && view === "memory" && (
            <MemoryGame
              language={profile.language}
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={() =>
                awardGame({ gameId: "memory", title: gameTitle("memory", profile.language), score: 100, skill: "memory", badge: "Memory Master" }, 20, 10, "sticker-almaty-mountains")
              }
              onSpeak={speak}
            />
          )}
          {profile && view === "words" && (
            <WordsGame
              language={profile.language}
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={(score) =>
                awardGame({ gameId: "words", title: gameTitle("words", profile.language), score, skill: "language", badge: "Kazakh Word Explorer" }, 20, score === 100 ? 10 : 0, "sticker-turkestan")
              }
              onSpeak={speak}
            />
          )}
          {profile && view === "math" && (
            <MathGame
              age={profile.age}
              language={profile.language}
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={(score) =>
                awardGame({ gameId: "math", title: gameTitle("math", profile.language), score, skill: "math", badge: "Young Mathematician" }, 20, score >= 80 ? 10 : 0, "sticker-baiterek")
              }
              onSpeak={speak}
            />
          )}
          {profile && view === "patterns" && (
            <PatternGame
              language={profile.language}
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={(score) => awardGame({ gameId: "patterns", title: gameTitle("patterns", profile.language), score, skill: "logic", badge: "Pattern Pathfinder" }, 20, score === 100 ? 10 : 0)}
              onSpeak={speak}
            />
          )}
          {profile && view === "culture" && (
            <CultureGame
              language={profile.language}
              accessibility={profile.adaptiveProfile.settings}
              onRegisterInstruction={registerGameInstruction}
              onDone={(score) => awardGame({ gameId: "culture", title: gameTitle("culture", profile.language), score, skill: "culture", badge: "Culture Explorer" }, 20, score === 100 ? 10 : 0)}
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
              onPhotoFrame={() => setView("photo-frame")}
              language={profile.language}
            />
          )}
          {profile && view === "rewards" && <RewardsShop profile={profile} onMap={() => setView("map")} onAlbum={() => setView("album")} onParent={() => setView("parent-pin")} />}
          {profile && view === "daily-chest" && <DailyChest profile={profile} onOpen={openDailyChest} onBack={() => setView("map")} onSpeak={speak} onTasks={() => setView("daily-tasks")} />}
          {profile && view === "daily-tasks" && <DailyTasksScreen profile={profile} onBack={() => setView("daily-chest")} />}
          {profile && view === "album" && <StickerAlbum profile={profile} onBack={() => setView("map")} />}
          {profile && view === "parent-pin" && (
            <ParentPin accessibility={profile.adaptiveProfile.settings} language={profile.language} onSpeak={speak} onSuccess={() => setView("parent")} />
          )}
          {profile && view === "parent" && (
            <ParentDashboard
              profile={profile}
              onChange={(next) => setProfile(next)}
              onAlbum={() => setView("album")}
              onGarden={() => setView("garden")}
              onSettings={() => setView("accessibility")}
              onQr={() => setView("qr")}
              onReset={resetProgress}
            />
          )}
          {profile && view === "accessibility" && <AccessibilityPanel profile={profile} onChange={setProfile} onBack={() => setView("parent")} />}
          {profile && view === "qr" && <QrCollection profile={profile} items={QR_ITEMS} message={qrMessage} onScan={scanQrItem} onSecret={() => setView("secret")} onSpeak={speak} />}
          {profile && view === "secret" && <SecretLocation onMap={() => setView("map")} />}
          {profile && view === "photo-frame" && <BotaPhotoFrame profile={profile} onBack={() => setView("rewards")} />}
          {profile && view === "leaderboard" && <Leaderboard profile={profile} onBack={() => setView("map")} />}
        </div>
        {showChildHub && <ChildHubNav active={view as HubTabView} onGo={setView} onParent={() => setView("parent-pin")} lang={profile?.language ?? "en"} />}
        {profile && (
          <BotaVoiceGuide
            profile={profile}
            view={view}
            showChildHub={showChildHub}
            lastInstructionRef={gameInstructionRef}
            voiceContext={voiceContext}
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
  voiceContext,
  speak,
  setView,
  setProfile,
}: {
  profile: UserProfile;
  view: View;
  showChildHub: boolean;
  lastInstructionRef: React.MutableRefObject<{ title: string; hint: string }>;
  voiceContext: VoiceAgentContext | null;
  speak: (text: string) => void;
  setView: (v: View) => void;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}) {
  const [open, setOpen] = useState(false);
  const [coinFlash, setCoinFlash] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [listenStatus, setListenStatus] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const ignoreRecordingRef = useRef(false);
  const settings = profile.adaptiveProfile.settings;
  const enabled = settings.botaVoiceGuide || settings.voiceInstructions || settings.voiceNavigation;
  const hidden =
    view === "onboarding" ||
    view === "adaptive-profile-result" ||
    view === "parent-pin" ||
    view === "parent" ||
    view === "accessibility";

  const cleanupRecordingResources = () => {
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const stopListening = (ignore = false) => {
    ignoreRecordingRef.current = ignore;
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupRecordingResources();
    }
    setIsListening(false);
  };

  useEffect(() => {
    if (!enabled || hidden) stopListening(true);
    return () => stopListening(true);
  }, [enabled, hidden]);

  if (!enabled || hidden) return null;

  const confirmIfVoice = (phrase: string) => {
    if (settings.voiceInstructions) speak(phrase);
  };

  const run = (cmd: VoiceCommand, options?: { closePanel?: boolean }) => {
    switch (cmd) {
      case "open_map":
        setView("map");
        confirmIfVoice("Opening the map.");
        break;
      case "open_memory_game":
        setView("memory");
        confirmIfVoice("Opening Collect the Sweets.");
        break;
      case "open_words_game":
        setView("words");
        confirmIfVoice("Opening Find the Kazakh Word.");
        break;
      case "open_math_game":
        setView("math");
        confirmIfVoice("Opening Counting with Bota.");
        break;
      case "open_patterns_game":
        setView("patterns");
        confirmIfVoice("Opening Pattern Caravan.");
        break;
      case "open_culture_game":
        setView("culture");
        confirmIfVoice("Opening Culture Match.");
        break;
      case "open_rewards":
        setView("rewards");
        confirmIfVoice("Opening rewards.");
        break;
      case "open_album":
        setView("album");
        confirmIfVoice("Opening the sticker album.");
        break;
      case "open_garden":
        setView("garden");
        confirmIfVoice("Opening the skill garden.");
        break;
      case "open_qr":
        setView("qr");
        confirmIfVoice("Opening package collection.");
        break;
      case "open_daily_chest":
        setView("daily-chest");
        confirmIfVoice("Opening the daily chest.");
        break;
      case "open_daily_tasks":
        setView("daily-tasks");
        confirmIfVoice("Opening daily tasks.");
        break;
      case "open_photo_frame":
        setView("photo-frame");
        confirmIfVoice("Opening photo frame.");
        break;
      case "open_leaderboard":
        setView("leaderboard");
        confirmIfVoice("Opening leaderboard.");
        break;
      case "repeat_instruction": {
        const { hint, title } = lastInstructionRef.current;
        const line = hint ? `${title ? `${title}. ` : ""}${hint}` : "Pick a quest on the map to hear a game instruction.";
        speak(line);
        break;
      }
      case "read_current_screen":
        if (voiceContext?.screenSummary) speak(voiceContext.screenSummary);
        break;
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
          const nextSettings = { ...p.adaptiveProfile.settings, largeText: true };
          return {
            ...p,
            adaptiveProfile: {
              ...p.adaptiveProfile,
              settings: nextSettings,
              recommendationSummary: buildRecommendationSummary(p.adaptiveProfile.supportNeeds, nextSettings),
            },
          };
        });
        confirmIfVoice("Large text is on.");
        break;
      default:
        break;
    }
    if (options?.closePanel !== false) setOpen(false);
  };

  const startListening = () => {
    if (!settings.voiceNavigation) return;
    if (!voiceContext) {
      setListenStatus("Voice context is not ready yet.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      const line = "Microphone recording is not supported in this browser.";
      setListenStatus(line);
      confirmIfVoice(line);
      return;
    }

    if (isListening) {
      setListenStatus("Processing your voice...");
      stopListening(false);
      return;
    }

    void (async () => {
      try {
        cancelVoicePlayback();
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
        const mimeType =
          preferredMimeTypes.find((type) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(type)) || "";
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

        ignoreRecordingRef.current = false;
        recordedChunksRef.current = [];
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };

        recorder.onerror = () => {
          cleanupRecordingResources();
          setIsListening(false);
          const line = "Voice recording failed. Please try again.";
          setListenStatus(line);
          confirmIfVoice(line);
        };

        recorder.onstop = () => {
          const ignore = ignoreRecordingRef.current;
          const recordedParts = recordedChunksRef.current;
          ignoreRecordingRef.current = false;
          recordedChunksRef.current = [];
          const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
          cleanupRecordingResources();
          if (ignore) return;

          const blob = new Blob(recordedParts, { type: finalMimeType });
          if (blob.size === 0) {
            setListenStatus("I did not hear anything. Please try again.");
            return;
          }

          setListenStatus("Transcribing your voice...");
          void (async () => {
            try {
              const { transcript } = await transcribeAudio(blob, profile.language);
              if (!transcript) {
                setListenStatus("I did not hear a clear command.");
                return;
              }

              const resolution = await resolveVoiceCommand(transcript, voiceContext);
              if (!resolution.action) {
                setListenStatus(resolution.replyText);
                confirmIfVoice(resolution.replyText);
                return;
              }

              setListenStatus(`Heard: ${transcript}`);
              run(resolution.action);
            } catch (error) {
              const line = error instanceof Error ? error.message : "Voice control could not process that.";
              setListenStatus(line);
              confirmIfVoice(line);
            }
          })();
        };

        setOpen(true);
        setIsListening(true);
        setListenStatus("Listening for a command...");
        recorder.start();
        recordingTimeoutRef.current = window.setTimeout(() => {
          setListenStatus("Processing your voice...");
          stopListening(false);
        }, 4500);
      } catch (error) {
        cleanupRecordingResources();
        setIsListening(false);
        const line =
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Microphone permission is blocked."
            : "Voice control could not start.";
        setListenStatus(line);
        confirmIfVoice(line);
      }
    })();
  };

  const chips: { cmd: VoiceCommand; label: string }[] = [
    { cmd: "open_map", label: "Open map" },
    { cmd: "open_memory_game", label: "Open memory game" },
    { cmd: "open_words_game", label: "Open word game" },
    { cmd: "open_math_game", label: "Open math game" },
    { cmd: "open_patterns_game", label: "Open pattern game" },
    { cmd: "open_culture_game", label: "Open culture game" },
    { cmd: "open_rewards", label: "Open rewards" },
    { cmd: "open_album", label: "Open album" },
    { cmd: "open_garden", label: "Open garden" },
    { cmd: "open_qr", label: "Open QR" },
    { cmd: "open_daily_chest", label: "Open chest" },
    { cmd: "open_daily_tasks", label: "Daily tasks" },
    { cmd: "open_photo_frame", label: "Photo frame" },
    { cmd: "open_leaderboard", label: "Leaderboard" },
    { cmd: "repeat_instruction", label: "Repeat instruction" },
    { cmd: "read_current_screen", label: "Read this screen" },
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
          <p className="voice-guide-lead">Tap a command or use the microphone. Everything still works with buttons if voice is unavailable.</p>
          {settings.voiceNavigation && (
            <div className="voice-guide-actions">
              <button
                type="button"
                className={`voice-guide-listen ${isListening ? "listening" : ""}`}
                onClick={startListening}
                aria-pressed={isListening}
              >
                {isListening ? "Stop listening" : "Start listening"}
              </button>
              <small>Try: "open map", "open rewards", "show coins"</small>
            </div>
          )}
          <div className="voice-guide-chips">
            {chips.map(({ cmd, label }) => (
              <button key={cmd} type="button" className="voice-guide-chip" onClick={() => run(cmd)}>
                {label}
              </button>
            ))}
          </div>
          {listenStatus && <p className="voice-guide-status" role="status">{listenStatus}</p>}
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

function TopBar({ profile, onMap, onRewards, onParent, onLangChange }: { profile: UserProfile; onMap: () => void; onRewards: () => void; onParent: () => void; onLangChange: (l: Language) => void }) {
  const t = (k: string) => uiStr(k, profile.language);
  return (
    <header className="topbar">
      <button className="icon-button" onClick={onMap} aria-label={t("open_map")}>🗺️</button>
      <div className="brand-lockup">
        <strong>Bota Quest</strong>
        <span>🪙 {profile.coins} {t("coins_label")}</span>
      </div>
      <div className="top-actions">
        <div className="lang-switch">
          {LANGUAGE_OPTIONS.map((l) => (
            <button
              key={l.code}
              className={`lang-btn ${profile.language === l.code ? "lang-btn--active" : ""}`}
              onClick={() => onLangChange(l.code)}
              aria-label={l.label}
            >
              {l.flag}
            </button>
          ))}
        </div>
        <button className="icon-button" onClick={onRewards} aria-label={t("open_rewards")}>🎁</button>
        <button className="icon-button" onClick={onParent} aria-label={t("parent_pin_title")}>🔒</button>
      </div>
    </header>
  );
}

function PageHeader({ eyebrow, title, lead, center = false }: { eyebrow: string; title: string; lead?: string; center?: boolean }) {
  return (
    <div className={`page-header ${center ? "page-header--center" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {lead ? <p className="lead">{lead}</p> : null}
    </div>
  );
}

type HubTabView = "map" | "album" | "garden" | "rewards" | "qr" | "daily-chest" | "daily-tasks" | "photo-frame" | "leaderboard";

function ChildHubNav({ active, onGo, onParent, lang }: { active: HubTabView; onGo: (view: View) => void; onParent: () => void; lang: Language }) {
  const t = (k: string) => uiStr(k, lang);
  const tabs: { view: HubTabView; icon: string; label: string }[] = [
    { view: "map", icon: "🗺️", label: t("open_map") },
    { view: "album", icon: "📔", label: t("open_album") },
    { view: "garden", icon: "🌱", label: t("open_garden") },
    { view: "rewards", icon: "🎁", label: t("open_rewards") },
    { view: "qr", icon: "📦", label: t("open_qr") },
    { view: "daily-chest", icon: "🧰", label: t("open_chest") },
    { view: "leaderboard", icon: "🏆", label: t("open_leaderboard") },
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

function Onboarding({ initialLanguage, onStart }: { initialLanguage: Language; onStart: (profile: UserProfile) => void }) {
  type Step = "profile" | "comfort";
  const [step, setStep] = useState<Step>("profile");
  const [name, setName] = useState("Amina");
  const [age, setAge] = useState<Age>(8);
  const [language, setLanguage] = useState<Language>(initialLanguage);
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

  const t = (k: string) => uiStr(k, language);

  return (
    <section className={`screen hero-screen ${step === "comfort" ? "comfort-screen" : "onboarding-screen"}`}>
      <div className="mascot">🐫</div>
      <h1>Bota Quest</h1>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>{t("onb_intro")}</p>
      </div>
      {step === "profile" ? (
        <form className="panel onboarding-card" onSubmit={nextFromProfile}>
          <label>
            {t("onb_whats_name")}
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="..." />
          </label>
          <label>
            {t("onb_how_old")}
            <select value={age} onChange={(event) => setAge(Number(event.target.value) as Age)}>
              {[7, 8, 9, 10, 11].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>{t("onb_pick_lang")}</legend>
            <div className="segmented">
              <button type="button" className={language === "kz" ? "active" : ""} onClick={() => setLanguage("kz")}>
                🇰🇿 Қазақша
              </button>
              <button type="button" className={language === "ru" ? "active" : ""} onClick={() => setLanguage("ru")}>
                🇷🇺 Русский
              </button>
              <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>
                🇬🇧 English
              </button>
            </div>
          </fieldset>
          <div className="cta-row">
            <button className="primary" type="submit">
              {t("onb_next_comfort")}
            </button>
            <button type="button" onClick={() => startWithNeeds(["standard"], "default")}>
              {t("onb_skip")}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="eyebrow">{t("onb_comfort_title")}</p>
          <h2>{t("onb_comfort_subtitle")}</h2>
          <p className="lead">{t("onb_comfort_subtitle")}</p>

          {(() => {
            const settings = buildAccessibilitySettings(normalizedNeeds);
            const summary = buildRecommendationSummary(normalizedNeeds, settings);
            if (!summary.length) return null;
            return (
              <div className="panel comfort-summary-card">
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
              {t("onb_create_profile")}
            </button>
            <button type="button" onClick={() => startWithNeeds(["standard"], "default")}>
              {t("onb_skip")}
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
    settings.voiceNavigation ? "Voice navigation" : null,
    settings.noTimer ? "No timer" : null,
    settings.reducedAnimations ? "Reduced animations" : null,
    settings.gestureAnswerMode ? "Gesture Answer Mode (mock)" : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <section className="screen center adaptive-ready-screen">
      <PageHeader
        eyebrow="Adaptive profile"
        title={`Botara is ready for ${profile.name}.`}
        lead="We adjusted the app to make learning more comfortable. You can change these settings anytime in Parent Mode."
        center
      />

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
        Continue to the map
      </button>
    </section>
  );
}

function MapScreen({ profile, onGo }: { profile: UserProfile; onGo: (view: View) => void }) {
  const completedCount = locations.filter((location) => location.gameId && profile.completedGames.includes(location.gameId)).length;
  const nextQuest = locations.find((location) => location.gameId && !profile.completedGames.includes(location.gameId));
  const today = getToday();
  const chestOpened = profile.openedDailyChestDates.includes(today);
  const t = (key: string) => uiStr(key, profile.language);
  return (
    <section className="screen map-screen">
      <div className="map-hero">
        <div className="map-copy">
          <p className="eyebrow">{t("open_map")}</p>
          <h2>{t("map_title")}, {profile.name}?</h2>
          <p className="lead">{t("map_lead")}</p>
        </div>
        <div className="progress-card">
          <span>{completedCount}/{CORE_LOCATION_IDS.length}</span>
          <strong>{t("map_quests_complete")}</strong>
        </div>
      </div>
      <div className="desktop-map-layout">
        <div className="kazakhstan-map" aria-label="Interactive Kazakhstan quest map">
          <img className="real-map" src="/assets/kazakhstan-map.svg" alt="Map of Kazakhstan" />
          <div className="map-overlay">
            {locations.map((location) => {
              const unlocked = profile.unlockedLocations.includes(location.id);
              const completed = location.gameId ? profile.completedGames.includes(location.gameId) : false;
              return (
                <button
                  key={location.id}
                  className={`map-pin location-${location.id} ${unlocked ? "" : "locked"} ${completed ? "completed" : ""}`}
                  disabled={!unlocked}
                  style={getLocationPositionPct(location)}
                  onClick={() => (location.gameId ? onGo(location.gameId) : onGo("secret"))}
                  aria-label={`${locationCity(location, profile.language)}: ${locationTitle(location, profile.language)}`}
                >
                  <span className="pin-icon">{completed ? "✓" : unlocked ? location.icon : "🔒"}</span>
                  <span className="pin-label">
                    <strong>{locationCity(location, profile.language)}</strong>
                    <small>{locationTitle(location, profile.language)}</small>
                    <em>{completed ? t("completed") : unlocked ? locationSkill(location, profile.language) : t("scan_camera")}</em>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="map-credit">Map: Wikimedia Commons, Incall, CC BY-SA 4.0</p>
        </div>
        <aside className="quest-panel">
          <div className="guide-card">
            <div className="guide-avatar">🐫</div>
            <div>
              <p>{nextQuest ? t("map_tap_city") : t("map_all_done")}</p>
              <strong>{nextQuest ? `${t("map_try_next")} ${locationCity(nextQuest, profile.language)}` : t("map_all_done")}</strong>
            </div>
          </div>
          <div className="quest-list">
            {locations.map((location) => {
              const unlocked = profile.unlockedLocations.includes(location.id);
              const completed = location.gameId ? profile.completedGames.includes(location.gameId) : false;
              return (
                <button key={location.id} className={`quest-row ${completed ? "completed" : ""}`} disabled={!unlocked} onClick={() => location.gameId ? onGo(location.gameId) : onGo("secret")}>
            <span>{completed ? "✓" : unlocked ? location.icon : "🔒"}</span>
                  <strong>{locationCity(location, profile.language)}</strong>
                  <small>{completed ? t("completed") : locationTitle(location, profile.language)}</small>
                </button>
              );
            })}
          </div>
          <div className="daily-chest-card">
            <div className="daily-chest-icon">🧰</div>
            <div className="daily-chest-content">
              <p className="eyebrow">{t("open_chest")}</p>
              <h3>{chestOpened ? t("chest_title_done") : t("chest_title_open")}</h3>
              <p className="daily-caption">
                {chestOpened
                  ? t("chest_come_back")
                  : `+${DAILY_CHEST_REWARD.coins} ${t("coins_label")} · ${t("chest_fact_label")}`}
              </p>
              <div className={`daily-status ${chestOpened ? "opened" : "ready"}`}>
                {chestOpened ? t("completed") : t("ready")}
              </div>
            </div>
            <button className="primary" onClick={() => onGo("daily-chest")}>
              {chestOpened ? t("open_rewards") : t("open_chest")}
            </button>
          </div>
          <div className="cta-row">
            <button onClick={() => onGo("garden")}>{t("open_garden")}</button>
            <button onClick={() => onGo("album")}>{t("open_album")}</button>
            <button onClick={() => onGo("qr")}>{t("open_qr")}</button>
            <button onClick={() => onGo("rewards")}>{t("open_rewards")}</button>
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
  const t = (key: string) => uiStr(key, profile.language);
  return (
    <section className="screen skill-garden-screen">
      <PageHeader
        eyebrow={t("open_garden")}
        title={t("garden_title")}
        lead={t("garden_lead")}
      />
      <div className="skill-garden-total">
        <strong>{t("garden_total")} {total}</strong>
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
        {t("result_back_map")}
      </button>
    </section>
  );
}

function DailyChest({
  profile,
  onOpen,
  onBack,
  onSpeak,
  onTasks,
}: {
  profile: UserProfile;
  onOpen: () => void;
  onBack: () => void;
  onSpeak: (text: string) => void;
  onTasks: () => void;
}) {
  const today = getToday();
  const opened = profile.openedDailyChestDates.includes(today);
  const reward = DAILY_CHEST_REWARD;
  const rewardSticker = reward.stickerId ? STICKERS.find((sticker) => sticker.id === reward.stickerId) : null;
  const t = (key: string) => uiStr(key, profile.language);

  return (
    <section className="screen center daily-chest-screen">
      <div className="daily-chest-hero">
        <div className={`daily-chest-icon ${opened ? "opened" : ""}`}>🧰</div>
        <p className="eyebrow">{t("open_chest")}</p>
        <h2>{opened ? t("chest_title_done") : t("chest_title_open")}</h2>
        <p className="lead">
          {opened
            ? t("chest_come_back")
            : `+${reward.coins} ${t("coins_label")} · ${t("chest_fact_label")}`}
        </p>
      </div>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>{opened ? t("chest_opened") : t("welcome_daily_chest")}</p>
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
            <strong>{t("chest_fact_label")}</strong>
            <p>{reward.fact}</p>
          </div>
          {profile.adaptiveProfile.settings.voiceInstructions && (
            <button onClick={() => onSpeak(reward.fact)}>Read fact aloud</button>
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
            <button onClick={() => onSpeak(`Open today's chest for ${reward.coins} coins and a Kazakhstan fact.`)}>Read aloud</button>
          )}
          <button className="primary" onClick={onOpen}>{t("open_chest")}</button>
        </>
      )}
      {profile.currentStreak > 0 && (
        <div className="streak-counter">
          <span className="streak-flame">🔥</span>
          <strong>{profile.currentStreak} {uiStr("streak_label", profile.language)}</strong>
          {profile.longestStreak > profile.currentStreak && <small>Record: {profile.longestStreak}</small>}
        </div>
      )}
      <button className="primary" onClick={onTasks}>{uiStr("daily_tasks", profile.language)}</button>
      <button onClick={onBack}>{t("result_back_map")}</button>
    </section>
  );
}

function dailyTaskLabel(task: UserProfile["dailyTasks"][number], language: Language): string {
  if (task.type === "play_game") {
    return {
      en: `Play ${task.target} ${task.target === 1 ? "game" : "games"}`,
      ru: `Пройди ${task.target} ${task.target === 1 ? "игру" : "игры"}`,
      kz: `${task.target} ойын ойна`,
    }[language];
  }
  if (task.type === "earn_coins") {
    return {
      en: `Earn ${task.target} coins`,
      ru: `Заработай ${task.target} монет`,
      kz: `${task.target} тиын жина`,
    }[language];
  }
  if (task.type === "open_chest") {
    return uiStr("chest_title_open", language);
  }
  return {
    en: "Collect a sticker",
    ru: "Получи стикер",
    kz: "Стикер жина",
  }[language];
}

function DailyTasksScreen({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const lang = profile.language;
  const tasks = profile.dailyTasks;
  const allDone = tasks.length > 0 && tasks.every((t) => t.completed);

  return (
    <section className="screen daily-tasks-screen">
      <p className="eyebrow">{uiStr("daily_tasks", lang)}</p>
      <h2>{uiStr("daily_tasks", lang)}</h2>

      {profile.currentStreak > 0 && (
        <div className="streak-counter">
          <span className="streak-flame">🔥</span>
          <strong>{profile.currentStreak} {uiStr("streak_label", lang)}</strong>
        </div>
      )}

      <div className="streak-milestones">
        {STREAK_MILESTONES.map((m) => (
          <div key={m.days} className={`milestone ${profile.currentStreak >= m.days ? "reached" : ""}`}>
            <span>{m.days}🔥</span>
            <small>{m.label[lang]}</small>
          </div>
        ))}
      </div>

      {tasks.length === 0 ? (
        <p className="lead">
          {lang === "kz"
            ? "Бүгінгі тапсырмаларды ашу үшін алдымен сандықты аш."
            : lang === "ru"
              ? "Сначала открой сундук, чтобы активировать задания на сегодня."
              : "Open the daily chest first to activate today's tasks!"}
        </p>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <div key={task.id} className={`task-card ${task.completed ? "done" : ""}`}>
              <div className="task-card-top">
                <span>{task.completed ? "✅" : "⬜"}</span>
                <strong>{dailyTaskLabel(task, lang)}</strong>
                <span className="task-reward">+{task.rewardCoins} 🪙</span>
              </div>
              <div className="skill-bar">
                <span style={{ width: `${Math.min(100, (task.progress / task.target) * 100)}%` }} />
              </div>
              <small>{task.progress}/{task.target}</small>
            </div>
          ))}
        </div>
      )}

      {allDone && (
        <div className="garden-unlocked-banner">
          <strong>{uiStr("all_tasks_done", lang)}</strong>
        </div>
      )}

      <button className="primary" onClick={onBack}>{uiStr("back", lang)}</button>
    </section>
  );
}

function StickerAlbum({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const unlockedSet = new Set(profile.unlockedStickers);
  const unlockedCount = profile.unlockedStickers.length;
  const activeSticker = activeId ? STICKERS.find((sticker) => sticker.id === activeId) : null;
  const activeUnlocked = activeSticker ? unlockedSet.has(activeSticker.id) : false;
  const t = (key: string) => uiStr(key, profile.language);
  const detailText = activeSticker
    ? activeUnlocked
      ? activeSticker.description
      : "Keep playing quests to unlock this sticker."
    : "Tap a sticker to see its story.";

  return (
    <section className="screen album-screen">
      <PageHeader eyebrow={t("open_album")} title={t("album_title")} lead={t("album_lead")} />
      <div className="album-progress">{unlockedCount}/{STICKERS.length} {t("album_collected")}</div>
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
              <span className="sticker-title">{unlocked ? sticker.title : t("locked")}</span>
            </button>
          );
        })}
      </div>
      <div className="sticker-detail">
        <strong>{activeSticker ? activeSticker.title : "Sticker details"}</strong>
        <p>{detailText}</p>
      </div>
      <button className="primary" onClick={onBack}>{t("result_back_map")}</button>
    </section>
  );
}

const MEMORY_CARD_VOICE: Record<string, { ru: string; kz: string; en: string }> = {
  "🍬": { ru: "конфета", kz: "қант", en: "candy" },
  "🍫": { ru: "шоколад", kz: "шоколад", en: "chocolate" },
  "🍭": { ru: "леденец", kz: "тәтті сағыз", en: "lollipop" },
  "🐫": { ru: "верблюд", kz: "түйе", en: "camel" },
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
      const line = labels ? labels[language] : sym;
      queueMicrotask(() => onSpeak(line));
    }
    setFlipped((prev) => [...prev, index]);
  };

  const gridPairsClass = pairCount === 2 ? "memory-grid--pairs2" : pairCount === 3 ? "memory-grid--pairs3" : "memory-grid--pairs4";

  return (
    <GameShell
      title={gameTitle("memory", language)}
      instruction={gameInstruction("memory", language)}
      accessibility={accessibility}
      onSpeak={onSpeak}
      onRegisterInstruction={onRegisterInstruction}
      language={language}
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
  language,
  accessibility,
  onDone,
  onSpeak,
  onRegisterInstruction,
}: {
  language: Language;
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
      title={gameTitle("words", language)}
      instruction={gameInstruction("words", language)}
      accessibility={accessibility}
      onSpeak={onSpeak}
      onRegisterInstruction={onRegisterInstruction}
      language={language}
    >
      <div className="question-card">
        <div className="big-icon">{question.icon}</div>
        <h3>{pickText(question.prompt, language)}</h3>
        {hearingText && <p className="word-prompt-text">{gameInstruction("words", language).simple}</p>}
      </div>
      {accessibility.gestureAnswerMode && options.length > 0 && (
        <div className="gesture-box">
          <strong>Gesture Mode mock</strong>
          <p>👍 selects active answer. ✋ repeats instruction. 👉 moves to next option.</p>
          <div className="cta-row">
            <button type="button" onClick={() => setActive((active + 1) % options.length)}>👉 Next</button>
            <button type="button" onClick={() => onSpeak(gameInstruction("words", language).audioText)}>✋ Repeat</button>
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
          headline={lastOk ? uiStr("correct", language) : uiStr("try_again", language)}
          detail={lastOk ? pickText(question.fact, language) : pickText(question.fact, language)}
          accessibility={accessibility}
          onSpeak={onSpeak}
        />
      ) : null}
    </GameShell>
  );
}

function MathGame({
  age,
  language,
  accessibility,
  onDone,
  onSpeak,
  onRegisterInstruction,
}: {
  age: Age;
  language: Language;
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
    const hintLine = language === "en" ? mathStepHintForQuestion(question.prompt) : gameInstruction("math", language).simple;
    if (ok) {
      setAnswerFlash({ ok: true, detail: uiStr("correct", language) });
      window.setTimeout(() => {
        setAnswerFlash(null);
        advance(nextCorrect);
      }, 420);
    } else {
      setAnswerFlash({ ok: false, detail: hintLine });
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
    <GameShell title={gameTitle("math", language)} instruction={gameInstruction("math", language)} accessibility={accessibility} onSpeak={onSpeak} onRegisterInstruction={onRegisterInstruction} language={language}>
      <div className={`question-card${accessibility.largeText || accessibility.highContrast ? " question-card--math-large" : ""}`}>
        <h3>{localizedMathPrompt(question.prompt, language)}</h3>
        {focusMath && <p className="math-step-hint">{language === "en" ? mathStepHintForQuestion(question.prompt) : gameInstruction("math", language).simple}</p>}
        {readProblemAloud && (
          <button type="button" className="read-problem-btn" onClick={() => onSpeak(localizedMathPrompt(question.prompt, language))}>
            {uiStr("game_read_aloud", language)}
          </button>
        )}
      </div>
      {accessibility.gestureAnswerMode && (
        <div className="gesture-box">
          <strong>Gesture Mode mock</strong>
          <p>👍 selects active answer. ✋ repeats instruction. 👉 moves to next option.</p>
          <div className="cta-row">
            <button type="button" onClick={() => setActive((active + 1) % question.options.length)}>👉 Next</button>
            <button type="button" onClick={() => onSpeak(localizedMathPrompt(question.prompt, language))}>✋ Repeat</button>
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
          headline={answerFlash.ok ? uiStr("correct", language) : uiStr("try_again", language)}
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
  language,
  accessibility,
  onDone,
  onSpeak,
  onRegisterInstruction,
}: {
  language: Language;
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
    <GameShell title={gameTitle("patterns", language)} instruction={gameInstruction("patterns", language)} accessibility={accessibility} onSpeak={onSpeak} onRegisterInstruction={onRegisterInstruction} language={language}>
      <div className="sequence-card">{question.sequence.map((item, itemIndex) => <span key={`${item}-${itemIndex}`}>{item}</span>)}</div>
      {accessibility.gestureAnswerMode && question.options.length > 0 && (
        <div className="gesture-box">
          <strong>Gesture Mode mock</strong>
          <p>👍 selects active answer. ✋ repeats instruction. 👉 moves to next option.</p>
          <div className="cta-row">
            <button type="button" onClick={() => setActive((active + 1) % question.options.length)}>👉 Next</button>
            <button type="button" onClick={() => onSpeak(gameInstruction("patterns", language).audioText)}>✋ Repeat</button>
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
          headline={lastOk ? uiStr("correct", language) : uiStr("try_again", language)}
          detail={pickText(question.rule, language)}
          accessibility={accessibility}
          onSpeak={onSpeak}
        />
      ) : null}
    </GameShell>
  );
}

function CultureGame({
  language,
  accessibility,
  onDone,
  onSpeak,
  onRegisterInstruction,
}: {
  language: Language;
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
    <GameShell title={gameTitle("culture", language)} instruction={gameInstruction("culture", language)} accessibility={accessibility} onSpeak={onSpeak} onRegisterInstruction={onRegisterInstruction} language={language}>
      <div className="question-card culture-card">
        <div className="big-icon">🧭</div>
        <h3>{pickText(question.prompt, language)}</h3>
      </div>
      {accessibility.gestureAnswerMode && question.options.length > 0 && (
        <div className="gesture-box">
          <strong>Gesture Mode mock</strong>
          <p>👍 selects active answer. ✋ repeats instruction. 👉 moves to next option.</p>
          <div className="cta-row">
            <button type="button" onClick={() => setActive((active + 1) % question.options.length)}>👉 Next</button>
            <button type="button" onClick={() => onSpeak(gameInstruction("culture", language).audioText)}>✋ Repeat</button>
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
          headline={lastOk ? uiStr("correct", language) : uiStr("try_again", language)}
          detail={pickText(question.fact, language)}
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
  language,
  children,
}: {
  title: string;
  instruction: AdaptiveInstruction;
  accessibility: AccessibilitySettings;
  onSpeak: (text: string) => void;
  onRegisterInstruction?: (info: { title: string; hint: string }) => void;
  language: Language;
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
    <section className="screen game-screen">
      <div className="game-header">
        <p className="eyebrow">{uiStr("game_eyebrow", language)}</p>
        <h2>{title}</h2>
      </div>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>{displayed}</p>
      </div>
      <div className="instruction-toolbar">
        {accessibility.voiceInstructions && (
          <button type="button" onClick={() => onSpeak(instruction.audioText)}>
            {uiStr("game_read_aloud", language)}
          </button>
        )}
        <button type="button" className="instruction-explain" onClick={handleExplainSimpler}>
          {uiStr("game_explain_simpler", language)}
        </button>
      </div>
      {accessibility.textHints && <p className="hint">{uiStr("game_hint_no_rush", language)}</p>}
      {accessibility.noTimer && <p className="status">{uiStr("game_no_timer", language)}</p>}
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
  onPhotoFrame,
  language,
}: {
  result: GameResult;
  accessibility: AccessibilitySettings;
  onSpeak: (text: string) => void;
  onMap: () => void;
  onRewards: () => void;
  onAlbum: () => void;
  onGarden: () => void;
  onPhotoFrame: () => void;
  language: Language;
}) {
  const great = result.score >= 80;
  const t = (key: string) => uiStr(key, language);
  const stickerDetails = result.stickersUnlocked
    .map((id) => STICKERS.find((s) => s.id === id))
    .filter((s): s is (typeof STICKERS)[number] => Boolean(s));
  const showLearningFocus = !result.alreadyAwarded && Boolean(result.skillPracticeSummary);
  const rewardExtra = great ? "Great work on this quest!" : "Every step counts — nice effort!";
  return (
    <section className="screen center result-screen">
      <div className={`celebration ${accessibility.reducedAnimations ? "celebration--static" : ""}`}>
        <span>⭐</span><span>✨</span>
      </div>
      <p className="eyebrow">{t("result_quest_complete")}</p>
      <h2>{great ? t("result_title_great") : t("result_title_ok")}</h2>
      <div className="score">{result.score}%</div>
      <div className="bota-bubble">
        <div className="bota-face">{great ? "🎉" : "🐫"}</div>
        <p>{result.alreadyAwarded
          ? t("result_practice")
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
          <strong>{t("result_learning_focus")}</strong> {result.skillPracticeSummary}
        </p>
      )}
      {!result.alreadyAwarded && stickerDetails.length > 0 && (
        <div className="result-stickers">
          <strong>{t("result_new_stickers")}</strong>
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
      <div className="cta-row result-actions">
        <button className="primary" onClick={onMap}>{t("result_back_map")}</button>
        <button onClick={onGarden}>{t("open_garden")}</button>
        <button onClick={onRewards}>{t("open_rewards")}</button>
        <button onClick={onAlbum}>{t("open_album")}</button>
        <button onClick={onPhotoFrame}>{t("open_photo_frame")}</button>
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
  const t = (key: string) => uiStr(key, profile.language);

  return (
    <section className="screen rewards-screen">
      <div className="rewards-hero">
        <div>
          <PageHeader
            eyebrow={t("open_rewards")}
            title={t("rewards_title")}
            lead={t("rewards_lead")}
          />
          <div className="cta-row">
            <button onClick={onAlbum}>{t("open_album")}</button>
          </div>
        </div>
        <div className="coin-wallet">
          <span>{profile.coins}</span>
          <strong>{t("rewards_coins")}</strong>
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
          <button onClick={onMap}>{t("result_back_map")}</button>
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
                <span className="reward-cost">{reward.cost ? `${reward.cost} ${t("coins_label")}` : "QR"}</span>
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

const PARENT_TEXT: Record<string, LocalizedText> = {
  pin_lead: {
    en: "This area is for grown-ups only.",
    ru: "Этот раздел только для взрослых.",
    kz: "Бұл бөлім тек ересектерге арналған.",
  },
  pin_error_headline: {
    en: "That PIN did not match",
    ru: "ПИН не совпал",
    kz: "PIN сәйкес келмеді",
  },
  pin_error_detail: {
    en: "Try 1234 for the MVP demo - no penalty, just try again.",
    ru: "Для MVP-демо попробуйте 1234 - штрафа нет, просто попробуйте ещё раз.",
    kz: "MVP демо үшін 1234 деп көріңіз - айып жоқ, қайта байқап көріңіз.",
  },
  unlock: { en: "Unlock", ru: "Открыть", kz: "Ашу" },
  list_and: { en: "and", ru: "и", kz: "және" },
  package_unlock: { en: "a Bota package unlock (demo)", ru: "разблокировку упаковки Bota (демо)", kz: "Bota қаптамасын ашуды (демо)" },
  package_activity: { en: "a package activity", ru: "активность с упаковкой", kz: "қаптама белсенділігі" },
  scanning_product: { en: "scanning {product}", ru: "сканирование {product}", kz: "{product} сканерлеу" },
  activity_empty: { en: "used the app for learning", ru: "использовал(а) приложение для обучения", kz: "қолданбаны оқу үшін пайдаланды" },
  activity_completed: { en: "completed {count} educational activities: {items}", ru: "выполнил(а) учебные активности ({count}): {items}", kz: "{count} оқу әрекетін орындады: {items}" },
  stickers_none: { en: "did not add new album stickers in this summary window", ru: "не добавил(а) новых стикеров в альбом за этот период", kz: "осы кезеңде альбомға жаңа стикер қоспады" },
  stickers_one: { en: "collected a new sticker ({stickers})", ru: "получил(а) новый стикер ({stickers})", kz: "жаңа стикер жинады ({stickers})" },
  stickers_many: { en: "collected {count} new stickers ({stickers})", ru: "получил(а) новые стикеры ({count}): {stickers}", kz: "{count} жаңа стикер жинады: {stickers}" },
  skills_none: { en: "has not logged skill practice yet today", ru: "сегодня ещё не тренировались навыки", kz: "бүгін дағды жаттығуы әлі тіркелмеді" },
  skills_some: { en: "trained learning progress in {skills}", ru: "тренировал(а) навыки: {skills}", kz: "мына дағдыларды жаттықтырды: {skills}" },
  summary_sentence: {
    en: "Today, {name} {activityText}. {name} earned {coins} Bota Coins, {stickerPhrase}, and {skillPhrase}.",
    ru: "Сегодня {name}: {activityText}. Монеты Бота: {coins}; {stickerPhrase}; {skillPhrase}.",
    kz: "Бүгін {name}: {activityText}. {coins} Бота тиыны жиналды; {stickerPhrase}; {skillPhrase}.",
  },
  summary_eyebrow: { en: "Today's learning summary", ru: "Сводка обучения за сегодня", kz: "Бүгінгі оқу қорытындысы" },
  summary_title: { en: "Learning at a glance", ru: "Обучение в двух словах", kz: "Оқуға қысқаша шолу" },
  summary_empty: {
    en: "Today's learning journey has not started yet. Complete a mini-game with Bota to see progress here.",
    ru: "Сегодняшнее обучение ещё не началось. Пройдите мини-игру с Ботой, чтобы увидеть прогресс здесь.",
    kz: "Бүгінгі оқу әлі басталған жоқ. Прогресті көру үшін Ботамен шағын ойынды аяқтаңыз.",
  },
  activities_today: { en: "Educational activities today", ru: "Учебные активности сегодня", kz: "Бүгінгі оқу әрекеттері" },
  coins_today: { en: "Bota Coins earned today", ru: "Монеты Бота за сегодня", kz: "Бүгін жиналған Бота тиындары" },
  stickers_today: { en: "New stickers today", ru: "Новые стикеры сегодня", kz: "Бүгінгі жаңа стикерлер" },
  skills_today: { en: "Skills trained today", ru: "Навыки сегодня", kz: "Бүгінгі дағдылар" },
  screen_time: { en: "Screen time", ru: "Экранное время", kz: "Экран уақыты" },
  screen_time_detail: {
    en: "Guided limit in this demo: 30 minutes per day. Learning stays short and focused.",
    ru: "Ориентир в демо: 30 минут в день. Обучение остаётся коротким и сфокусированным.",
    kz: "Демодағы бағыт: күніне 30 минут. Оқу қысқа әрі жинақы болады.",
  },
  open_garden: { en: "Open Skill Garden", ru: "Открыть сад навыков", kz: "Дағды бағын ашу" },
  open_album: { en: "Open Sticker Album", ru: "Открыть альбом стикеров", kz: "Стикер альбомын ашу" },
  dashboard_eyebrow: { en: "Parent dashboard", ru: "Панель родителя", kz: "Ата-ана панелі" },
  dashboard_title: { en: "{name}'s Progress", ru: "Прогресс: {name}", kz: "{name} прогресі" },
  dashboard_lead: {
    en: "A clear summary of what your child practiced today and how the comfort profile is adapting the experience.",
    ru: "Понятная сводка того, что ребёнок практиковал сегодня, и как профиль комфорта адаптирует приложение.",
    kz: "Балаңыз бүгін не жаттықтырғанын және ыңғайлылық профилі тәжірибені қалай бейімдейтінін көрсететін қысқаша шолу.",
  },
  language_title: { en: "Dashboard language", ru: "Язык панели", kz: "Панель тілі" },
  language_lead: { en: "Choose the language parents see in this dashboard.", ru: "Выберите язык панели для родителей.", kz: "Ата-ана панелінің тілін таңдаңыз." },
  age: { en: "Age", ru: "Возраст", kz: "Жасы" },
  language: { en: "Language", ru: "Язык", kz: "Тіл" },
  coins: { en: "Coins", ru: "Монеты", kz: "Тиындар" },
  screen_time_short: { en: "30 min/day", ru: "30 мин/день", kz: "күніне 30 мин" },
  completed_games: { en: "Completed games", ru: "Пройденные игры", kz: "Аяқталған ойындар" },
  no_games: { en: "No games yet", ru: "Игр пока нет", kz: "Әзірге ойын жоқ" },
  skills_trained: { en: "Skills trained", ru: "Тренированные навыки", kz: "Жаттыққан дағдылар" },
  start_quest: { en: "Start a quest to train skills", ru: "Начните квест, чтобы тренировать навыки", kz: "Дағдыларды жаттықтыру үшін квест бастаңыз" },
  badges: { en: "Badges", ru: "Значки", kz: "Белгілер" },
  no_badges: { en: "No badges yet", ru: "Значков пока нет", kz: "Әзірге белгі жоқ" },
  skill_garden_growth: { en: "Skill garden (estimated growth)", ru: "Сад навыков (примерный рост)", kz: "Дағды бағы (шамамен өсу)" },
  memory: { en: "Memory", ru: "Память", kz: "Жад" },
  math: { en: "Math", ru: "Математика", kz: "Математика" },
  kazakh_words: { en: "Kazakh words", ru: "Казахские слова", kz: "Қазақ сөздері" },
  culture: { en: "Culture", ru: "Культура", kz: "Мәдениет" },
  sticker_album: { en: "Sticker album", ru: "Альбом стикеров", kz: "Стикер альбомы" },
  stickers_collected: { en: "{count}/{total} stickers collected", ru: "Собрано стикеров: {count}/{total}", kz: "{count}/{total} стикер жиналды" },
  adaptive_profile: { en: "Adaptive Profile", ru: "Адаптивный профиль", kz: "Бейімделген профиль" },
  comfort_profile: { en: "Comfort profile", ru: "Профиль комфорта", kz: "Ыңғайлылық профилі" },
  active: { en: "Active", ru: "Активен", kz: "Белсенді" },
  off: { en: "Off", ru: "Выключен", kz: "Өшірулі" },
  source: { en: "Source", ru: "Источник", kz: "Дереккөз" },
  support_needs: { en: "Selected support needs", ru: "Выбранные потребности поддержки", kz: "Таңдалған қолдау қажеттіліктері" },
  standard_mode: { en: "Standard mode", ru: "Стандартный режим", kz: "Стандартты режим" },
  enabled: { en: "Enabled", ru: "Включено", kz: "Қосулы" },
  recommendation_summary: { en: "Recommendation summary", ru: "Сводка рекомендаций", kz: "Ұсынымдар қорытындысы" },
  rec_visibility_combo: {
    en: "Large text and high contrast enabled for better visibility.",
    ru: "Крупный текст и высокий контраст включены для лучшей видимости.",
    kz: "Жақсырақ көріну үшін үлкен мәтін және жоғары контраст қосылды.",
  },
  rec_large_text: { en: "Large text enabled to make reading easier.", ru: "Крупный текст включён, чтобы читать было проще.", kz: "Оқуды жеңілдету үшін үлкен мәтін қосылды." },
  rec_high_contrast: { en: "High contrast enabled to improve readability.", ru: "Высокий контраст включён для лучшей читаемости.", kz: "Оқылуын жақсарту үшін жоғары контраст қосылды." },
  rec_voice: {
    en: "Voice instructions and Bota Voice Guide enabled (audio is optional).",
    ru: "Голосовые инструкции и помощник Бота включены (аудио необязательно).",
    kz: "Дауыстық нұсқаулар және Бота көмекшісі қосылды (аудио міндетті емес).",
  },
  rec_voice_nav: { en: "Voice navigation enabled for simple spoken commands.", ru: "Голосовая навигация включена для простых команд.", kz: "Қарапайым ауызша командалар үшін дауыстық навигация қосылды." },
  rec_subtitles: {
    en: "Subtitles and text hints enabled so learning never depends only on sound.",
    ru: "Субтитры и текстовые подсказки включены, чтобы обучение не зависело только от звука.",
    kz: "Оқу тек дыбысқа тәуелді болмауы үшін субтитрлер мен мәтіндік кеңестер қосылды.",
  },
  rec_no_timer: { en: "Timers removed to reduce pressure.", ru: "Таймеры убраны, чтобы снизить давление.", kz: "Қысымды азайту үшін таймерлер алынды." },
  rec_buttons: { en: "Buttons enlarged for easier interaction.", ru: "Кнопки увеличены для более удобного взаимодействия.", kz: "Ыңғайлы әрекет үшін батырмалар үлкейтілді." },
  rec_reduced_motion: { en: "Reduced animations enabled for a calmer experience.", ru: "Анимации уменьшены для более спокойного опыта.", kz: "Тынышырақ тәжірибе үшін анимациялар азайтылды." },
  rec_simplified: {
    en: "Instructions simplified and tasks made less overwhelming.",
    ru: "Инструкции упрощены, а задания стали менее перегруженными.",
    kz: "Нұсқаулар жеңілдетілді және тапсырмалар аз жүктемелі болды.",
  },
  rec_gesture: {
    en: "Gesture Answer Mode available as a non-precise touch fallback.",
    ru: "Режим ответа жестом доступен как вариант без точного касания.",
    kz: "Дәл басуды қажет етпейтін қосымша әдіс ретінде қимылмен жауап беру режимі қолжетімді.",
  },
  quick_toggles: { en: "Quick toggles", ru: "Быстрые переключатели", kz: "Жылдам қосқыштар" },
  edit_settings: { en: "Edit settings", ru: "Изменить настройки", kz: "Баптауларды өзгерту" },
  reset_standard: { en: "Reset to Standard", ru: "Вернуть стандарт", kz: "Стандартқа қайтару" },
  comfort_profile_cta: { en: "Learning Comfort Profile", ru: "Профиль комфорта обучения", kz: "Оқу ыңғайлылығы профилі" },
  accessibility_eyebrow: { en: "Qolaily Mode", ru: "Qolaily Mode", kz: "Qolaily Mode" },
  accessibility_lead: {
    en: "Make the app comfortable for your child. You can change these anytime in Parent Mode.",
    ru: "Настройте приложение под комфорт ребёнка. Эти параметры можно менять в режиме родителя.",
    kz: "Қолданбаны балаңызға ыңғайлы етіңіз. Бұл баптауларды ата-ана режимінде кез келген уақытта өзгертуге болады.",
  },
  back_to_parent: { en: "Back to Parent Mode", ru: "Назад в режим родителя", kz: "Ата-ана режиміне оралу" },
  qr_unlock: { en: "QR Unlock", ru: "QR разблокировка", kz: "QR арқылы ашу" },
  reset_demo_progress: { en: "Reset demo progress", ru: "Сбросить демо-прогресс", kz: "Демо прогресті қалпына келтіру" },
  reset_demo_detail: {
    en: "Clears local coins, badges, completed games, QR unlock, and profile data on this device.",
    ru: "Удаляет локальные монеты, значки, пройденные игры, QR-разблокировки и данные профиля на этом устройстве.",
    kz: "Осы құрылғыдағы тиындарды, белгілерді, аяқталған ойындарды, QR ашуларын және профиль деректерін өшіреді.",
  },
  confirm_reset: { en: "Confirm Reset", ru: "Подтвердить сброс", kz: "Қалпына келтіруді растау" },
  cancel: { en: "Cancel", ru: "Отмена", kz: "Бас тарту" },
  reset_progress: { en: "Reset Progress", ru: "Сбросить прогресс", kz: "Прогресті қалпына келтіру" },
};

const PARENT_ACTIVITY_LABELS: Record<string, LocalizedText> = {
  memory: { en: "memory matching", ru: "игру на память", kz: "жад сәйкестендіруін" },
  math: { en: "counting and math", ru: "счёт и математику", kz: "санау мен математиканы" },
  words: { en: "Kazakh language practice", ru: "практику казахского языка", kz: "қазақ тілі жаттығуын" },
  patterns: { en: "patterns and logic", ru: "узоры и логику", kz: "өрнектер мен логиканы" },
  culture: { en: "Kazakhstan culture", ru: "культуру Казахстана", kz: "Қазақстан мәдениетін" },
  "daily-chest": { en: "the daily learning chest", ru: "ежедневный учебный сундук", kz: "күнделікті оқу сандығын" },
};

const PARENT_SKILL_LABELS: Record<LearningSession["skillsTrained"][number], LocalizedText> = {
  memory: { en: "memory", ru: "память", kz: "жад" },
  math: { en: "math", ru: "математику", kz: "математика" },
  language: { en: "Kazakh language", ru: "казахский язык", kz: "қазақ тілі" },
  culture: { en: "culture and facts", ru: "культуру и факты", kz: "мәдениет пен деректер" },
};

const PARENT_SUPPORT_NEED_LABELS: Record<SupportNeed, LocalizedText> = {
  vision: { en: "Better visibility", ru: "Лучшая видимость", kz: "Жақсырақ көріну" },
  hearing: { en: "Text instead of sound", ru: "Текст вместо звука", kz: "Дыбыс орнына мәтін" },
  motor: { en: "Easier touch controls", ru: "Более удобное касание", kz: "Ыңғайлырақ басқару" },
  focus: { en: "Calm focus mode", ru: "Спокойный режим фокуса", kz: "Тыныш фокус режимі" },
  standard: { en: "Standard mode", ru: "Стандартный режим", kz: "Стандартты режим" },
};

const PARENT_SETUP_SOURCE_LABELS: Record<UserProfile["adaptiveProfile"]["setupSource"], LocalizedText> = {
  manual: { en: "Manual setup", ru: "Ручная настройка", kz: "Қолмен баптау" },
  default: { en: "Skipped / standard", ru: "Пропущено / стандарт", kz: "Өткізілді / стандарт" },
  mock_document: { en: "Sample recommendation (demo)", ru: "Пример рекомендации (демо)", kz: "Ұсыным үлгісі (демо)" },
};

const PARENT_ACCESSIBILITY_LABELS: Partial<Record<keyof AccessibilitySettings, LocalizedText>> = {
  largeText: { en: "Large text", ru: "Крупный текст", kz: "Үлкен мәтін" },
  largeButtons: { en: "Large buttons", ru: "Крупные кнопки", kz: "Үлкен батырмалар" },
  highContrast: { en: "High contrast", ru: "Высокий контраст", kz: "Жоғары контраст" },
  voiceInstructions: { en: "Voice instructions", ru: "Голосовые инструкции", kz: "Дауыстық нұсқаулар" },
  voiceNavigation: { en: "Voice navigation", ru: "Голосовая навигация", kz: "Дауыстық навигация" },
  botaVoiceGuide: { en: "Bota Voice Guide", ru: "Голосовой помощник Бота", kz: "Бота дауыстық көмекшісі" },
  textHints: { en: "Text hints", ru: "Текстовые подсказки", kz: "Мәтіндік кеңестер" },
  noTimer: { en: "No timer", ru: "Без таймера", kz: "Таймер жоқ" },
  reducedAnimations: { en: "Reduced animations", ru: "Меньше анимации", kz: "Азайтылған анимация" },
  simplifiedInstructions: { en: "Simpler instructions", ru: "Более простые инструкции", kz: "Оңайырақ нұсқаулар" },
  gestureAnswerMode: { en: "Gesture Answer Mode", ru: "Режим ответа жестом", kz: "Қимылмен жауап беру режимі" },
};

function parentStr(key: string, language: Language): string {
  return pickText(PARENT_TEXT[key] ?? { en: key, ru: key, kz: key }, language);
}

function formatParentText(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

function localizedList(items: string[], language: Language): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  const last = items[items.length - 1]!;
  return `${items.slice(0, -1).join(", ")} ${parentStr("list_and", language)} ${last}`;
}

function parentActivityLabel(id: string, language: Language): string {
  return PARENT_ACTIVITY_LABELS[id] ? pickText(PARENT_ACTIVITY_LABELS[id]!, language) : id.replace(/-/g, " ");
}

function parentSkillLabel(skill: LearningSession["skillsTrained"][number], language: Language): string {
  return pickText(PARENT_SKILL_LABELS[skill], language);
}

function parentAccessibilityLabel(key: keyof AccessibilitySettings, language: Language): string {
  return PARENT_ACCESSIBILITY_LABELS[key] ? pickText(PARENT_ACCESSIBILITY_LABELS[key]!, language) : key;
}

function buildParentRecommendationSummary(settings: AccessibilitySettings, language: Language): string[] {
  if (!settings.enabled) return [];
  const lines: string[] = [];
  if (settings.largeText && settings.highContrast) lines.push(parentStr("rec_visibility_combo", language));
  else if (settings.largeText) lines.push(parentStr("rec_large_text", language));
  else if (settings.highContrast) lines.push(parentStr("rec_high_contrast", language));
  if (settings.voiceInstructions || settings.botaVoiceGuide) lines.push(parentStr("rec_voice", language));
  if (settings.voiceNavigation) lines.push(parentStr("rec_voice_nav", language));
  if (settings.subtitles) lines.push(parentStr("rec_subtitles", language));
  if (settings.noTimer) lines.push(parentStr("rec_no_timer", language));
  if (settings.largeButtons || settings.extraLargeTouchTargets) lines.push(parentStr("rec_buttons", language));
  if (settings.reducedAnimations) lines.push(parentStr("rec_reduced_motion", language));
  if (settings.simplifiedInstructions || settings.oneTaskAtATime || settings.fewerAnswerOptions) lines.push(parentStr("rec_simplified", language));
  if (settings.gestureAnswerMode) lines.push(parentStr("rec_gesture", language));
  return lines;
}

function ParentPin({
  accessibility,
  language,
  onSpeak,
  onSuccess,
}: {
  accessibility: AccessibilitySettings;
  language: Language;
  onSpeak: (text: string) => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="screen center">
      <p className="eyebrow">{uiStr("parent_pin_title", language)}</p>
      <h2>{uiStr("parent_enter_pin", language)}</h2>
      <p className="lead">{parentStr("pin_lead", language)}</p>
      <input className="pin" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="1234" />
      {error ? (
        <GentleNotice
          accessibility={accessibility}
          onSpeak={onSpeak}
          headline={parentStr("pin_error_headline", language)}
          detail={error}
        />
      ) : null}
      <button className="primary" onClick={() => pin === "1234" ? onSuccess() : setError(parentStr("pin_error_detail", language))}>{parentStr("unlock", language)}</button>
    </section>
  );
}

function buildParentSummaryParagraph(profile: UserProfile, session: LearningSession, language: Language): string {
  const name = profile.name;
  const gameLabels = session.gamesCompleted.map((g) => parentActivityLabel(g, language));
  const qrBits = session.qrItemsScanned.map((id) => {
    if (id === "package-qr") return parentStr("package_unlock", language);
    const item = QR_ITEMS.find((q) => q.id === id);
    return item
      ? formatParentText(parentStr("scanning_product", language), { product: item.productName })
      : parentStr("package_activity", language);
  });
  const activities = [...gameLabels, ...qrBits];
  const n = activities.length;
  const activityText =
    n === 0
      ? parentStr("activity_empty", language)
      : formatParentText(parentStr("activity_completed", language), { count: n, items: localizedList(activities, language) });
  const stickers = session.stickersEarned
    .map((id) => STICKERS.find((s) => s.id === id)?.title ?? id)
    .filter(Boolean);
  const stickerPhrase =
    stickers.length === 0
      ? parentStr("stickers_none", language)
      : stickers.length === 1
        ? formatParentText(parentStr("stickers_one", language), { stickers: stickers[0]! })
        : formatParentText(parentStr("stickers_many", language), { count: stickers.length, stickers: localizedList(stickers, language) });
  const skills = session.skillsTrained.map((s) => parentSkillLabel(s, language));
  const skillPhrase =
    skills.length === 0
      ? parentStr("skills_none", language)
      : formatParentText(parentStr("skills_some", language), { skills: localizedList(skills, language) });
  return formatParentText(parentStr("summary_sentence", language), {
    name,
    activityText,
    coins: session.coinsEarned,
    stickerPhrase,
    skillPhrase,
  });
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
  const language = profile.language;
  const session = getSessionForDate(profile, calendarDay);
  const hasData = session && sessionHasLearningActivity(session);

  return (
    <div className="parent-summary-card">
      <p className="eyebrow">{parentStr("summary_eyebrow", language)}</p>
      <h3>{parentStr("summary_title", language)}</h3>
      {hasData && session ? (
        <>
          <p className="parent-summary-lead">{buildParentSummaryParagraph(profile, session, language)}</p>
          <ul className="parent-summary-meta">
            <li>
              <strong>{parentStr("activities_today", language)}</strong>
              <span>{session.gamesCompleted.length + session.qrItemsScanned.length}</span>
            </li>
            <li>
              <strong>{parentStr("coins_today", language)}</strong>
              <span>{session.coinsEarned}</span>
            </li>
            <li>
              <strong>{parentStr("stickers_today", language)}</strong>
              <span>{session.stickersEarned.length}</span>
            </li>
            <li>
              <strong>{parentStr("skills_today", language)}</strong>
              <span>{session.skillsTrained.length ? session.skillsTrained.map((s) => parentSkillLabel(s, language)).join(" · ") : "—"}</span>
            </li>
            <li>
              <strong>{parentStr("screen_time", language)}</strong>
              <span>{parentStr("screen_time_detail", language)}</span>
            </li>
          </ul>
        </>
      ) : (
        <p className="parent-summary-empty">
          {parentStr("summary_empty", language)}
        </p>
      )}
      <div className="parent-summary-cta">
        <button className="primary" type="button" onClick={onGarden}>
          {parentStr("open_garden", language)} 🌱
        </button>
        <button type="button" onClick={onAlbum}>
          {parentStr("open_album", language)} 📔
        </button>
      </div>
    </div>
  );
}

function ParentDashboard({
  profile,
  onChange,
  onAlbum,
  onGarden,
  onSettings,
  onQr,
  onReset,
}: {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
  onAlbum: () => void;
  onGarden: () => void;
  onSettings: () => void;
  onQr: () => void;
  onReset: () => void;
}) {
  const language = profile.language;
  const skills = profile.completedGames.map((game) => parentActivityLabel(game, language));
  const [confirmReset, setConfirmReset] = useState(false);
  const sp = profile.skillProgress;

  const needs = profile.adaptiveProfile.supportNeeds;
  const settings = profile.adaptiveProfile.settings;
  const summary = buildParentRecommendationSummary(settings, language);

  const adaptiveActive = useMemo(() => {
    const labels = [
      settings.largeText ? parentAccessibilityLabel("largeText", language) : null,
      settings.largeButtons ? parentAccessibilityLabel("largeButtons", language) : null,
      settings.highContrast ? parentAccessibilityLabel("highContrast", language) : null,
      settings.voiceInstructions ? parentAccessibilityLabel("voiceInstructions", language) : null,
      settings.voiceNavigation ? parentAccessibilityLabel("voiceNavigation", language) : null,
      settings.textHints ? parentAccessibilityLabel("textHints", language) : null,
      settings.noTimer ? parentAccessibilityLabel("noTimer", language) : null,
      settings.reducedAnimations ? parentAccessibilityLabel("reducedAnimations", language) : null,
      settings.simplifiedInstructions ? parentAccessibilityLabel("simplifiedInstructions", language) : null,
      settings.gestureAnswerMode ? `${parentAccessibilityLabel("gestureAnswerMode", language)} (${language === "en" ? "mock" : language === "ru" ? "демо" : "демо"})` : null,
    ].filter((x): x is string => Boolean(x));
    const active = labels.length > 0;
    return { active, labels };
  }, [settings, language]);

  const toggleSetting = (key: keyof AccessibilitySettings) => {
    const nextSettings = { ...settings, [key]: !settings[key] };
    onChange({
      ...profile,
      adaptiveProfile: {
        ...profile.adaptiveProfile,
        settings: nextSettings,
        recommendationSummary: buildRecommendationSummary(needs, nextSettings),
      },
    });
  };

  const resetToStandard = () => {
    const cleanNeeds: SupportNeed[] = ["standard"];
    const nextSettings = buildAccessibilitySettings(cleanNeeds);
    onChange({
      ...profile,
      adaptiveProfile: {
        ...profile.adaptiveProfile,
        supportNeeds: cleanNeeds,
        setupSource: "manual",
        settings: nextSettings,
        recommendationSummary: buildRecommendationSummary(cleanNeeds, nextSettings),
      },
    });
  };
  return (
    <section className="screen">
      <PageHeader
        eyebrow={parentStr("dashboard_eyebrow", language)}
        title={formatParentText(parentStr("dashboard_title", language), { name: profile.name })}
        lead={parentStr("dashboard_lead", language)}
      />
      <ParentSummaryCard profile={profile} calendarDay={getToday()} onGarden={onGarden} onAlbum={onAlbum} />
      <div className="panel">
        <strong>{parentStr("language_title", language)}</strong>
        <p className="lead">{parentStr("language_lead", language)}</p>
        <div className="lang-switch">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              className={`lang-btn ${language === option.code ? "lang-btn--active" : ""}`}
              onClick={() => onChange({ ...profile, language: option.code })}
            >
              {option.flag} {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="stats">
        <span>{parentStr("age", language)} <b>{profile.age}</b></span>
        <span>{parentStr("language", language)} <b>{profile.language.toUpperCase()}</b></span>
        <span>{parentStr("coins", language)} <b>{profile.coins}</b></span>
        <span>{parentStr("screen_time", language)} <b>{parentStr("screen_time_short", language)}</b></span>
      </div>
      <div className="panel">
        <strong>{parentStr("completed_games", language)}</strong>
        <p>{profile.completedGames.length ? profile.completedGames.map((game) => parentActivityLabel(game, language)).join(", ") : parentStr("no_games", language)}</p>
        <strong>{parentStr("skills_trained", language)}</strong>
        <p>{skills.length ? Array.from(new Set(skills)).join(", ") : parentStr("start_quest", language)}</p>
        <strong>{parentStr("badges", language)}</strong>
        <p>{profile.badges.length ? profile.badges.join(", ") : parentStr("no_badges", language)}</p>
        <strong>{parentStr("skill_garden_growth", language)}</strong>
        <p>
          {parentStr("memory", language)}: {sp.memory}% · {parentStr("math", language)}: {sp.math}% · {parentStr("kazakh_words", language)}: {sp.language}% · {parentStr("culture", language)}: {sp.culture}%
        </p>
        <button onClick={onGarden}>{parentStr("open_garden", language)}</button>
        <strong>{parentStr("sticker_album", language)}</strong>
        <p>{formatParentText(parentStr("stickers_collected", language), { count: profile.unlockedStickers.length, total: STICKERS.length })}</p>
        <button onClick={onAlbum}>{parentStr("open_album", language)}</button>
      </div>
      <div className="panel">
        <strong>{parentStr("adaptive_profile", language)}</strong>
        <p className="lead">
          {parentStr("comfort_profile", language)}: <b>{adaptiveActive.active ? parentStr("active", language) : parentStr("off", language)}</b> · {parentStr("source", language)}: <b>{pickText(PARENT_SETUP_SOURCE_LABELS[profile.adaptiveProfile.setupSource], language)}</b>
        </p>
        <strong>{parentStr("support_needs", language)}</strong>
        <p>{needs.length ? needs.map((n) => pickText(PARENT_SUPPORT_NEED_LABELS[n], language)).join(" · ") : parentStr("standard_mode", language)}</p>

        {adaptiveActive.labels.length > 0 && (
          <>
            <strong>{parentStr("enabled", language)}</strong>
            <p>{adaptiveActive.labels.join(" · ")}</p>
          </>
        )}

        {summary.length > 0 && (
          <>
            <strong>{parentStr("recommendation_summary", language)}</strong>
            <ul className="recommendation-list">
              {summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        )}

        <strong>{parentStr("quick_toggles", language)}</strong>
        <div className="toggle-list">
          {(
            [
              "largeText",
              "largeButtons",
              "highContrast",
              "voiceInstructions",
              "voiceNavigation",
              "textHints",
              "noTimer",
              "reducedAnimations",
              "simplifiedInstructions",
              "gestureAnswerMode",
            ] as const
          ).map((key) => (
            <label className="toggle" key={key}>
              <span>{parentAccessibilityLabel(key, language)}</span>
              <input type="checkbox" checked={Boolean(settings[key])} onChange={() => toggleSetting(key)} />
            </label>
          ))}
        </div>
        <div className="cta-row">
          <button className="primary" type="button" onClick={onSettings}>{parentStr("edit_settings", language)}</button>
          <button type="button" onClick={resetToStandard}>{parentStr("reset_standard", language)}</button>
        </div>
      </div>
      <div className="cta-row">
        <button className="primary" onClick={onSettings}>{parentStr("comfort_profile_cta", language)}</button>
        <button onClick={onQr}>{parentStr("qr_unlock", language)}</button>
      </div>
      <div className="danger-zone">
        <div>
          <strong>{parentStr("reset_demo_progress", language)}</strong>
          <p>{parentStr("reset_demo_detail", language)}</p>
        </div>
        {confirmReset ? (
          <div className="reset-actions">
            <button className="danger" onClick={onReset}>{parentStr("confirm_reset", language)}</button>
            <button onClick={() => setConfirmReset(false)}>{parentStr("cancel", language)}</button>
          </div>
        ) : (
          <button className="secondary-danger" onClick={() => setConfirmReset(true)}>{parentStr("reset_progress", language)}</button>
        )}
      </div>
    </section>
  );
}

function AccessibilityPanel({ profile, onChange, onBack }: { profile: UserProfile; onChange: (profile: UserProfile) => void; onBack: () => void }) {
  const language = profile.language;
  const set = (key: keyof AccessibilitySettings) => {
    const nextSettings = { ...profile.adaptiveProfile.settings, [key]: !profile.adaptiveProfile.settings[key] };
    onChange({
      ...profile,
      adaptiveProfile: {
        ...profile.adaptiveProfile,
        settings: nextSettings,
        recommendationSummary: buildRecommendationSummary(profile.adaptiveProfile.supportNeeds, nextSettings),
      },
    });
  };
  const items: [keyof AccessibilitySettings, string][] = [
    ["largeText", "Large Text"],
    ["largeButtons", "Large Buttons"],
    ["highContrast", "High Contrast"],
    ["textHints", "Text Hints"],
    ["voiceInstructions", "Voice Instructions"],
    ["voiceNavigation", "Voice Navigation"],
    ["botaVoiceGuide", "Bota Voice Guide"],
    ["simplifiedInstructions", "Simpler instructions"],
    ["noTimer", "No Timer"],
    ["reducedAnimations", "Reduced Animations"],
    ["gestureAnswerMode", "Gesture Answer Mode"],
  ];
  return (
    <section className="screen accessibility-screen">
      <PageHeader
        eyebrow={parentStr("accessibility_eyebrow", language)}
        title={parentStr("comfort_profile_cta", language)}
        lead={parentStr("accessibility_lead", language)}
      />
      <div className="toggle-list">{items.map(([key]) => <label className="toggle" key={key}><span>{parentAccessibilityLabel(key, language)}</span><input type="checkbox" checked={profile.adaptiveProfile.settings[key]} onChange={() => set(key)} /></label>)}</div>
      <button className="primary" onClick={onBack}>{parentStr("back_to_parent", language)}</button>
    </section>
  );
}

function QrCameraScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const BD = (globalThis as Record<string, any>).BarcodeDetector;
    if (!BD) { setCamError("QR scanning not supported in this browser. Use Chrome on Android or desktop."); return; }
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); }
        const detector = new BD({ formats: ["qr_code"] });
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) { onDetected(barcodes[0].rawValue as string); return; }
          } catch { /* frame not ready */ }
          requestAnimationFrame(scan);
        };
        requestAnimationFrame(scan);
      } catch { if (!cancelled) setCamError("Camera access denied."); }
    })();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [onDetected]);

  return (
    <div className="qr-camera-overlay">
      {camError ? (
        <div className="panel"><p>{camError}</p><button className="primary" onClick={onClose}>Close</button></div>
      ) : (
        <><video ref={videoRef} className="qr-camera-video" playsInline muted /><div className="qr-scanner-frame" /><button className="primary qr-camera-close" onClick={onClose}>Cancel</button></>
      )}
    </div>
  );
}

function QrCollection({
  profile,
  items,
  message,
  onScan,
  onSecret,
  onSpeak,
}: {
  profile: UserProfile;
  items: QrItem[];
  message: string | null;
  onScan: (itemId: string) => void;
  onSecret: () => void;
  onSpeak: (text: string) => void;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null);
  const unlocked = profile.unlockedLocations.includes("secret");
  const lang = profile.language;

  const handleDetected = useCallback((code: string) => {
    setCameraOpen(false);
    const item = items.find((i) => i.id === code);
    if (item) {
      onScan(item.id);
      const msg = uiStr("level_unlocked", lang) + " " + item.unlockMessage;
      setUnlockMsg(msg);
      onSpeak(msg);
      window.setTimeout(() => setUnlockMsg(null), 5000);
    }
  }, [items, onScan, onSpeak, lang]);

  return (
    <section className="screen qr-collection-screen">
      {cameraOpen && <QrCameraScanner onDetected={handleDetected} onClose={() => setCameraOpen(false)} />}
      {unlockMsg && (
        <div className="qr-unlock-celebration">
          <div className="celebration"><span>✨</span><span>🌟</span><span>⭐</span><span>🌟</span><span>✨</span></div>
          <h3>{unlockMsg}</h3>
        </div>
      )}
      <div className="qr-collection-hero">
        <div className="qr">▦</div>
        <div>
          <p className="eyebrow">Package Collection</p>
          <h2>Scan Bota Packages</h2>
          <p className="lead">Each Bota package unlocks a new educational reward and keeps kids exploring.</p>
        </div>
      </div>
      <button className="primary" onClick={() => setCameraOpen(true)}>📷 {uiStr("scan_camera", lang)}</button>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>Scan a real QR code or tap a package below to unlock coins and stickers.</p>
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
              {item.unlocksLocation && <p className="qr-unlock-loc">Unlocks: {item.unlocksLocation}</p>}
              <p className="qr-reward">
                Reward: {rewardSticker ? rewardSticker.imageEmoji + " " + rewardSticker.title : "Sticker"}
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
      {unlocked && <button onClick={onSecret}>Open Secret Location</button>}
    </section>
  );
}

function SecretLocation({ onMap }: { onMap: () => void }) {
  return (
    <section className="screen center secret-screen">
      <div className="celebration">
        <span>✨</span><span>⭐</span>
      </div>
      <p className="eyebrow">Secret Location</p>
      <h2>You Found It!</h2>
      <div className="bota-bubble">
        <div className="bota-face">🎉</div>
        <p><strong>Congratulations!</strong> Every Bota package opens a new learning adventure. Keep collecting and exploring!</p>
      </div>
      <button className="primary" onClick={onMap}>Back to Map</button>
    </section>
  );
}

function BotaPhotoFrame({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lang = profile.language;
  const [template, setTemplate] = useState<"champion" | "collector" | "streak">("champion");

  const titles: Record<typeof template, { ru: string; kz: string; en: string }> = {
    champion: { ru: "Чемпион квеста!", kz: "Квест чемпионы!", en: "Quest Champion!" },
    collector: { ru: "Коллекционер стикеров!", kz: "Стикер жинаушы!", en: "Sticker Collector!" },
    streak: { ru: "Мастер серии!", kz: "Серия шебері!", en: "Streak Master!" },
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 600;
    canvas.height = 400;
    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, "#ffecd2");
    grad.addColorStop(1, "#fcb69f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);
    ctx.strokeStyle = "#e8a44a";
    ctx.lineWidth = 12;
    ctx.strokeRect(16, 16, 568, 368);
    ctx.strokeStyle = "#d4893b";
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, 544, 344);
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#5a3e1b";
    ctx.fillText(titles[template][lang], 300, 70);
    ctx.font = "72px sans-serif";
    ctx.fillText("🐫", 300, 170);
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#6b4226";
    ctx.fillText(profile.name, 300, 230);
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#8b6914";
    const stats = "🪙 " + profile.coins + " | 🏅 " + profile.badges.length + " | 📔 " + profile.unlockedStickers.length + "/" + STICKERS.length;
    ctx.fillText(stats, 300, 270);
    if (profile.currentStreak > 0) {
      ctx.fillText("🔥 " + profile.currentStreak + " " + uiStr("streak_label", lang), 300, 305);
    }
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#a08060";
    ctx.fillText("Bota Quest — bayan-suly.vercel.app", 300, 370);
  }, [profile, template, lang]);

  useEffect(() => { draw(); }, [draw]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bota-" + profile.name + "-" + template + ".png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(titles[template][lang] + " — " + profile.name + " plays Bota Quest! https://bayan-suly.vercel.app");
    window.open("https://wa.me/?text=" + text, "_blank");
  };

  return (
    <section className="screen photo-frame-screen">
      <p className="eyebrow">{uiStr("open_photo_frame", lang)}</p>
      <h2>{uiStr("open_photo_frame", lang)}</h2>
      <div className="frame-templates">
        {(["champion", "collector", "streak"] as const).map((t) => (
          <button key={t} className={"frame-template-btn " + (template === t ? "active" : "")} onClick={() => setTemplate(t)}>
            {titles[t][lang]}
          </button>
        ))}
      </div>
      <div className="frame-canvas-wrap">
        <canvas ref={canvasRef} className="frame-canvas" />
      </div>
      <div className="share-buttons">
        <button className="primary" onClick={downloadImage}>📥 {uiStr("download_photo", lang)}</button>
        <button onClick={shareWhatsApp}>💬 {uiStr("share_whatsapp", lang)}</button>
      </div>
      <button onClick={onBack}>← {uiStr("back", lang)}</button>
    </section>
  );
}

// ──── Landing page ────
function Landing({
  savedName,
  lang,
  onLang,
  onStart,
  onContinue,
}: {
  savedName: string | null;
  lang: Language;
  onLang: (l: Language) => void;
  onStart: () => void;
  onContinue: () => void;
}) {
  const t = (k: string) => uiStr(k, lang);
  const features = [
    { icon: "🎮", key: "landing_feat_games" },
    { icon: "🐫", key: "landing_feat_voice" },
    { icon: "🪙", key: "landing_feat_rewards" },
    { icon: "📦", key: "landing_feat_qr" },
    { icon: "🔥", key: "landing_feat_streak" },
    { icon: "♿", key: "landing_feat_access" },
  ];
  const langs: { code: Language; flag: string; label: string }[] = [
    { code: "kz", flag: "🇰🇿", label: "Қазақша" },
    { code: "ru", flag: "🇷🇺", label: "Русский" },
    { code: "en", flag: "🇬🇧", label: "English" },
  ];

  return (
    <section className="landing">
      <div className="landing-lang-picker">
        {langs.map((l) => (
          <button
            key={l.code}
            className={`lang-btn ${lang === l.code ? "lang-btn--active" : ""}`}
            onClick={() => onLang(l.code)}
          >
            {l.flag} {l.label}
          </button>
        ))}
      </div>

      <div className="landing-hero">
        <div className="landing-mascot">🐫</div>
        <h1 className="landing-headline">{t("landing_headline")}</h1>
        <p className="landing-subtitle">{t("landing_subtitle")}</p>

        <div className="landing-cta-group">
          {savedName ? (
            <>
              <button className="landing-cta" onClick={onContinue}>
                {t("landing_continue")} {savedName}
              </button>
              <button className="landing-cta landing-cta--secondary" onClick={onStart}>
                {t("landing_new")}
              </button>
            </>
          ) : (
            <button className="landing-cta" onClick={onStart}>
              {t("landing_start")}
            </button>
          )}
        </div>
      </div>

      <div className="landing-features">
        {features.map((f) => (
          <div key={f.key} className="landing-feature-card">
            <span className="landing-feature-icon">{f.icon}</span>
            <p>{t(f.key)}</p>
          </div>
        ))}
      </div>

      <footer className="landing-footer">
        Bayan Sulu &times; Bota Quest &copy; 2026
      </footer>
    </section>
  );
}

// ──── Leaderboard ────
function Leaderboard({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const lang = profile.language;
  const t = (k: string) => uiStr(k, lang);
  const rows = useMemo(() => buildLeaderboard(profile), [profile]);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <section className="screen leaderboard-screen">
      <p className="eyebrow">{t("lb_title")}</p>
      <h2>{t("lb_title")}</h2>
      <div className="leaderboard-table">
        <div className="leaderboard-row leaderboard-header">
          <span className="leaderboard-rank">{t("lb_rank")}</span>
          <span className="leaderboard-name">{t("lb_name")}</span>
          <span className="leaderboard-coins">{t("lb_coins_col")}</span>
          <span className="leaderboard-streak">{t("lb_streak_col")}</span>
        </div>
        {rows.map((row, i) => (
          <div key={row.name + i} className={`leaderboard-row ${row.isPlayer ? "leaderboard-highlight" : ""}`}>
            <span className="leaderboard-rank leaderboard-medal">
              {i < 3 ? medals[i] : i + 1}
            </span>
            <span className="leaderboard-name">
              {row.avatar} {row.name} {row.isPlayer ? t("lb_you") : ""}
            </span>
            <span className="leaderboard-coins">🪙 {row.coins}</span>
            <span className="leaderboard-streak">🔥 {row.streak}</span>
          </div>
        ))}
      </div>
      <button onClick={onBack}>← {t("back")}</button>
    </section>
  );
}

export default App;
