# Bota Quest

Bota Quest is an inclusive educational adventure prototype for the Bota children's brand by Bayan Sulu. It turns a physical product package into a digital learning journey where children travel across Kazakhstan with Bota, complete mini-games, earn Bota Coins, and unlock conceptual rewards.

The MVP demonstrates a complete loyalty and learning loop:

```text
Product package -> QR unlock -> educational game -> Bota Coins -> reward/coupon -> repeat purchase
```

## Product Goal

Build a polished hackathon prototype that shows how Bota packaging can become an entry point into an educational, parent-friendly, and inclusive digital experience.

The app should demonstrate:

- A simple mobile-first experience for children aged 7-11.
- Educational mini-games tied to math, memory, Kazakh language, and culture.
- A Bota Coins reward system connected to mock coupons and badges.
- Parent Mode with progress, safety, screen time, and accessibility controls.
- Qolaily Mode, an adaptive accessibility mode for children with different needs.
- A QR unlock scenario that connects the physical product package to the app.

## Target Users

### Children Aged 7-11

Children need simple rules, large buttons, fast feedback, a friendly guide character, rewards, and an adventure that can be played without heavy reading or adult help.

### Parents

Parents need to see that the child is learning, not only spending screen time. Parent Mode should show progress, skills trained, screen time controls, rewards, and accessibility settings.

### Bayan Sulu / Bota Brand

The business goal is to increase loyalty, connect packaging with a digital experience, encourage repeat purchases, and position Bota as a guide into learning and discovery.

## Core User Flow

1. Parent buys a Bota product.
2. Child opens Bota Quest from the package QR code.
3. Child creates a local profile with name, age, and language.
4. Child lands on a stylized Kazakhstan map.
5. Bota suggests educational quests across Kazakhstan.
6. Child completes mini-games and earns Bota Coins.
7. Child opens the rewards shop and sees mock coupons or badges.
8. Parent opens Parent Mode with PIN `1234`.
9. Parent enables Qolaily Mode and accessibility settings.
10. Child simulates scanning a Bota package and unlocks a secret location.

## MVP Screens

- Welcome / Onboarding
- Language Select
- Profile Setup
- Kazakhstan Map
- Memory Game
- Kazakh Words Game
- Math Game
- Game Result
- Rewards Shop
- Parent Mode PIN
- Parent Dashboard
- Accessibility Settings
- QR Unlock
- Secret Location

## Core Features

### Onboarding

- Bota character or placeholder character art.
- Friendly welcome message.
- Language selection: Russian / Kazakh.
- Child name input.
- Age selection: 7, 8, 9, 10, 11.
- Primary CTA: `Start Adventure`.
- Local profile persisted in `localStorage`.

### Kazakhstan Map

The map is the main navigation screen.

Required locations:

- Astana - Baiterek: `Counting with Bota`, math skill.
- Almaty - Mountains: `Collect the Sweets`, memory skill.
- Turkestan - Mausoleum: `Find the Kazakh Word`, Kazakh language skill.
- Secret Location: locked by default and unlocked through the QR scenario.

The map should show open, locked, and completed states. Bota Coins must be visible.

### Mini-Games

#### Collect the Sweets

Memory and attention game with large touch-friendly cards. The child flips two cards at a time and matches all pairs.

Rewards:

- Completion: `+20` Bota Coins.
- Perfect result: `+10` bonus Bota Coins.
- Badge: `Memory Master`.

#### Find the Kazakh Word

Language and culture game. The child sees an image or icon and chooses the correct Kazakh word from 2-4 options.

Example concepts:

- camel
- mountain
- apple
- water
- steppe

Rewards:

- Completion: `+20` Bota Coins.
- All answers correct: `+10` bonus Bota Coins.
- Badge: `Kazakh Word Explorer`.

#### Counting with Bota

Math and logic game with multiple-choice answers. Difficulty depends on age.

- Age 7: addition up to 10.
- Ages 8-9: addition/subtraction up to 20.
- Ages 10-11: simple multiplication or logic tasks.

Rewards:

- Completion: `+20` Bota Coins.
- Correct streak: `+10` bonus Bota Coins.
- Badge: `Young Mathematician`.

### Bota Coins

Bota Coins should be earned only through educational actions.

Earning rules:

- Completing a mini-game: `+20` coins.
- Perfect result: `+10` coins.
- QR unlock: `+15` coins.
- Daily task placeholder: `+5` coins.

The balance must be visible on the map, result screen, rewards shop, and Parent Mode dashboard.

### Rewards Shop

The rewards shop shows the connection between learning progress and real-world product incentives.

Example rewards:

- `50` Bota Coins: digital badge.
- `100` Bota Coins: conceptual 100 KZT coupon for Bota products.
- `250` Bota Coins: family bonus.
- QR-only reward: unlocked after scanning a product package.

Coupon cards should include a mock coupon code, discount value, `Show to Parent` button, and this disclaimer:

```text
Concept only. Real cashier/POS integration is a future step.
```

### Parent Mode

Parent Mode is protected with a simple MVP PIN:

```text
1234
```

The dashboard should show:

- Child name
- Age
- Selected language
- Bota Coins balance
- Completed games
- Skills trained
- Screen time limit
- Available rewards/coupons
- Accessibility settings

Default daily screen time limit:

```text
30 minutes per day
```

### Qolaily Mode

Qolaily Mode is the main product differentiator. It makes the main app adaptive instead of creating a separate experience for children with disabilities.

Accessibility settings:

- Large Interface
- High Contrast
- Text Hints
- Voice Instructions or `Read instruction aloud`
- Large Buttons
- No Timer
- Reduced Animations
- Gesture Answer Mode

The UI must visibly change when accessibility settings are enabled.

### Gesture Answer Mode

Gesture Answer Mode is an experimental accessibility interaction for children who may have difficulty pressing small buttons or interacting precisely with a touchscreen.

Suggested gestures:

- Thumbs up: confirm or select active answer.
- Open hand: repeat instruction.
- Point right: next answer option.

For demo reliability, this feature may be mocked. Gesture Mode must never block the main app flow; normal button controls must always remain available.

### QR Unlock Scenario

Real QR scanning is not required for the MVP.

Required flow:

1. Show `Scan your Bota package`.
2. Show `Simulate QR Scan`.
3. On click, unlock the secret location.
4. Add `+15` Bota Coins.
5. Show: `Your Bota package unlocked a new adventure!`

## Recommended Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- `localStorage`
- Vercel, Netlify, or Lovable for deployment

Avoid unnecessary backend complexity for the MVP.

## Suggested Setup

If the project has not been scaffolded yet:

```bash
npm create vite@latest bota-quest -- --template react-ts
cd bota-quest
npm install
npm install tailwindcss @tailwindcss/vite
```

Common development commands:

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Data Models

```ts
export type UserProfile = {
  name: string;
  age: 7 | 8 | 9 | 10 | 11;
  language: "ru" | "kz";
  coins: number;
  completedGames: string[];
  unlockedLocations: string[];
  badges: string[];
  accessibility: AccessibilitySettings;
};

export type AccessibilitySettings = {
  largeButtons: boolean;
  highContrast: boolean;
  noTimer: boolean;
  reducedAnimations: boolean;
  textHints: boolean;
  voiceInstructions: boolean;
  gestureAnswerMode: boolean;
};

export type GameResult = {
  gameId: string;
  score: number;
  coinsEarned: number;
  skill: "memory" | "math" | "language" | "culture";
  completedAt: string;
};

export type Location = {
  id: string;
  title: string;
  city: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  gameId?: string;
};

export type Reward = {
  id: string;
  title: string;
  cost: number;
  type: "badge" | "coupon" | "qr_bonus";
  description: string;
  isUnlocked: boolean;
};
```

## Acceptance Criteria

The MVP is complete when:

- User can complete onboarding.
- User can enter name, age, and language.
- Kazakhstan map opens after onboarding.
- Map has at least 3 visible locations.
- At least 3 mini-games work end-to-end.
- Bota Coins are awarded after games.
- Progress is saved locally.
- Rewards shop works.
- Mock coupon is visible.
- Parent Mode opens with PIN `1234`.
- Parent Mode shows child progress.
- Qolaily Mode can be enabled.
- Accessibility settings visibly change the UI.
- At least 3 accessibility settings are implemented.
- QR unlock scenario works.
- Secret location unlocks after mock QR scan.
- App works on a smartphone screen.
- Gesture mode has a fallback to normal buttons.
- No screen is a dead end.
- Demo path can be completed reliably in under 3 minutes.

## Development Priorities

### P0 - Must Have

- Onboarding
- Kazakhstan map
- 3 mini-games
- Bota Coins
- Rewards shop
- Parent Mode
- QR unlock
- Basic Qolaily Mode

### P1 - Should Have

- Voice instructions
- High contrast mode
- No timer mode
- Reduced animations
- Visual feedback for hearing support
- Text hints

### P2 - Wow Feature

- Gesture Answer Mode
- Hugging Face or MediaPipe model integration
- Secret location after QR unlock
- Badges
- Better animations and polish

## Out of Scope

- Real backend
- Real authentication
- Real payments
- Real POS integration
- Real cashier coupon redemption
- Complex user accounts
- Full QR scanner if time is short
- 3D game
- Multiplayer
- 10+ mini-games
- Complex ML without fallback
- Claims that the app supports every type of disability

## Demo Script

1. Open the app.
2. Bota welcomes the child.
3. Enter name and age.
4. Select language.
5. Open Kazakhstan map.
6. Select Almaty.
7. Complete memory game.
8. Earn Bota Coins.
9. Select Turkestan.
10. Complete Kazakh words game.
11. Select Astana.
12. Complete math game.
13. Open rewards shop.
14. Show coupon for Bota Coins.
15. Open Parent Mode.
16. Show child progress.
17. Enable Qolaily Mode.
18. Show larger or clearer interface.
19. Show voice/text hints.
20. Show Gesture Answer Mode or a stable mock.
21. Open QR Unlock screen.
22. Simulate scanning a Bota package.
23. Unlock secret location.
24. End with the business loop: Bota packaging becomes an entry point into an educational adventure and a repeat purchase loop.

## Implementation Notes

- Keep the app mobile-first.
- Prioritize demo reliability over feature count.
- Use `localStorage` instead of a backend.
- Keep all flows deterministic and easy to demo.
- Do not create dead-end screens.
- Every screen must have a clear next action.
- Accessibility mode must visibly change the UI.
- QR scanning can be mocked.
- Gesture recognition can be mocked if real ML integration is unstable.
- Avoid adding new features before the core demo path is stable.

## Product Positioning

Bota Quest is an inclusive educational loyalty experience for the Bota brand.

For children, it is an adventure across Kazakhstan with Bota. For parents, it is a safe and controlled educational app with visible progress and accessibility options. For Bayan Sulu, it is a digital loyalty loop that connects product packaging, learning, rewards, and repeat purchases.

The key differentiator is an inclusive educational QR-to-reward loop that turns every Bota package into a new learning adventure.
