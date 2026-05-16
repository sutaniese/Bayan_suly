import { describe, expect, it } from "vitest";
import {
  CORE_LOCATION_IDS,
  DAILY_CHEST_REWARD,
  QR_ITEMS,
  applyDailyChest,
  applyGameAward,
  applyQrItemScan,
  applyQrUnlock,
  makeMathQuestions,
  makeProfile,
  mergeSkillProgress,
  skillPracticeSummaryForGame,
} from "./gameLogic";

describe("game reward rules", () => {
  it("awards completion and bonus coins once per game", () => {
    const first = applyGameAward(makeProfile("Amina", 8, "kz"), "memory", "Memory Master", 20, 10, "sticker-almaty-mountains");
    const second = applyGameAward(first.profile, "memory", "Memory Master", 20, 10);

    expect(first.coinsEarned).toBe(30);
    expect(first.profile.coins).toBe(30);
    expect(first.profile.completedGames).toEqual(["memory"]);
    expect(first.profile.badges).toEqual(["Memory Master"]);
    expect(first.profile.unlockedStickers).toContain("sticker-almaty-mountains");
    expect(first.profile.skillProgress.memory).toBe(20);
    const day = new Date().toISOString().slice(0, 10);
    const session = first.profile.sessionHistory.find((s) => s.date === day);
    expect(session?.gamesCompleted).toContain("memory");
    expect(session?.coinsEarned).toBe(30);
    expect(session?.skillsTrained).toContain("memory");
    expect(session?.stickersEarned).toContain("sticker-almaty-mountains");
    expect(second.coinsEarned).toBe(0);
    expect(second.profile.coins).toBe(30);
    expect(second.profile.skillProgress.memory).toBe(20);
  });

  it("unlocks QR location and awards QR coins once", () => {
    const first = applyQrUnlock(makeProfile("Amina", 8, "kz"));
    const second = applyQrUnlock(first);

    expect(first.coins).toBe(15);
    expect(first.unlockedLocations).toContain("secret");
    expect(first.skillProgress.culture).toBe(5);
    const day = new Date().toISOString().slice(0, 10);
    expect(first.sessionHistory.find((s) => s.date === day)?.qrItemsScanned).toContain("package-qr");
    expect(second.coins).toBe(15);
    expect(second.skillProgress.culture).toBe(5);
  });

  it("opens daily chest once per day", () => {
    const today = "2026-05-16";
    const first = applyDailyChest(makeProfile("Amina", 8, "kz"), today);
    const second = applyDailyChest(first.profile, today);

    expect(first.coinsEarned).toBe(DAILY_CHEST_REWARD.coins);
    expect(first.profile.coins).toBe(DAILY_CHEST_REWARD.coins);
    expect(first.profile.openedDailyChestDates).toContain(today);
    expect(first.profile.skillProgress.culture).toBe(5);
    const session = first.profile.sessionHistory.find((s) => s.date === today);
    expect(session?.gamesCompleted).toContain("daily-chest");
    expect(session?.coinsEarned).toBe(DAILY_CHEST_REWARD.coins);
    expect(session?.skillsTrained).toContain("culture");
    expect(second.coinsEarned).toBe(0);
    expect(second.profile.coins).toBe(DAILY_CHEST_REWARD.coins);
  });

  it("scans each QR item only once", () => {
    const item = QR_ITEMS[0];
    const first = applyQrItemScan(makeProfile("Amina", 8, "kz"), item);
    const second = applyQrItemScan(first.profile, item);

    expect(first.coinsEarned).toBe(item.rewardCoins);
    expect(first.profile.scannedQrItems).toContain(item.id);
    expect(first.profile.unlockedStickers).toContain(item.rewardStickerId);
    expect(first.profile.skillProgress.culture).toBe(5);
    const day = new Date().toISOString().slice(0, 10);
    expect(first.profile.sessionHistory.find((s) => s.date === day)?.qrItemsScanned).toContain(item.id);
    expect(second.coinsEarned).toBe(0);
  });

  it("unlocks skill garden sticker when total skill points reach 100", () => {
    const p = mergeSkillProgress(makeProfile("Amina", 8, "kz"), { memory: 100 });
    expect(p.unlockedStickers).toContain("sticker-skill-garden");
  });

  it("merges multiple first-time games into the same calendar session", () => {
    const day = new Date().toISOString().slice(0, 10);
    let p = makeProfile("Amina", 8, "kz");
    p = applyGameAward(p, "memory", undefined, 20, 0).profile;
    p = applyGameAward(p, "math", undefined, 20, 0).profile;
    const session = p.sessionHistory.find((s) => s.date === day);
    expect(session?.gamesCompleted).toEqual(expect.arrayContaining(["memory", "math"]));
    expect(session?.coinsEarned).toBe(40);
  });

  it("describes skill practice per game for summaries", () => {
    expect(skillPracticeSummaryForGame("words")).toContain("Kazakh");
    expect(skillPracticeSummaryForGame("math")).toContain("math");
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
