// frontend/src/services/authService.ts
import { storageService, STORAGE_KEYS } from "./storageService";
import { defaultUsers } from "../data/demoData";

export interface AuthSession {
  isAuthenticated: boolean;
  role: "patient" | "caregiver";
  userId: number;
}

export const authService = {
  /**
   * Validate credentials entirely in JavaScript without backend API calls.
   *
   * Demo Credentials:
   * PATIENT:
   *   Email / ID: patient@recallx.demo (or "patient", "asha@recallx.demo", "asha")
   *   Password: patient123
   *
   * CAREGIVER:
   *   Email / ID: caregiver@recallx.demo (or "caregiver", "rahul@recallx.demo", "rahul")
   *   Password: caregiver123
   */
  async login(
    identifier: string,
    password = "",
  ): Promise<{ token: string; user: any; session: AuthSession }> {
    const cleanId = (identifier || "").toLowerCase().trim();
    const cleanPass = (password || "").trim();

    const isPatientMatch =
      cleanId === "patient@recallx.demo" ||
      cleanId === "patient" ||
      cleanId === "asha@recallx.demo" ||
      cleanId === "asha";

    const isCaregiverMatch =
      cleanId === "caregiver@recallx.demo" ||
      cleanId === "caregiver" ||
      cleanId === "rahul@recallx.demo" ||
      cleanId === "rahul";

    if (isPatientMatch) {
      if (cleanPass && cleanPass !== "patient123") {
        throw new Error("Invalid password for Patient demo account. Use: patient123");
      }
      return this.demo("patient");
    }

    if (isCaregiverMatch) {
      if (cleanPass && cleanPass !== "caregiver123") {
        throw new Error("Invalid password for Caregiver demo account. Use: caregiver123");
      }
      return this.demo("caregiver");
    }

    // Heuristic fallback matching
    if (cleanId.includes("caregiver") || cleanId.includes("rahul")) {
      if (cleanPass && cleanPass !== "caregiver123") {
        throw new Error("Invalid password for Caregiver demo account. Use: caregiver123");
      }
      return this.demo("caregiver");
    }

    if (cleanId.includes("patient") || cleanId.includes("asha")) {
      if (cleanPass && cleanPass !== "patient123") {
        throw new Error("Invalid password for Patient demo account. Use: patient123");
      }
      return this.demo("patient");
    }

    throw new Error(
      "Unrecognized demo credentials. Use patient@recallx.demo (pass: patient123) or caregiver@recallx.demo (pass: caregiver123), or click the demo buttons above.",
    );
  },

  /**
   * One-click demo login bypassing password entry.
   */
  async demo(
    role: "patient" | "caregiver" | string,
  ): Promise<{ token: string; user: any; session: AuthSession }> {
    const isCaregiver = role === "caregiver";
    const user = isCaregiver ? defaultUsers.caregiver : defaultUsers.patient;

    const session: AuthSession = {
      isAuthenticated: true,
      role: isCaregiver ? "caregiver" : "patient",
      userId: user.id,
    };

    // Save session in localStorage under recallx_session
    storageService.setItem(STORAGE_KEYS.SESSION, session);
    storageService.setCurrentUser(user);

    return {
      token: "demo-frontend-jwt-token",
      user,
      session,
    };
  },

  /**
   * Removes session keys without clearing user demo data (routines, memories, meds, etc.).
   */
  async logout(): Promise<{ ok: true }> {
    storageService.clearSession();
    return { ok: true };
  },

  /**
   * Retrieves active session from localStorage with safe parsing.
   */
  getSession(): AuthSession | null {
    const session = storageService.getItem<any>(STORAGE_KEYS.SESSION, null);
    if (
      session &&
      typeof session === "object" &&
      session.isAuthenticated === true &&
      (session.role === "patient" || session.role === "caregiver")
    ) {
      return session as AuthSession;
    }
    return null;
  },

  /**
   * Checks if there is a currently authenticated session.
   */
  isAuthenticated(): boolean {
    const session = this.getSession();
    return !!session?.isAuthenticated;
  },

  /**
   * Returns active session role ("patient" | "caregiver" | null).
   */
  getCurrentRole(): "patient" | "caregiver" | null {
    const session = this.getSession();
    return session ? session.role : null;
  },

  /**
   * Returns current user object if authenticated, or null.
   */
  getCurrentUser() {
    if (!this.isAuthenticated()) {
      return null;
    }
    const user = storageService.getItem<any>(STORAGE_KEYS.USER, null);
    if (user) return user;
    const role = this.getCurrentRole();
    return role === "caregiver" ? defaultUsers.caregiver : defaultUsers.patient;
  },
};
