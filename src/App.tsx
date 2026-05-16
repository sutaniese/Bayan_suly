import { FormEvent, useEffect, useMemo, useState } from "react";
import { applyGameAward, applyQrUnlock, defaultAccessibility, makeMathQuestions, makeProfile } from "./gameLogic";
import type { AccessibilitySettings, Age, Language, UserProfile } from "./gameLogic";

type View =
  | "onboarding"
  | "map"
  | "memory"
  | "words"
  | "math"
  | "result"
  | "rewards"
  | "parent-pin"
  | "parent"
  | "accessibility"
  | "qr"
  | "secret";
type Skill = "memory" | "math" | "language" | "culture";

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

const STORAGE_KEY = "botaQuest:v1";

const locations: Location[] = [
  { id: "almaty", city: "Almaty", title: "Collect the Sweets", gameId: "memory", skill: "Memory", icon: "⛰️" },
  { id: "turkestan", city: "Turkestan", title: "Find the Kazakh Word", gameId: "words", skill: "Kazakh language", icon: "🕌" },
  { id: "astana", city: "Astana", title: "Counting with Bota", gameId: "math", skill: "Math", icon: "🏛️" },
  { id: "secret", city: "Secret Location", title: "Package Adventure", skill: "QR reward", icon: "✨", locked: true },
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

const memoryDeck = ["🍬", "🍫", "🍭", "🐫"].flatMap((card) => [card, card]);

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? ({ ...makeProfile("", 7, "ru"), ...JSON.parse(raw) } as UserProfile) : null;
  } catch {
    return null;
  }
}

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [view, setView] = useState<View>(() => (loadProfile() ? "map" : "onboarding"));
  const [result, setResult] = useState<GameResult | null>(null);

  useEffect(() => {
    if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
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

  const awardGame = (game: Omit<GameResult, "coinsEarned" | "completedAt" | "alreadyAwarded">, baseCoins = 20, bonus = 10) => {
    if (!profile) return;
    const award = applyGameAward(profile, game.gameId, game.badge, baseCoins, bonus);
    const nextResult = {
      ...game,
      coinsEarned: award.coinsEarned,
      completedAt: new Date().toISOString(),
      alreadyAwarded: award.alreadyAwarded,
    };
    setProfile(award.profile);
    setResult(nextResult);
    setView("result");
  };

  const unlockQr = () => {
    if (!profile) return;
    setProfile(applyQrUnlock(profile));
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
        {profile && view === "memory" && <MemoryGame accessibility={profile.accessibility} onDone={() => awardGame({ gameId: "memory", title: "Collect the Sweets", score: 100, skill: "memory", badge: "Memory Master" })} onSpeak={speak} />}
        {profile && view === "words" && <WordsGame accessibility={profile.accessibility} onDone={(score) => awardGame({ gameId: "words", title: "Find the Kazakh Word", score, skill: "language", badge: "Kazakh Word Explorer" }, 20, score === 100 ? 10 : 0)} onSpeak={speak} />}
        {profile && view === "math" && <MathGame age={profile.age} accessibility={profile.accessibility} onDone={(score) => awardGame({ gameId: "math", title: "Counting with Bota", score, skill: "math", badge: "Young Mathematician" }, 20, score >= 80 ? 10 : 0)} onSpeak={speak} />}
        {profile && view === "result" && result && <ResultScreen result={result} onMap={() => setView("map")} onRewards={() => setView("rewards")} />}
        {profile && view === "rewards" && <RewardsShop profile={profile} />}
        {profile && view === "parent-pin" && <ParentPin onSuccess={() => setView("parent")} />}
        {profile && view === "parent" && <ParentDashboard profile={profile} onSettings={() => setView("accessibility")} onQr={() => setView("qr")} />}
        {profile && view === "accessibility" && <AccessibilityPanel profile={profile} onChange={setProfile} onBack={() => setView("parent")} />}
        {profile && view === "qr" && <QrUnlock profile={profile} onUnlock={unlockQr} onSecret={() => setView("secret")} />}
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
        <span>{profile.coins} Bota Coins</span>
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
      <p className="eyebrow">Bayan Sulu presents</p>
      <h1>Bota Quest</h1>
      <p className="lead">Travel across Kazakhstan, solve learning quests, and earn Bota Coins.</p>
      <form className="panel" onSubmit={submit}>
        <label>Child name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Age<select value={age} onChange={(event) => setAge(Number(event.target.value) as Age)}>{[7, 8, 9, 10, 11].map((item) => <option key={item}>{item}</option>)}</select></label>
        <fieldset>
          <legend>Language</legend>
          <div className="segmented">
            <button type="button" className={language === "kz" ? "active" : ""} onClick={() => setLanguage("kz")}>Қазақша</button>
            <button type="button" className={language === "ru" ? "active" : ""} onClick={() => setLanguage("ru")}>Русский</button>
          </div>
        </fieldset>
        <button className="primary" type="submit">Start Adventure</button>
      </form>
    </section>
  );
}

function MapScreen({ profile, onGo }: { profile: UserProfile; onGo: (view: View) => void }) {
  const completedCount = profile.completedGames.length;
  return (
    <section className="screen">
      <p className="eyebrow">Kazakhstan map</p>
      <h2>Choose a quest, {profile.name}</h2>
      <div className="guide-card">
        <div className="guide-avatar">🐫</div>
        <p>Bota is ready. Complete all three learning quests, then scan a package to unlock the secret stop.</p>
        <strong>{completedCount}/3 quests complete</strong>
      </div>
      <div className="map">
        {locations.map((location) => {
          const unlocked = profile.unlockedLocations.includes(location.id);
          const completed = location.gameId ? profile.completedGames.includes(location.gameId) : false;
          return (
            <button key={location.id} className={`location ${unlocked ? "" : "locked"} ${completed ? "completed" : ""}`} disabled={!unlocked} onClick={() => location.gameId ? onGo(location.gameId) : onGo("secret")}>
              <span>{completed ? "✓" : unlocked ? location.icon : "🔒"}</span>
              <div>
                <strong>{location.city}</strong>
                <small>{location.title}</small>
              </div>
              <em>{completed ? "Completed" : unlocked ? location.skill : "Scan package"}</em>
            </button>
          );
        })}
      </div>
      <div className="cta-row">
        <button onClick={() => onGo("qr")}>Scan Bota Package</button>
        <button onClick={() => onGo("rewards")}>Rewards Shop</button>
      </div>
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
      <p className="status">Moves: {moves}. Matches: {matched.length / 2}/4</p>
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

function GameShell({ title, hint, accessibility, onSpeak, children }: { title: string; hint: string; accessibility: AccessibilitySettings; onSpeak: (text: string) => void; children: React.ReactNode }) {
  return (
    <section className="screen">
      <p className="eyebrow">Educational quest</p>
      <h2>{title}</h2>
      <p className="lead">{hint}</p>
      {accessibility.textHints && <p className="hint">Text hint: take your time. Audio is optional.</p>}
      {accessibility.voiceInstructions && <button onClick={() => onSpeak(hint)}>Read instruction aloud</button>}
      {accessibility.noTimer && <p className="status">No timer mode is on.</p>}
      {children}
    </section>
  );
}

function ResultScreen({ result, onMap, onRewards }: { result: GameResult; onMap: () => void; onRewards: () => void }) {
  return (
    <section className="screen center">
      <p className="eyebrow">Quest complete</p>
      <h2>{result.title}</h2>
      <div className="score">{result.score}%</div>
      <p>{result.alreadyAwarded ? "You practiced again. Coins were already awarded for this quest." : `You earned ${result.coinsEarned} Bota Coins.`}</p>
      {result.badge && <p className="badge">Badge: {result.badge}</p>}
      <div className="cta-row">
        <button className="primary" onClick={onMap}>Back to Map</button>
        <button onClick={onRewards}>Open Rewards</button>
      </div>
    </section>
  );
}

function RewardsShop({ profile }: { profile: UserProfile }) {
  return (
    <section className="screen">
      <p className="eyebrow">Rewards shop</p>
      <h2>{profile.coins} Bota Coins</h2>
      <div className="reward-list">
        {rewards.map((reward) => {
          const unlocked = reward.type === "qr_bonus" ? profile.unlockedLocations.includes("secret") : profile.coins >= reward.cost;
          return (
            <article className={`reward ${unlocked ? "available" : ""}`} key={reward.id}>
              <strong>{reward.title}</strong>
              <span>{reward.cost ? `${reward.cost} coins` : "QR only"}</span>
              <p>{reward.description}</p>
              {reward.code && unlocked && <div className="coupon"><b>{reward.code}</b><small>{reward.discount}</small><button>Show to Parent</button><em>Concept only. Real cashier/POS integration is a future step.</em></div>}
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
      <h2>Enter PIN</h2>
      <input className="pin" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="1234" />
      {error && <p className="feedback">{error}</p>}
      <button className="primary" onClick={() => pin === "1234" ? onSuccess() : setError("Wrong PIN. Try 1234 for the MVP demo.")}>Unlock</button>
    </section>
  );
}

function ParentDashboard({ profile, onSettings, onQr }: { profile: UserProfile; onSettings: () => void; onQr: () => void }) {
  const skills = profile.completedGames.map((game) => ({ memory: "Memory", words: "Kazakh language", math: "Math" })[game] ?? game);
  return (
    <section className="screen">
      <p className="eyebrow">Parent dashboard</p>
      <h2>{profile.name}'s progress</h2>
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
      </div>
      <div className="cta-row">
        <button className="primary" onClick={onSettings}>Qolaily Settings</button>
        <button onClick={onQr}>QR Unlock</button>
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
      <h2>Adaptive accessibility</h2>
      <div className="toggle-list">{items.map(([key, label]) => <label className="toggle" key={key}><span>{label}</span><input type="checkbox" checked={profile.accessibility[key]} onChange={() => set(key)} /></label>)}</div>
      <button className="primary" onClick={onBack}>Back to Parent Mode</button>
    </section>
  );
}

function QrUnlock({ profile, onUnlock, onSecret }: { profile: UserProfile; onUnlock: () => void; onSecret: () => void }) {
  const unlocked = profile.unlockedLocations.includes("secret");
  return (
    <section className="screen center">
      <div className="qr">▦</div>
      <p className="eyebrow">Scan your Bota package</p>
      <h2>Unlock a new adventure</h2>
      <p className="lead">{unlocked ? "Your Bota package unlocked a new adventure!" : "Real QR scanning is mocked for demo reliability."}</p>
      <div className="cta-row">
        <button className="primary" onClick={onUnlock}>Simulate QR Scan</button>
        {unlocked && <button onClick={onSecret}>Open Secret Location</button>}
      </div>
    </section>
  );
}

function SecretLocation({ onMap }: { onMap: () => void }) {
  return (
    <section className="screen center secret-screen">
      <p className="eyebrow">Secret Location</p>
      <h2>Bota Package Adventure</h2>
      <p className="lead">Bota packaging becomes an entry point into an educational adventure and a repeat purchase loop.</p>
      <button className="primary" onClick={onMap}>Back to Map</button>
    </section>
  );
}

export default App;
