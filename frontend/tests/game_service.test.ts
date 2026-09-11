// frontend/tests/game_service.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { gameService, GAME_PROGRESS_KEY } from "../src/services/gameService";
import { storageService, STORAGE_KEYS } from "../src/services/storageService";
import { GAME_CATALOG, GAME_OBJECTS } from "../src/data/gameData";

describe("RecallX Cognitive Game Service & Data Catalog", () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.initializeStorage(true);
    gameService.resetGameProgress();
  });

  it("provides complete game catalog with metadata and aliases", () => {
    const catalog = gameService.getAllGames();
    expect(catalog).toHaveLength(4);

    const memoryGame = gameService.getGame("memory");
    expect(memoryGame).toBeDefined();
    expect(memoryGame?.title).toBe("Memory Match");

    // Test aliases
    expect(gameService.getGame("matching")?.id).toBe("memory");
    expect(gameService.getGame("quiz")?.id).toBe("object");
    expect(gameService.getGame("pattern")?.id).toBe("sequence");
    expect(gameService.getGame("tap")?.id).toBe("sequence");
    expect(gameService.getGame("faces")?.id).toBe("family");
  });

  it("normalizes game aliases properly", () => {
    expect(gameService.normalizeType("matching")).toBe("memory");
    expect(gameService.normalizeType("quiz")).toBe("object");
    expect(gameService.normalizeType("pattern")).toBe("sequence");
    expect(gameService.normalizeType("tap")).toBe("sequence");
    expect(gameService.normalizeType("memory")).toBe("memory");
    expect(gameService.normalizeType("unknown")).toBe("unknown");
  });

  it("contains rich multi-language translation objects for all game items", () => {
    expect(GAME_OBJECTS.length).toBeGreaterThanOrEqual(8);
    for (const item of GAME_OBJECTS) {
      expect(item.icon).toBeTruthy();
      expect(item.en).toBeTruthy();
      expect(item.hi).toBeTruthy();
      expect(item.mr).toBeTruthy();
    }
  });

  it("generates balanced, paired memory decks for all difficulties", () => {
    const easyDeck = gameService.getMemoryCards("easy");
    expect(easyDeck).toHaveLength(6); // 3 pairs

    const mediumDeck = gameService.getMemoryCards("medium");
    expect(mediumDeck).toHaveLength(12); // 6 pairs

    const hardDeck = gameService.getMemoryCards("hard");
    expect(hardDeck).toHaveLength(16); // 8 pairs

    // Every item in the deck must appear exactly twice
    const counts = new Map<number, number>();
    for (const card of easyDeck) {
      counts.set(card, (counts.get(card) || 0) + 1);
    }
    expect(counts.size).toBe(3);
    for (const count of counts.values()) {
      expect(count).toBe(2);
    }
  });

  it("records game sessions and updates high scores in localStorage", async () => {
    const session = {
      event_id: "test-event-123",
      game_type: "memory",
      difficulty: "easy",
      accuracy: 100,
      response_time: 25,
      mistakes: 1,
      hints_used: 0,
      moves: 7,
      started_at: new Date().toISOString(),
    };

    const saved = await gameService.saveScore(session);
    expect(saved.id).toBeDefined();
    expect(saved.game_type).toBe("memory");

    // Verify localStorage key recallx_game_progress
    const progress = gameService.getGameProgress();
    expect(progress.highScores.memory).toBe(100);
    expect(progress.latestAccuracy.memory).toBe(100);
    expect(progress.totalCompleted).toBeGreaterThanOrEqual(1);

    // Verify session history in recallx_games
    const history = storageService.getItem<any[]>(STORAGE_KEYS.GAMES, []);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history.some((s) => s.event_id === "test-event-123")).toBe(true);

    // Verify overall patient memory score updated in recallx_progress
    const patientProgress = storageService.getItem<any>(STORAGE_KEYS.PROGRESS, {});
    expect(patientProgress.memory_score).toBeDefined();
  });

  it("normalizes aliased game type before saving score", async () => {
    const session = {
      event_id: "test-matching-alias",
      game_type: "matching",
      difficulty: "medium",
      accuracy: 90,
      response_time: 40,
      mistakes: 2,
      hints_used: 1,
      moves: 12,
      started_at: new Date().toISOString(),
    };

    await gameService.saveScore(session);
    const progress = gameService.getGameProgress();
    expect(progress.latestAccuracy.memory).toBe(90);
  });

  it("handles corrupted game progress in localStorage safely", () => {
    localStorage.setItem(GAME_PROGRESS_KEY, "invalid-json-content{{{");
    const progress = gameService.getGameProgress();
    expect(progress).toBeDefined();
    expect(progress.highScores).toBeDefined();
    expect(progress.highScores.memory).toBeDefined();
  });
});
