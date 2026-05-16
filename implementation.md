# Bota Quest Implementation Plan

## Summary

Build a mobile-first React/Vite/TypeScript prototype for **Bota Quest**, an inclusive educational loyalty experience for Bayan Sulu's "Bota" brand. Children travel across a stylized Kazakhstan map, complete three educational mini-games, earn Bota Coins, unlock mock rewards/coupons, and demonstrate how Bota product packaging can connect to repeat digital engagement through a QR unlock flow.

The MVP is local-only: no backend, no real authentication, no payments, no real POS coupon redemption, and no mandatory camera/ML dependency.

## Phases

### Phase 1: Foundation

- Scaffold React, Vite, TypeScript, and a mobile-first styling layer.
- Define app views for onboarding, map, games, result, rewards, parent mode, accessibility settings, QR unlock, and secret location.
- Persist one local profile and progress in `localStorage`.
- Use deterministic content so the demo can be completed reliably.

### Phase 2: Onboarding and Map

- Build onboarding with Bota art, language selection, child name, age selector, and `Start Adventure`.
- Create the Kazakhstan map hub with visible coin balance and four locations: Astana, Almaty, Turkestan, and Secret Location.
- Show open, locked, and completed states, with a clear return path from every flow.

### Phase 3: Mini-Games and Rewards

- Implement `Collect the Sweets`, `Find the Kazakh Word`, and `Counting with Bota`.
- Award coins and badges after educational actions only.
- Prevent repeated coin farming for the same completed game.
- Show result screens with score, skill trained, coins earned, badge, and next actions.

### Phase 4: Rewards and Parent Mode

- Build a rewards shop with digital badge, conceptual Bota coupon, family bonus, and QR-only reward.
- Add coupon code, discount value, `Show to Parent`, and POS disclaimer.
- Add Parent Mode PIN `1234` and dashboard with profile, progress, rewards, screen time, and accessibility entry point.

### Phase 5: Qolaily Mode and QR

- Add adaptive Qolaily settings: large buttons, high contrast, text hints, voice instructions, reduced animations, no timer, and gesture answer mode.
- Ensure settings visibly change the main UI.
- Add mock QR scan that unlocks the secret location, awards `+15` coins once, and unlocks the QR reward.
- Implement Gesture Answer Mode as a stable mock with normal buttons always available.

### Phase 6: Validation

- Verify the full demo path in under 3 minutes.
- Confirm app works on smartphone-width viewports.
- Run typecheck/build before handoff.

## What We Are Building

We are building **Bota Quest**: a mobile-first educational adventure where a child unlocks learning quests from a Bota product package, plays math, memory, and Kazakh language mini-games, earns Bota Coins, sees mock rewards/coupons, and lets a parent review progress and enable inclusive Qolaily accessibility settings.

The core business story is: **Bota packaging becomes an entry point into learning, rewards, and repeat purchase engagement.**
