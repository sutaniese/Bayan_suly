# implementation.md

# Botara / Bota Quest — Accessibility Personalization Implementation Plan

## Goal

Implement an **Adaptive Child Profile** and accessibility personalization system for children with different needs:

- low vision;
- hearing difficulties;
- motor interaction difficulties;
- cognitive / focus support needs.

The system should personalize the app during onboarding and inside Parent Mode. It must visibly adapt the interface, mini-games, navigation, instructions, and feedback.

The key product idea:

**Do not ask the parent to upload a medical diagnosis as the main flow. Instead, let the parent create a comfort profile for the child. Optional document upload can exist only as a mock/future concept.**

This must be safe, respectful, and demo-friendly.

---

## Core Product Principle

Do not build a separate app for children with disabilities.

Build one inclusive app that adapts to the child.

The app should say:

**“Let’s make the app comfortable for your child.”**

Not:

**“Upload your child’s illness document.”**

Medical document upload must be optional, non-blocking, and clearly marked as a demo/mock feature.

---

## Main User Flow

1. User starts onboarding.
2. User enters child name, age, and language.
3. Parent sees “Learning Comfort Setup”.
4. Parent selects one or more support needs:
   - Better visibility.
   - Text instead of sound.
   - Easier touch controls.
   - Calm / focus mode.
   - Standard mode.
5. App automatically creates an adaptive settings profile.
6. App shows a recommendation card explaining what was enabled.
7. Child enters the main app.
8. UI, games, instructions, and feedback adapt automatically.
9. Parent can later edit accessibility settings in Parent Mode.
10. Optional: parent can upload a mock specialist recommendation file, but the file is not actually stored or processed in MVP.

---

# Phase 0 — Safety, Scope, and Product Language

## Objective

Set safe product language and avoid risky medical-data behavior.

## Tasks

### 0.1 Replace Medical Language

Avoid these labels:

- “illness document”;
- “diagnosis upload”;
- “disabled child mode”;
- “disease profile”.

Use these labels instead:

- “Learning Comfort Profile”;
- “Adaptive Profile”;
- “Support Needs”;
- “Accessibility Settings”;
- “Qolaily Mode”;
- “Comfort Setup”.

### 0.2 Add Safety Copy

Add short copy near optional document upload:

```text
Optional: You can add a specialist recommendation to help configure the app. In this MVP, the file is not stored or processed. You can also set everything manually.
```

### 0.3 Make Manual Setup Primary

The primary flow must be manual selection.

Document upload must not be required to continue.

### 0.4 Do Not Store Real Medical Data

For MVP:

- do not store uploaded files;
- do not parse real medical documents;
- do not send files to any server;
- do not ask for diagnosis names;
- do not require proof of disability.

If upload UI exists, it must be a mock.

## Acceptance Criteria

- Onboarding does not require medical documents.
- Parent can configure accessibility manually.
- Upload is optional and clearly marked as mock/future concept.
- No sensitive medical data is stored.
- Product language feels respectful and parent-friendly.

---

# Phase 1 — Data Model

## Objective

Add accessibility personalization data to the user profile.

## Tasks

### 1.1 Add Support Need Types

```ts
type SupportNeed =
  | "vision"
  | "hearing"
  | "motor"
  | "focus"
  | "standard";
```

### 1.2 Add Accessibility Settings Model

```ts
type AccessibilitySettings = {
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
```

Important: `soundRequired` should almost always be `false`. It exists only to explicitly represent that audio must not be mandatory.

### 1.3 Add Adaptive Profile Model

```ts
type AdaptiveProfile = {
  supportNeeds: SupportNeed[];
  settings: AccessibilitySettings;
  setupSource: "manual" | "mock_document" | "default";
  recommendationSummary: string[];
};
```

### 1.4 Extend User Profile

```ts
type UserProfile = {
  name: string;
  age: 7 | 8 | 9 | 10 | 11;
  language: "ru" | "kz";
  coins: number;
  completedGames: string[];
  unlockedLocations: string[];
  badges: string[];
  adaptiveProfile: AdaptiveProfile;
};
```

### 1.5 Add Default Settings

```ts
const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
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
  botaVoiceGuide: false
};
```

### 1.6 Add Hydration Logic

Old localStorage profiles must not break.

When loading profile:

- if `adaptiveProfile` is missing, add default profile;
- if individual settings are missing, hydrate with defaults.

## Acceptance Criteria

- User profile supports adaptive settings.
- Old saved profiles still work.
- Clearing localStorage creates a valid default profile.
- All settings are persisted after refresh.

---

# Phase 2 — Learning Comfort Setup in Onboarding

## Objective

Add an onboarding step where the parent can configure the child’s support needs.

## Screen Name

`LearningComfortSetup`

## UI Copy

Title:

```text
Make Botara comfortable for your child
```

Subtitle:

```text
Choose how the app should adapt. You can change this later in Parent Mode.
```

## Support Need Cards

Create selectable cards:

### 1. Better Visibility

Label:

```text
Better visibility
```

Description:

```text
Larger text, high contrast, voice instructions, and fewer small details.
```

Maps to support need: `vision`

---

### 2. Text Instead of Sound

Label:

```text
Text instead of sound
```

Description:

```text
Subtitles, visual feedback, and no audio-only tasks.
```

Maps to support need: `hearing`

---

### 3. Easier Touch Controls

Label:

```text
Easier touch controls
```

Description:

```text
Bigger buttons, no drag-only actions, and optional gesture answers.
```

Maps to support need: `motor`

---

### 4. Calm Focus Mode

Label:

```text
Calm focus mode
```

Description:

```text
No timer, fewer animations, simpler instructions, and one task at a time.
```

Maps to support need: `focus`

---

### 5. Standard Mode

Label:

```text
Standard mode
```

Description:

```text
Use the regular Bota Quest experience.
```

Maps to support need: `standard`

## Selection Logic

- Multiple support needs can be selected.
- If `standard` is selected, unselect all other support needs.
- If any non-standard support need is selected, unselect `standard`.
- User can skip and use standard mode.

## CTA Buttons

- Primary: `Create adaptive profile`
- Secondary: `Skip for now`
- Optional: `Add specialist recommendation (mock)`

## Acceptance Criteria

- Onboarding includes Learning Comfort Setup.
- Parent can select one or multiple support needs.
- Standard mode logic works correctly.
- Adaptive profile is created from selected needs.
- User can continue without uploading any document.

---

# Phase 3 — Settings Auto-Mapping Engine

## Objective

Automatically convert selected support needs into accessibility settings.

## Function

Create a pure function:

```ts
function buildAccessibilitySettings(needs: SupportNeed[]): AccessibilitySettings
```

## Mapping Rules

### Vision Support

If `vision` is selected, enable:

```ts
largeText: true;
largeButtons: true;
highContrast: true;
simplifiedVisuals: true;
voiceInstructions: true;
voiceNavigation: true;
botaVoiceGuide: true;
textHints: true;
visualFeedback: true;
soundRequired: false;
```

### Hearing Support

If `hearing` is selected, enable:

```ts
textHints: true;
subtitles: true;
visualFeedback: true;
soundRequired: false;
```

Disable any audio-only dependency.

Do not disable optional sound completely unless there is a UI toggle for it. Audio can exist, but must never be required.

### Motor Support

If `motor` is selected, enable:

```ts
largeButtons: true;
extraLargeTouchTargets: true;
noDragRequired: true;
gestureAnswerMode: true;
confirmBeforeActions: true;
noTimer: true;
```

### Focus Support

If `focus` is selected, enable:

```ts
reducedAnimations: true;
simplifiedInstructions: true;
oneTaskAtATime: true;
fewerAnswerOptions: true;
noTimer: true;
simplifiedVisuals: true;
textHints: true;
```

### Standard Mode

If only `standard` is selected:

- use default settings;
- keep `textHints`, `subtitles`, and `visualFeedback` enabled by default because they are good universal design.

## Recommendation Summary

Create function:

```ts
function buildRecommendationSummary(needs: SupportNeed[], settings: AccessibilitySettings): string[]
```

Example output:

```ts
[
  "Large text and high contrast enabled for better visibility.",
  "Voice instructions and Bota Voice Guide enabled.",
  "Timers removed to reduce pressure.",
  "Buttons enlarged for easier interaction."
]
```

## Acceptance Criteria

- Selected needs correctly map to settings.
- Multiple needs combine without conflicts.
- Standard mode resets to safe default settings.
- Recommendation summary is generated and displayed.

---

# Phase 4 — Adaptive Profile Result Screen

## Objective

After setup, show parent exactly how the app was personalized.

## Screen Name

`AdaptiveProfileResult`

## UI Requirements

Show:

- child name;
- selected support needs;
- enabled settings summary;
- reassuring explanation;
- CTA to continue to the map.

## Example Copy

```text
Botara is ready for Amina.

We adjusted the app to make learning more comfortable:

• Larger buttons
• High contrast
• Voice instructions
• No timer
• Simpler tasks

You can change these settings anytime in Parent Mode.
```

## Acceptance Criteria

- Result screen appears after comfort setup.
- Summary matches selected support needs.
- CTA continues to the main app.
- Parent understands what changed.

---

# Phase 5 — Global UI Adaptation Layer

## Objective

Make accessibility settings visibly affect the whole app.

## Tasks

### 5.1 Add Global CSS Classes

At root app level, apply classes based on settings:

```ts
const rootClasses = cn({
  "access-large-text": settings.largeText,
  "access-large-buttons": settings.largeButtons,
  "access-high-contrast": settings.highContrast,
  "access-reduced-motion": settings.reducedAnimations,
  "access-simplified-visuals": settings.simplifiedVisuals
});
```

### 5.2 Define Styles

Implement global styles:

```css
.access-large-text {
  font-size: 1.15rem;
}

.access-large-buttons button,
.access-large-buttons .tap-target {
  min-height: 56px;
  padding: 16px 20px;
}

.access-high-contrast {
  filter: contrast(1.15);
}

.access-reduced-motion *,
.access-reduced-motion *::before,
.access-reduced-motion *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
}
```

Adjust implementation based on existing Tailwind setup.

### 5.3 Avoid Breaking Design

High contrast should improve readability without making the app ugly.

Use stronger borders, darker text, and clearer card backgrounds.

## Acceptance Criteria

- Large text visibly changes UI.
- Large buttons visibly change UI.
- High contrast visibly changes UI.
- Reduced motion disables or minimizes animations.
- Changes apply across main screens, not only one page.

---

# Phase 6 — Bota Voice Guide

## Objective

Add a voice/navigation assistant for children, especially useful for low vision and reading difficulties.

## MVP Positioning

Name:

```text
Bota Voice Guide
```

Purpose:

- read instructions aloud;
- repeat tasks;
- navigate to key screens;
- answer simple app-related questions;
- help child continue without relying only on visual UI.

## MVP Implementation Options

Use one of two approaches:

### Option A — Stable Mock Voice Guide

Recommended for hackathon reliability.

UI:

- floating Bota assistant button;
- opens a command panel;
- command chips:
  - “Open map”;
  - “Open word game”;
  - “Repeat instruction”;
  - “How many coins?”;
  - “Open rewards”;
  - “Call parent”;
  - “Turn on large text”.

When user taps a command, app performs the action.

### Option B — Browser Speech Recognition

Use browser speech recognition only if stable.

Must include fallback to command chips.

Do not make speech recognition required for demo.

## Required Commands

Implement at least these commands:

```ts
type VoiceCommand =
  | "open_map"
  | "open_words_game"
  | "open_rewards"
  | "repeat_instruction"
  | "show_coins"
  | "open_parent_mode"
  | "enable_large_text";
```

## Voice Output

If `voiceInstructions` is enabled, use browser text-to-speech for:

- game instructions;
- selected command confirmation;
- result feedback.

Create helper:

```ts
function speak(text: string, language: "ru" | "kz" | "en") {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}
```

Kazakh TTS availability may vary. If it does not work reliably, fall back to Russian/English or show text only.

## Acceptance Criteria

- Bota Voice Guide is visible when enabled.
- User can open command panel.
- At least 5 commands work.
- “Repeat instruction” works on at least one game.
- “Show coins” reads or displays coin balance.
- Voice guide has button fallback.
- App works even if speech APIs are unavailable.

---

# Phase 7 — Instruction System and “Explain Simpler”

## Objective

Make all game instructions adaptive.

## Tasks

### 7.1 Create Instruction Object

For each game/task, define:

```ts
type AdaptiveInstruction = {
  default: string;
  simple: string;
  audioText: string;
};
```

Example:

```ts
const wordGameInstruction = {
  default: "Choose the Kazakh word that matches the picture.",
  simple: "Find the word for this picture.",
  audioText: "Look at the picture and choose the correct word."
};
```

### 7.2 Display Based on Settings

If `simplifiedInstructions` is enabled, show `simple`.

If `voiceInstructions` is enabled, show “Read aloud” button.

If `textHints` is enabled, keep visible hint text on screen.

### 7.3 Add “Explain Simpler” Button

Add button:

```text
Explain simpler
```

When clicked:

- replace instruction with simple version;
- optionally speak simple version;
- do not penalize the child.

## Acceptance Criteria

- At least 3 games use adaptive instructions.
- “Explain simpler” is available in games.
- Read-aloud button works or gracefully falls back.
- Text hints are visible when enabled.

---

# Phase 8 — Adaptive Mini-Game Behavior

## Objective

Modify mini-games based on accessibility settings.

## Game 1: Memory Game

### Standard Mode

- 8 cards.
- Normal card size.
- Normal animation.

### Vision Support

- larger cards;
- stronger contrast;
- optional voice label when card is selected;
- fewer tiny details.

### Motor Support

- larger cards;
- no drag;
- tap-only interaction;
- prevent accidental double taps if needed.

### Focus Support

- 4 or 6 cards instead of 8;
- less animation;
- one instruction at a time;
- no timer.

## Game 2: Kazakh Words

### Standard Mode

- image + 4 answer options.

### Vision Support

- large options;
- read options aloud;
- high contrast.

### Hearing Support

- all prompts shown as text;
- visual feedback for correct/incorrect.

### Focus Support

- 2 answer options instead of 4;
- simplified instruction;
- no timer.

### Motor Support

- extra-large answer buttons;
- optional gesture answer mode.

## Game 3: Math Game

### Standard Mode

- 3–4 options.

### Vision Support

- read problem aloud;
- large numbers;
- high contrast.

### Focus Support

- shorter word problems;
- 2–3 options;
- no timer;
- step-by-step hint.

### Motor Support

- large answer buttons;
- confirm answer before submitting if `confirmBeforeActions` is enabled.

## Acceptance Criteria

- At least 3 mini-games read accessibility settings.
- Focus mode reduces cognitive load.
- Vision mode improves readability and voice support.
- Hearing mode never requires audio.
- Motor mode increases touch target size and avoids drag-only interactions.

---

# Phase 9 — Multi-Modal Feedback System

## Objective

Ensure feedback is understandable through multiple channels.

Every important feedback event must include at least:

- text;
- icon;
- visual state;
- optional sound/voice;
- optional animation only if reduced motion is off.

## Feedback Examples

### Correct Answer

Text:

```text
Correct!
```

Icon:

```text
✅
```

Optional voice:

```text
Great job!
```

### Wrong Answer

Text:

```text
Try again. Here is a hint.
```

Icon:

```text
💡
```

No harsh sounds. No punishment.

### Reward Earned

Text:

```text
You earned 20 Bota Coins!
```

Icon:

```text
🪙
```

## Acceptance Criteria

- Correct/incorrect feedback is never audio-only.
- Color is not the only indicator.
- Reduced motion mode disables big animations/confetti.
- Feedback is positive and non-punishing.

---

# Phase 10 — Gesture Answer Mode

## Objective

Add optional gesture-based answering for children who have difficulty with precise touch input.

## Scope

Gesture Answer Mode is a P2/wow feature.

It must not block the main demo.

## MVP Options

### Stable Mock Version

Recommended for demo.

- Show camera-like panel or placeholder.
- Show gesture options.
- User clicks “Simulate thumbs up”.
- App selects current answer.

### Real Version

Use MediaPipe or Hugging Face gesture recognition only if stable.

Must include fallback to mock/buttons.

## Gesture Set

Minimum:

- 👍 = select / confirm active answer.

Optional:

- ✋ = repeat instruction.
- 👉 = next option.

## UI Requirements

- Gesture mode must be enabled only if `gestureAnswerMode` is true.
- Show clear explanation:

```text
You can answer with a gesture or use the buttons below.
```

- Always keep button controls visible.

## Acceptance Criteria

- Gesture mode can be toggled in settings.
- At least one game shows gesture answer mode.
- Simulated gesture can select/confirm an answer.
- Button fallback always remains available.
- App works without camera permission.

---

# Phase 11 — Optional Mock Document Upload

## Objective

Show future potential for recommendation-based personalization without storing or processing medical data.

## Scope

This is optional and should not be prioritized before manual setup.

## UI Copy

Title:

```text
Optional recommendation
```

Description:

```text
In the future, Botara could use a specialist recommendation to suggest accessibility settings. For this MVP, uploaded files are not stored or processed.
```

Buttons:

- “Use sample recommendation”;
- “Continue with manual setup”;
- “Skip”.

## Mock Flow

If user clicks “Use sample recommendation”:

- show fake processing state for 1 second;
- apply a predefined profile, for example `vision + focus`;
- show recommendation summary.

Do not upload real file.

Do not ask for diagnosis.

Do not store document name/content.

## Acceptance Criteria

- Mock document flow is optional.
- Manual setup remains primary.
- No file is stored.
- User can complete onboarding without using this.
- Mock flow applies accessibility settings and shows summary.

---

# Phase 12 — Parent Mode Accessibility Dashboard

## Objective

Allow parent to review and edit adaptive settings after onboarding.

## UI Requirements

Add section to Parent Mode:

```text
Adaptive Profile
```

Show:

- selected support needs;
- enabled settings;
- recommendation summary;
- comfort profile status;
- edit button.

## Parent Controls

Allow toggling:

- large text;
- large buttons;
- high contrast;
- voice instructions;
- text hints;
- no timer;
- reduced animations;
- simplified instructions;
- gesture answer mode.

## Comfort Status Card

Example:

```text
Comfort profile: Active
Enabled: Large buttons, high contrast, voice guide, no timer.
```

## Acceptance Criteria

- Parent can view adaptive profile.
- Parent can toggle individual settings.
- Changes apply immediately or after save.
- Settings persist after refresh.
- Parent can reset to standard mode.

---

# Phase 13 — Demo Script

## Objective

Create a reliable demo path that shows accessibility personalization clearly.

## Demo Flow

1. Open app from fresh state.
2. Enter child name and age.
3. Open Learning Comfort Setup.
4. Select “Better visibility” and “Calm focus mode”.
5. App generates adaptive profile.
6. Show Adaptive Profile Result:
   - large text;
   - high contrast;
   - voice instructions;
   - no timer;
   - simplified tasks.
7. Continue to map.
8. Show that UI is larger and clearer.
9. Open Kazakh Words game.
10. Show simplified instruction.
11. Click “Read aloud” or Bota Voice Guide.
12. Click “Explain simpler”.
13. Complete task with large buttons.
14. Open Parent Mode.
15. Show Adaptive Profile dashboard.
16. Toggle Gesture Answer Mode.
17. Return to a game.
18. Show gesture answer mock.
19. End with product message:

```text
Botara adapts to the child instead of forcing every child into the same interface.
```

## Acceptance Criteria

- Demo works without camera.
- Demo works without backend.
- Demo works after refresh.
- Personalization is visible, not only stored in state.
- Parent benefit is obvious.

---

# Phase 14 — Stability Checklist

Before final submission, verify:

- Onboarding works from empty localStorage.
- Comfort setup can be skipped.
- Multiple support needs can be selected.
- Standard mode resets accessibility settings.
- Adaptive profile result shows correct summary.
- Large text does not break layout.
- Large buttons do not overflow.
- High contrast remains readable.
- Reduced motion does not break transitions.
- Voice guide works or gracefully falls back.
- Read-aloud button does not crash unsupported browsers.
- Games adapt to settings.
- Parent Mode can edit settings.
- Gesture mode does not require camera.
- Mock document flow does not store files.
- No screen is a dead end.

---

# Priority Order

## P0 — Must Have

1. Data model for adaptive profile.
2. Learning Comfort Setup onboarding.
3. Settings auto-mapping engine.
4. Adaptive Profile Result screen.
5. Global UI adaptation:
   - large text;
   - large buttons;
   - high contrast;
   - reduced motion.
6. Parent Mode accessibility dashboard.
7. Adaptive instructions in games.

## P1 — Should Have

8. Bota Voice Guide mock.
9. Read-aloud instructions.
10. Explain Simpler button.
11. Adaptive mini-game difficulty.
12. Multi-modal feedback.

## P2 — Wow Feature

13. Gesture Answer Mode mock.
14. Optional mock document recommendation flow.
15. Real browser speech recognition.
16. Real gesture recognition with MediaPipe/Hugging Face.

---

# What Not To Build

Do not build:

- real medical document upload;
- real diagnosis parsing;
- backend storage of sensitive health data;
- required camera access;
- required microphone access;
- real AI medical interpretation;
- complex ML without fallback;
- separate app for disabled children;
- any claim that this fully supports all disabilities.

Do not say:

```text
The app diagnoses the child.
```

Say:

```text
The app adapts to the parent’s selected comfort needs.
```

---

# Final Product Message

This implementation should make the product feel meaningfully inclusive:

- The parent creates an Adaptive Child Profile.
- The app automatically changes UI and game behavior.
- Children with low vision can use larger UI and voice guidance.
- Children with hearing difficulties get subtitles and visual feedback.
- Children with motor difficulties get larger controls and optional gesture answers.
- Children who need focus support get calm mode, no timers, and simpler instructions.

The winning message:

**Botara adapts to the child — not the other way around.**

