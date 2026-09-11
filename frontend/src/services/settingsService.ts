// frontend/src/services/settingsService.ts
import { storageService, STORAGE_KEYS } from "./storageService";
import { defaultSettings } from "../data/demoData";
import i18n, { applyLanguageDirection } from "../locales";

export interface SettingsState {
  language: string;
  text_size: string;
  voice: boolean;
  notifications: boolean;
  reduced_motion: boolean;
}

export const settingsService = {
  async getSettings(): Promise<SettingsState> {
    const current = storageService.getItem<SettingsState>(
      STORAGE_KEYS.SETTINGS,
      defaultSettings,
    );
    return current;
  },

  async updateSettings(next: Partial<SettingsState>): Promise<SettingsState> {
    const current = storageService.getItem<SettingsState>(
      STORAGE_KEYS.SETTINGS,
      defaultSettings,
    );
    const updated: SettingsState = { ...current, ...next };
    storageService.setItem(STORAGE_KEYS.SETTINGS, updated);

    if (updated.language) {
      i18n.changeLanguage(updated.language);
      applyLanguageDirection(updated.language);
      storageService.setItem(STORAGE_KEYS.LANGUAGE, updated.language);
      document.documentElement.lang = updated.language;
    }

    if (updated.text_size) {
      document.documentElement.dataset.text = updated.text_size;
    }

    document.documentElement.dataset.motion = updated.reduced_motion
      ? "reduced"
      : "normal";

    return updated;
  },
};
