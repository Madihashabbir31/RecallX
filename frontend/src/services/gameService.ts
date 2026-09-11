// frontend/src/services/gameService.ts
import { storageService, STORAGE_KEYS } from "./storageService";
import { defaultProgress } from "../data/demoData";
import { GAME_CATALOG, GAME_OBJECTS, GameItem } from "../data/gameData";

export const GAME_PROGRESS_KEY = "recallx_game_progress";

export interface GameSessionRecord {
  id?: number;
  event_id: string;
  game_type: string;
  difficulty: string;
  accuracy: number;
  response_time: number;
  mistakes: number;
  hints_used: number;
  moves: number;
  started_at: string;
  completed_at?: string;
  attempts?: any[];
  queued?: boolean;
}

export interface GameProgressState {
  totalCompleted: number;
  lastPlayed: string | null;
  highScores: Record<string, number>;
  latestAccuracy: Record<string, number>;
}

const defaultGameProgress: GameProgressState = {
  totalCompleted: 6,
  lastPlayed: new Date().toISOString(),
  highScores: {
    memory: 95,
    object: 100,
    sequence: 90,
    family: 100,
  },
  latestAccuracy: {
    memory: 85,
    object: 90,
    sequence: 80,
    family: 95,
  },
};

export const gameService = {
  /**
   * Resolves a game definition by primary id or alias (e.g. "matching" -> "memory", "quiz" -> "object").
   */
  getGame(type: string): GameItem | undefined {
    const lower = (type || "").toLowerCase().trim();
    return GAME_CATALOG.find(
      (g) => g.id === lower || g.aliases.includes(lower),
    );
  },

  /**
   * Returns all active games for display on the Games Hub.
   */
  getAllGames(): GameItem[] {
    return GAME_CATALOG;
  },

  /**
   * Normalizes game type aliases.
   */
  normalizeType(type: string): string {
    const found = this.getGame(type);
    return found ? found.id : type;
  },

  /**
   * Retrieves player game progress from localStorage.
   */
  getGameProgress(): GameProgressState {
    return storageService.getItem<GameProgressState>(
      GAME_PROGRESS_KEY,
      defaultGameProgress,
    );
  },

  /**
   * Saves a completed game session into local storage and updates player progress.
   */
  async saveScore(session: GameSessionRecord): Promise<GameSessionRecord> {
    const normalizedType = this.normalizeType(session.game_type);
    const sessionWithMeta: GameSessionRecord = {
      ...session,
      id: session.id || Date.now(),
      game_type: normalizedType,
      completed_at: session.completed_at || new Date().toISOString(),
    };

    // 1. Append to sessions history (recallx_games)
    const sessions = storageService.getItem<GameSessionRecord[]>(
      STORAGE_KEYS.GAMES,
      [],
    );
    sessions.push(sessionWithMeta);
    storageService.setItem(STORAGE_KEYS.GAMES, sessions);

    // 2. Update summary progress (recallx_game_progress)
    const progress = this.getGameProgress();
    const currentHigh = progress.highScores[normalizedType] || 0;
    const accuracy = Math.round(session.accuracy || 0);

    const updatedProgress: GameProgressState = {
      totalCompleted: (progress.totalCompleted || 0) + 1,
      lastPlayed: sessionWithMeta.completed_at || new Date().toISOString(),
      highScores: {
        ...progress.highScores,
        [normalizedType]: Math.max(currentHigh, accuracy),
      },
      latestAccuracy: {
        ...progress.latestAccuracy,
        [normalizedType]: accuracy,
      },
    };
    storageService.setItem(GAME_PROGRESS_KEY, updatedProgress);

    // 3. Update overall patient memory score in recallx_progress
    const overallProgress = storageService.getItem<any>(
      STORAGE_KEYS.PROGRESS,
      defaultProgress,
    );
    const recentScores = sessions.slice(-5).map((s) => s.accuracy || 80);
    const avgScore = Math.round(
      recentScores.reduce((a, b) => a + b, 0) / recentScores.length,
    );
    overallProgress.memory_score = avgScore;
    overallProgress.total_sessions = (overallProgress.total_sessions || sessions.length - 1) + 1;

    // Prepend to recent list
    const recent = Array.isArray(overallProgress.recent)
      ? overallProgress.recent
      : (defaultProgress.recent || []);
    overallProgress.recent = [
      {
        id: sessionWithMeta.id,
        game_type: sessionWithMeta.game_type,
        difficulty: sessionWithMeta.difficulty,
        accuracy: Math.round(sessionWithMeta.accuracy),
        response_time: Math.round((sessionWithMeta.response_time || 3.0) * 10) / 10,
        completed_at: sessionWithMeta.completed_at,
      },
      ...recent.filter((s: any) => s.id !== sessionWithMeta.id),
    ].slice(0, 20);

    storageService.setItem(STORAGE_KEYS.PROGRESS, overallProgress);

    return sessionWithMeta;
  },

  /**
   * Resets game progress to default state.
   */
  resetGameProgress(): void {
    storageService.setItem(GAME_PROGRESS_KEY, defaultGameProgress);
  },

  /**
   * Generates a shuffled deck of memory card indices for the matching game.
   */
  getMemoryCards(difficulty: "easy" | "medium" | "hard" = "easy"): number[] {
    const pairs = difficulty === "easy" ? 3 : difficulty === "medium" ? 6 : 8;
    const totalAvailable = GAME_OBJECTS.length;
    // pick `pairs` unique object indices
    const indices = Array.from({ length: totalAvailable }, (_, i) => i);
    const shuffledIndices = this.shuffle(indices).slice(0, pairs);
    // duplicate each to create pairs and shuffle
    return this.shuffle([...shuffledIndices, ...shuffledIndices]);
  },

  /**
   * Utility to shuffle an array immutably.
   */
  shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },
};
