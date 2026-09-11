// frontend/src/services/storageService.ts
import {
  defaultPatient,
  defaultCaregiver,
  defaultUsers,
  defaultSettings,
  defaultFamily,
  defaultAlerts,
  defaultProgress,
  createDefaultRoutines,
  createDefaultMedications,
  getTodayISOString,
} from "../data/demoData";

export const STORAGE_KEYS = {
  PATIENT: "recallx_patient",
  CAREGIVER: "recallx_caregiver",
  USER: "recallx_user",
  ROUTINES: "recallx_routines",
  MEDICATIONS: "recallx_medications",
  FAMILY: "recallx_family",
  MEMORIES: "recallx_memories",
  SETTINGS: "recallx_settings",
  GAMES: "recallx_games",
  ALERTS: "recallx_alerts",
  PROGRESS: "recallx_progress",
  LANGUAGE: "recallx_language",
  SESSION: "recallx_session",
  TOKEN: "recallx-token",
  LEGACY_USER: "recallx-user",
} as const;

export const storageService = {
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[storageService] Failed to parse item for key "${key}", using default.`, err);
      return defaultValue;
    }
  },

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[storageService] Failed to write item for key "${key}".`, err);
    }
  },

  updateItem<T>(key: string, updater: (val: T) => T, defaultValue: T): T {
    const current = this.getItem<T>(key, defaultValue);
    const updated = updater(current);
    this.setItem(key, updated);
    return updated;
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`[storageService] Failed to remove item for key "${key}".`, err);
    }
  },

  initializeStorage(forceReset = false): void {
    const existing = localStorage.getItem(STORAGE_KEYS.PATIENT);
    if (!existing || forceReset) {
      this.resetDemoData();
    } else {
      // Ensure daily occurrences exist for today
      const today = getTodayISOString();
      const routines = this.getItem(STORAGE_KEYS.ROUTINES, createDefaultRoutines(today));
      // If routines are from a different day, refresh dates
      const updatedRoutines = routines.map((r: any) => ({
        ...r,
        date: today,
      }));
      this.setItem(STORAGE_KEYS.ROUTINES, updatedRoutines);
    }
  },

  resetDemoData(): void {
    const today = getTodayISOString();
    this.setItem(STORAGE_KEYS.PATIENT, defaultPatient);
    this.setItem(STORAGE_KEYS.CAREGIVER, defaultCaregiver);
    this.setItem(STORAGE_KEYS.ROUTINES, createDefaultRoutines(today));
    this.setItem(STORAGE_KEYS.MEDICATIONS, createDefaultMedications(today));
    this.setItem(STORAGE_KEYS.FAMILY, defaultFamily);
    this.setItem(STORAGE_KEYS.SETTINGS, defaultSettings);
    this.setItem(STORAGE_KEYS.ALERTS, defaultAlerts);
    this.setItem(STORAGE_KEYS.PROGRESS, defaultProgress);
    this.setItem(STORAGE_KEYS.GAMES, []);
    this.setItem(STORAGE_KEYS.LANGUAGE, defaultSettings.language);
  },

  // Helpers for user session
  getCurrentUser() {
    const session = this.getItem<any>(STORAGE_KEYS.SESSION, null);
    if (!session || !session.isAuthenticated) {
      return null;
    }
    const user = this.getItem<any>(STORAGE_KEYS.USER, null);
    if (user) return user;
    return session.role === "caregiver" ? defaultUsers.caregiver : defaultUsers.patient;
  },

  setCurrentUser(user: any) {
    this.setItem(STORAGE_KEYS.USER, user);
    this.setItem(STORAGE_KEYS.LEGACY_USER, user);
    this.setItem(STORAGE_KEYS.TOKEN, "demo-frontend-token");
    this.setItem(STORAGE_KEYS.SESSION, {
      isAuthenticated: true,
      role: user.role,
      userId: user.id,
    });
  },

  clearSession() {
    this.removeItem(STORAGE_KEYS.USER);
    this.removeItem(STORAGE_KEYS.LEGACY_USER);
    this.removeItem(STORAGE_KEYS.TOKEN);
    this.removeItem(STORAGE_KEYS.SESSION);
  },
};

// Initialize once when module loads
storageService.initializeStorage();
