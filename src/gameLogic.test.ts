import { describe, expect, it } from "vitest";
import {
  CORE_LOCATION_IDS,
  DAILY_CHEST_REWARD,
  applyDailyChest,
  applyGameAward,
  applyQrUnlock,
  makeMathQuestions,
  makeProfile,
} from "./gameLogic";

describe("game reward rules", () => {
  it("awards completion and bonus coins once per game", () => {
    const first = applyGameAward(makeProfile("Amina", 8, "kz"), "memory", "Memory Master", 20, 10);
    const second = applyGameAward(first.profile, "memory", "Memory Master", 20, 10);

    expect(first.coinsEarned).toBe(30);
    expect(first.profile.coins).toBe(30);
    expect(first.profile.completedGames).toEqual(["memory"]);
    expect(first.profile.badges).toEqual(["Memory Master"]);
    expect(second.coinsEarned).toBe(0);
    expect(second.profile.coins).toBe(30);
  });

  it("unlocks QR location and awards QR coins once", () => {
    const first = applyQrUnlock(makeProfile("Amina", 8, "kz"));
    const second = applyQrUnlock(first);

    expect(first.coins).toBe(15);
    expect(first.unlockedLocations).toContain("secret");
    expect(second.coins).toBe(15);
  });

  it("opens daily chest once per day", () => {
    const today = "2026-05-16";
    const first = applyDailyChest(makeProfile("Amina", 8, "kz"), today);
    const second = applyDailyChest(first.profile, today);

    expect(first.coinsEarned).toBe(DAILY_CHEST_REWARD.coins);
    expect(first.profile.coins).toBe(DAILY_CHEST_REWARD.coins);
    expect(first.profile.openedDailyChestDates).toContain(today);
    expect(second.coinsEarned).toBe(0);
    expect(second.profile.coins).toBe(DAILY_CHEST_REWARD.coins);
  });

  it("uses age-based math difficulty", () => {
    expect(makeMathQuestions(7)[0].answer).toBe(5);
    expect(makeMathQuestions(9)[0].answer).toBe(9);
    expect(makeMathQuestions(11)[0].answer).toBe(12);
  });

  it("starts with five playable learning locations", () => {
    expect(makeProfile("Amina", 8, "kz").unlockedLocations).toEqual(CORE_LOCATION_IDS);
  });
});
