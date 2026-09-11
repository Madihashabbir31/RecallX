// frontend/src/services/authService.ts
import { storageService } from "./storageService";
import { defaultUsers } from "../data/demoData";

export const authService = {
  async login(email: string, _password?: string) {
    const clean = email.toLowerCase().trim();
    const isCaregiver = clean.includes("caregiver") || clean.includes("rahul");
    const user = isCaregiver ? defaultUsers.caregiver : defaultUsers.patient;
    storageService.setCurrentUser(user);
    return {
      token: "demo-frontend-jwt-token",
      user,
    };
  },

  async demo(role: "patient" | "caregiver" | string) {
    const isCaregiver = role === "caregiver";
    const user = isCaregiver ? defaultUsers.caregiver : defaultUsers.patient;
    storageService.setCurrentUser(user);
    return {
      token: "demo-frontend-jwt-token",
      user,
    };
  },

  async logout() {
    storageService.clearSession();
    return { ok: true };
  },

  getCurrentUser() {
    return storageService.getCurrentUser();
  },
};
