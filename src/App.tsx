import { FormEvent, useEffect, useMemo, useState } from "react";
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
  makeMathQuestions,
  makeProfile,
  saveUserProfile,
  QR_ITEMS,
  SESSION_ACTIVITY_LABELS,
  SESSION_SKILL_LABELS,
  SKILL_GARDEN,
  getGrowthStage,
  sessionHasLearningActivity,
  totalSkillProgress,
} from "./gameLogic";
import type { AccessibilitySettings, Age, Language, LearningSession, QrItem, UserProfile } from "./gameLogic";

type View =
  | "onboarding"
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
};

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
  { icon: "🐫", prompt: "Camel", answer: "түйе", options: ["түйе", "тау", "су"], fact: "Түйе means camel." },
  { icon: "⛰️", prompt: "Mountain", answer: "тау", options: ["алма", "тау", "дала"], fact: "Тау means mountain." },
  { icon: "🍎", prompt: "Apple", answer: "алма", options: ["су", "алма", "түйе"], fact: "Алма means apple." },
  { icon: "💧", prompt: "Water", answer: "су", options: ["дала", "су", "тау"], fact: "Су means water." },
  { icon: "🌾", prompt: "Steppe", answer: "дала", options: ["дала", "алма", "түйе"], fact: "Дала means steppe." },
];

const getToday = () => new Date().toISOString().slice(0, 10);

const memoryDeck = ["🍬", "🍫", "🍭", "🐫"].flatMap((card) => [card, card]);

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

  useEffect(() => {
    if (profile) saveUserProfile(profile);
  }, [profile]);

  const className = useMemo(() => {
    const a = profile?.accessibility;
    return [
      "app",
      a?.highContrast ? "high-contrast" : "",
      a?.largeButtons ? "large-buttons" : "",
      a?.reducedAnimations ? "reduced-motion" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [profile]);

  const awardGame = (
    game: Omit<GameResult, "coinsEarned" | "completedAt" | "alreadyAwarded">,
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
    const nextResult = {
      ...game,
      coinsEarned: award.coinsEarned,
      completedAt: new Date().toISOString(),
      alreadyAwarded: award.alreadyAwarded,
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

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  };

  return (
    <main className={className}>
      <div className="phone">
        {profile && view !== "onboarding" && (
          <TopBar profile={profile} onMap={() => setView("map")} onRewards={() => setView("rewards")} onParent={() => setView("parent-pin")} />
        )}
        {view === "onboarding" && <Onboarding onStart={(next) => { setProfile(next); setView("map"); }} />}
        {profile && view === "map" && <MapScreen profile={profile} onGo={setView} />}
        {profile && view === "garden" && <SkillGarden profile={profile} onBack={() => setView("map")} />}
        {profile && view === "memory" && <MemoryGame accessibility={profile.accessibility} onDone={() => awardGame({ gameId: "memory", title: "Collect the Sweets", score: 100, skill: "memory", badge: "Memory Master" }, 20, 10, "sticker-almaty-mountains")} onSpeak={speak} />}
        {profile && view === "words" && <WordsGame accessibility={profile.accessibility} onDone={(score) => awardGame({ gameId: "words", title: "Find the Kazakh Word", score, skill: "language", badge: "Kazakh Word Explorer" }, 20, score === 100 ? 10 : 0, "sticker-turkestan")} onSpeak={speak} />}
        {profile && view === "math" && <MathGame age={profile.age} accessibility={profile.accessibility} onDone={(score) => awardGame({ gameId: "math", title: "Counting with Bota", score, skill: "math", badge: "Young Mathematician" }, 20, score >= 80 ? 10 : 0, "sticker-baiterek")} onSpeak={speak} />}
        {profile && view === "patterns" && <PatternGame accessibility={profile.accessibility} onDone={(score) => awardGame({ gameId: "patterns", title: "Pattern Caravan", score, skill: "logic", badge: "Pattern Pathfinder" }, 20, score === 100 ? 10 : 0)} onSpeak={speak} />}
        {profile && view === "culture" && <CultureGame accessibility={profile.accessibility} onDone={(score) => awardGame({ gameId: "culture", title: "Culture Match", score, skill: "culture", badge: "Culture Explorer" }, 20, score === 100 ? 10 : 0)} onSpeak={speak} />}
        {profile && view === "result" && result && (
          <ResultScreen
            result={result}
            onMap={() => setView("map")}
            onRewards={() => setView("rewards")}
            onAlbum={() => setView("album")}
            onGarden={() => setView("garden")}
          />
        )}
        {profile && view === "rewards" && <RewardsShop profile={profile} onMap={() => setView("map")} onAlbum={() => setView("album")} onParent={() => setView("parent-pin")} />}
        {profile && view === "daily-chest" && <DailyChest profile={profile} onOpen={openDailyChest} onBack={() => setView("map")} onSpeak={speak} />}
        {profile && view === "album" && <StickerAlbum profile={profile} onBack={() => setView("map")} />}
        {profile && view === "parent-pin" && <ParentPin onSuccess={() => setView("parent")} />}
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
    </main>
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

function Onboarding({ onStart }: { onStart: (profile: UserProfile) => void }) {
  const [name, setName] = useState("Amina");
  const [age, setAge] = useState<Age>(8);
  const [language, setLanguage] = useState<Language>("kz");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onStart(makeProfile(name.trim() || "Bota Friend", age, language));
  };

  return (
    <section className="screen hero-screen">
      <div className="mascot">🐫</div>
      <h1>Bota Quest</h1>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>Hi there! I'm <strong>Bota the Camel</strong>! Let's explore Kazakhstan together, play fun learning games, and earn shiny coins!</p>
      </div>
      <form className="panel" onSubmit={submit}>
        <label>What's your name?<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Type your name..." /></label>
        <label>How old are you?<select value={age} onChange={(event) => setAge(Number(event.target.value) as Age)}>{[7, 8, 9, 10, 11].map((item) => <option key={item}>{item}</option>)}</select></label>
        <fieldset>
          <legend>Pick your language</legend>
          <div className="segmented">
            <button type="button" className={language === "kz" ? "active" : ""} onClick={() => setLanguage("kz")}>Қазақша</button>
            <button type="button" className={language === "ru" ? "active" : ""} onClick={() => setLanguage("ru")}>Русский</button>
          </div>
        </fieldset>
        <button className="primary" type="submit">Let's Go! 🚀</button>
      </form>
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
            <div className="coin-earned">🪙 +{reward.coins}</div>
            {rewardSticker && (
              <div className="sticker-pill">{rewardSticker.imageEmoji} {rewardSticker.title}</div>
            )}
          </div>
          <div className="fact-card">
            <strong>Kazakhstan fact</strong>
            <p>{reward.fact}</p>
          </div>
          {profile.accessibility.voiceInstructions && (
            <button onClick={() => onSpeak(reward.fact)}>🔊 Read fact aloud</button>
          )}
          {profile.accessibility.textHints && (
            <p className="hint">You can open one chest per day. Come back tomorrow for another fact.</p>
          )}
        </>
      ) : (
        <>
          {profile.accessibility.textHints && (
            <p className="hint">Daily chests give small rewards without streak pressure.</p>
          )}
          {profile.accessibility.voiceInstructions && (
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

function MemoryGame({ accessibility, onDone, onSpeak }: { accessibility: AccessibilitySettings; onDone: () => void; onSpeak: (text: string) => void }) {
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (flipped.length === 2) {
      setMoves((value) => value + 1);
      const [a, b] = flipped;
      if (memoryDeck[a] === memoryDeck[b]) setMatched((value) => [...value, a, b]);
      window.setTimeout(() => setFlipped([]), 650);
    }
  }, [flipped]);

  useEffect(() => {
    if (matched.length === memoryDeck.length) onDone();
  }, [matched, onDone]);

  return (
    <GameShell title="Collect the Sweets" hint="Flip two cards and find every matching pair." accessibility={accessibility} onSpeak={onSpeak}>
      <div className="memory-grid">
        {memoryDeck.map((card, index) => {
          const visible = flipped.includes(index) || matched.includes(index);
          return <button key={`${card}-${index}`} className="memory-card" disabled={visible || flipped.length === 2} onClick={() => setFlipped([...flipped, index])}>{visible ? card : "?"}</button>;
        })}
      </div>
      <p className="status">🎯 Moves: {moves} · Matches: {matched.length / 2}/4</p>
    </GameShell>
  );
}

function WordsGame({ accessibility, onDone, onSpeak }: { accessibility: AccessibilitySettings; onDone: (score: number) => void; onSpeak: (text: string) => void }) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState("");
  const question = wordQuestions[index];

  const answer = (option: string) => {
    const ok = option === question.answer;
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    setFeedback(ok ? `Correct. ${question.fact}` : `Try again. ${question.fact}`);
    window.setTimeout(() => {
      if (index === wordQuestions.length - 1) onDone(Math.round((nextCorrect / wordQuestions.length) * 100));
      else {
        setIndex(index + 1);
        setFeedback("");
      }
    }, 700);
  };

  return (
    <GameShell title="Find the Kazakh Word" hint="Choose the Kazakh word that matches the picture." accessibility={accessibility} onSpeak={onSpeak}>
      <div className="question-card">
        <div className="big-icon">{question.icon}</div>
        <h3>{question.prompt}</h3>
      </div>
      <div className="answers">{question.options.map((option) => <button key={option} onClick={() => answer(option)}>{option}</button>)}</div>
      {feedback && <p className="feedback">{feedback}</p>}
    </GameShell>
  );
}

function MathGame({ age, accessibility, onDone, onSpeak }: { age: Age; accessibility: AccessibilitySettings; onDone: (score: number) => void; onSpeak: (text: string) => void }) {
  const questions = useMemo(() => makeMathQuestions(age), [age]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [active, setActive] = useState(0);
  const question = questions[index];

  const answer = (option: number) => {
    const nextCorrect = correct + (option === question.answer ? 1 : 0);
    setCorrect(nextCorrect);
    if (index === questions.length - 1) onDone(Math.round((nextCorrect / questions.length) * 100));
    else {
      setIndex(index + 1);
      setActive(0);
    }
  };

  return (
    <GameShell title="Counting with Bota" hint="Pick the correct answer." accessibility={accessibility} onSpeak={onSpeak}>
      <div className="question-card"><h3>{question.prompt}</h3></div>
      {accessibility.gestureAnswerMode && (
        <div className="gesture-box">
          <strong>Gesture Mode mock</strong>
          <p>👍 selects active answer. ✋ repeats instruction. 👉 moves to next option.</p>
          <div className="cta-row">
            <button onClick={() => setActive((active + 1) % question.options.length)}>👉 Next</button>
            <button onClick={() => onSpeak(question.prompt)}>✋ Repeat</button>
            <button onClick={() => answer(question.options[active])}>👍 Select {question.options[active]}</button>
          </div>
        </div>
      )}
      <div className="answers">{question.options.map((option, optionIndex) => <button key={option} className={optionIndex === active ? "active-answer" : ""} onClick={() => answer(option)}>{option}</button>)}</div>
    </GameShell>
  );
}

function PatternGame({ accessibility, onDone, onSpeak }: { accessibility: AccessibilitySettings; onDone: (score: number) => void; onSpeak: (text: string) => void }) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState("");
  const question = patternQuestions[index];

  const answer = (option: string) => {
    const ok = option === question.answer;
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    setFeedback(`${ok ? "Correct" : "Try again"}. ${question.rule}`);
    window.setTimeout(() => {
      if (index === patternQuestions.length - 1) onDone(Math.round((nextCorrect / patternQuestions.length) * 100));
      else {
        setIndex(index + 1);
        setFeedback("");
      }
    }, 850);
  };

  return (
    <GameShell title="Pattern Caravan" hint="Find what comes next in the pattern." accessibility={accessibility} onSpeak={onSpeak}>
      <div className="sequence-card">{question.sequence.map((item, itemIndex) => <span key={`${item}-${itemIndex}`}>{item}</span>)}</div>
      <div className="answers">{question.options.map((option) => <button key={option} onClick={() => answer(option)}>{option}</button>)}</div>
      {feedback && <p className="feedback">{feedback}</p>}
    </GameShell>
  );
}

function CultureGame({ accessibility, onDone, onSpeak }: { accessibility: AccessibilitySettings; onDone: (score: number) => void; onSpeak: (text: string) => void }) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState("");
  const question = cultureQuestions[index];

  const answer = (option: string) => {
    const ok = option === question.answer;
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    setFeedback(`${ok ? "Correct" : "Good try"}. ${question.fact}`);
    window.setTimeout(() => {
      if (index === cultureQuestions.length - 1) onDone(Math.round((nextCorrect / cultureQuestions.length) * 100));
      else {
        setIndex(index + 1);
        setFeedback("");
      }
    }, 850);
  };

  return (
    <GameShell title="Culture Match" hint="Match Kazakhstan places with the right fact." accessibility={accessibility} onSpeak={onSpeak}>
      <div className="question-card culture-card">
        <div className="big-icon">🧭</div>
        <h3>{question.prompt}</h3>
      </div>
      <div className="answers">{question.options.map((option) => <button key={option} onClick={() => answer(option)}>{option}</button>)}</div>
      {feedback && <p className="feedback">{feedback}</p>}
    </GameShell>
  );
}

function GameShell({ title, hint, accessibility, onSpeak, children }: { title: string; hint: string; accessibility: AccessibilitySettings; onSpeak: (text: string) => void; children: React.ReactNode }) {
  return (
    <section className="screen">
      <p className="eyebrow">Educational quest</p>
      <h2>{title}</h2>
      <div className="bota-bubble">
        <div className="bota-face">🐫</div>
        <p>{hint}</p>
      </div>
      {accessibility.textHints && <p className="hint">Take your time! There's no rush. Audio is optional.</p>}
      {accessibility.voiceInstructions && <button onClick={() => onSpeak(hint)}>🔊 Read aloud</button>}
      {accessibility.noTimer && <p className="status">No timer — go at your own pace!</p>}
      {children}
    </section>
  );
}

function ResultScreen({
  result,
  onMap,
  onRewards,
  onAlbum,
  onGarden,
}: {
  result: GameResult;
  onMap: () => void;
  onRewards: () => void;
  onAlbum: () => void;
  onGarden: () => void;
}) {
  const great = result.score >= 80;
  return (
    <section className="screen center">
      <div className="celebration">
        <span>⭐</span><span>🌟</span><span>✨</span><span>🌟</span><span>⭐</span>
      </div>
      <p className="eyebrow">Quest complete!</p>
      <h2>{great ? "Amazing job!" : "Well done!"}</h2>
      <div className="score">{result.score}%</div>
      <div className="bota-bubble">
        <div className="bota-face">{great ? "🎉" : "🐫"}</div>
        <p>{result.alreadyAwarded
          ? "Great practice! You already earned coins for this quest."
          : <><strong>+{result.coinsEarned} Bota Coins</strong> earned! Keep exploring!</>
        }</p>
      </div>
      {!result.alreadyAwarded && result.coinsEarned > 0 && (
        <div className="coin-earned">🪙 +{result.coinsEarned}</div>
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

function ParentPin({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="screen center">
      <p className="eyebrow">Parent Mode</p>
      <h2>🔒 Enter PIN</h2>
      <p className="lead">This area is for grown-ups only.</p>
      <input className="pin" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="1234" />
      {error && <p className="feedback">{error}</p>}
      <button className="primary" onClick={() => pin === "1234" ? onSuccess() : setError("Wrong PIN. Try 1234 for the MVP demo.")}>Unlock 🔓</button>
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
        <button className="primary" onClick={onSettings}>♿ Qolaily Settings</button>
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
  const set = (key: keyof AccessibilitySettings) => onChange({ ...profile, accessibility: { ...profile.accessibility, [key]: !profile.accessibility[key] } });
  const items: [keyof AccessibilitySettings, string][] = [
    ["largeButtons", "Large Buttons"],
    ["highContrast", "High Contrast"],
    ["textHints", "Text Hints"],
    ["voiceInstructions", "Voice Instructions"],
    ["noTimer", "No Timer"],
    ["reducedAnimations", "Reduced Animations"],
    ["gestureAnswerMode", "Gesture Answer Mode"],
  ];
  return (
    <section className="screen">
      <p className="eyebrow">Qolaily Mode</p>
      <h2>♿ Accessibility Settings</h2>
      <p className="lead">Make the app comfortable for every child.</p>
      <div className="toggle-list">{items.map(([key, label]) => <label className="toggle" key={key}><span>{label}</span><input type="checkbox" checked={profile.accessibility[key]} onChange={() => set(key)} /></label>)}</div>
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
