# Bota Quest Agent Rules

These rules apply to every agent working on this repository. Read this file before starting work, keep it open while building, and read it again before the final response or handoff.

## What We Are Building

Bota Quest is a mobile-first educational loyalty prototype for the Bota children's brand by Bayan Sulu.

The MVP must demonstrate this complete loop:

```text
Product package -> QR unlock -> educational game -> Bota Coins -> reward/coupon -> repeat purchase
```

The product is not only a children's game. It is an inclusive educational QR-to-reward experience with:

- Child onboarding for ages 7-11.
- A stylized Kazakhstan map.
- Three educational mini-games: memory, Kazakh words, and math.
- Bota Coins earned only through educational actions.
- A rewards shop with mock coupons and badges.
- Parent Mode protected by PIN `1234`.
- Qolaily Mode with visible accessibility adaptations.
- A mock QR unlock flow that opens a secret location.

Demo reliability matters more than feature count. The full demo path must be clear, deterministic, mobile-friendly, and completable in under 3 minutes.

## Source Of Truth

Agents must follow this priority order:

1. The current user task.
2. `rule.md`.
3. The implementation plan for the active branch/task.
4. `README.md`.
5. Existing code patterns in the repository.

If instructions conflict, stop and ask for clarification before changing code.

## Required Read Cycle

Before building:

- Read `rule.md`.
- Read `README.md`.
- Read the active implementation plan.
- Inspect the files you will change.
- Confirm which branch/worktree you are working in.

After building:

- Re-read `rule.md`.
- Compare the result against the implementation plan.
- Confirm the app still supports the required Bota Quest MVP flow.
- Check that no screen is a dead end.
- Commit the completed code change.

## Implementation Plan Discipline

- Strictly follow the implementation plan for the branch/task.
- Do not add features that are not in the plan unless the user explicitly asks.
- If the plan is missing, create or request an implementation plan before coding.
- If the plan is outdated, update it first and explain why.
- Mark completed plan items as done only after implementation and verification.
- Keep work small enough that each commit maps to one clear plan item or fix.

## Branch Responsibilities

### `builder`

Owns app foundation and product logic:

- Vite/React/TypeScript setup.
- App routing or screen state.
- Data models.
- `localStorage` persistence.
- Bota Coins logic.
- Game completion state.
- QR unlock state.
- Parent Mode PIN logic.
- Basic validation and build stability.

### `frontend`

Owns product UI/UX and accessibility behavior:

- Mobile-first layout.
- Touch-friendly controls.
- Visual polish for child, parent, and accessibility flows.
- Qolaily Mode UI changes.
- High contrast, large interface, large buttons, text hints, reduced animations, and no-timer states.
- Clear feedback for correct/incorrect answers.
- Responsive QA for smartphone screens.

### `landing`

Owns the landing/presentation experience:

- Public landing page or intro page if required by the implementation plan.
- Clear product positioning.
- Business loop explanation.
- Parent and brand value proposition.
- Demo entry points.
- Brand-safe copy and visuals.

Agents may touch shared files only when their task requires it. Do not overwrite another agent's work. Pull/rebase/merge carefully when coordinating branches.

## Commit Rules

- Commit after every completed code change.
- Do not leave uncommitted code changes at the end of a task.
- Do not batch unrelated changes into one commit.
- Before committing, run the relevant verification command when available.
- Use clear commit messages that explain the user-visible or technical result.

Suggested commit format:

```text
<area>: <short result>
```

Examples:

```text
builder: add local profile persistence
frontend: improve Qolaily high contrast mode
landing: add product loop section
```

If Git is not initialized yet, say so clearly in the handoff and list the files changed.

## Technical Rules

- Prefer React, Vite, TypeScript, Tailwind CSS, and `localStorage`.
- Avoid backend, authentication, payments, real coupon redemption, and real POS integration.
- Keep camera or ML features optional and non-blocking.
- Gesture Answer Mode may be mocked for reliability.
- All data must remain local for the MVP.
- Do not collect real personal data.
- Do not make any flow depend only on audio, color, timing, camera, or precise touch.
- Use deterministic demo data where it improves reliability.

## UX Rules

- Mobile-first is mandatory.
- Buttons and cards must be large enough for children.
- Every screen must have a clear next action and a way back where appropriate.
- Bota Coins balance must be visible on the map, result screen, rewards shop, and Parent Mode.
- Open, locked, and completed locations must be visually distinct.
- Accessibility settings must visibly change the UI.
- Audio hints must have text equivalents.
- Avoid fast reaction-based gameplay.
- Avoid tiny critical controls.

## Mini-Game Requirements

The MVP must include these three games end-to-end:

- `Collect the Sweets`: memory matching game with at least 6 cards, preferably 8.
- `Find the Kazakh Word`: language/culture quiz with 2-4 answer options.
- `Counting with Bota`: age-aware math quiz.

Reward rules:

- Completing a mini-game gives `+20` Bota Coins.
- Perfect result or correct streak may give `+10` bonus coins.
- QR unlock gives `+15` Bota Coins.

## Parent And Accessibility Requirements

Parent Mode:

- Must use PIN `1234` for MVP access.
- Must show child name, age, language, coins, completed games, skills trained, screen time, rewards, and accessibility settings.

Qolaily Mode:

- Must adapt the main product rather than creating a separate app.
- Must support at least 3 visible accessibility settings.
- Recommended settings: Large Interface, High Contrast, Text Hints, Voice Instructions, Large Buttons, No Timer, Reduced Animations, Gesture Answer Mode.

## Verification Checklist

Before final handoff, verify as much as the current project state allows:

- App installs and builds if package scripts exist.
- No TypeScript or lint errors if those checks exist.
- Onboarding leads to the Kazakhstan map.
- The three mini-games can be completed.
- Coins are awarded and persisted.
- Rewards shop shows a mock coupon.
- Parent Mode opens with PIN `1234`.
- Qolaily settings visibly affect the UI.
- QR simulation unlocks the secret location.
- Mobile viewport remains usable.
- No screen is a dead end.

If a check cannot be run, mention why in the handoff.

## Handoff Rules

Every agent handoff must include:

- Branch/worktree used.
- Files changed.
- Commit hash or note that Git is not initialized.
- Verification commands run and results.
- Any known gaps or next recommended plan item.

Keep handoffs short, factual, and tied to the implementation plan.
