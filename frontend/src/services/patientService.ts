// frontend/src/services/patientService.ts
import { storageService, STORAGE_KEYS } from "./storageService";
import {
  defaultPatient,
  createDefaultRoutines,
  createDefaultMedications,
  defaultFamily,
  defaultProgress,
  defaultAlerts,
  getTodayISOString,
} from "../data/demoData";

export interface RoutineTaskItem {
  id: number;
  patient_id: number;
  title: string;
  category: string;
  scheduled_time: string;
  repeat_rule?: string;
  priority?: string;
  description: string;
  status: "completed" | "pending" | "missed" | "not_scheduled";
  completed_at?: string | null;
  active: boolean;
  date: string;
}

export interface MedicationItem {
  id: number;
  log_id?: number;
  patient_id: number;
  medicine_name: string;
  dosage: string;
  instructions: string;
  scheduled_time: string;
  repeat_rule?: string;
  grace_period_minutes?: number;
  status: "taken" | "pending" | "missed" | "snoozed" | "not_scheduled";
  due_at?: string | null;
  deadline?: string | null;
  snoozed_until?: string | null;
  active: boolean;
  date: string;
}

export interface FamilyMemberItem {
  id: number;
  patient_id: number;
  name: string;
  relation: string;
  memory_note: string;
  important_facts: string;
  photo?: string | null;
  phone?: string;
  active: boolean;
}

export const patientService = {
  async getPatientSnapshot(patientId = 1) {
    const today = getTodayISOString();
    const patient = storageService.getItem(STORAGE_KEYS.PATIENT, defaultPatient);
    const routines = storageService.getItem<RoutineTaskItem[]>(
      STORAGE_KEYS.ROUTINES,
      createDefaultRoutines(today),
    );
    const medications = storageService.getItem<MedicationItem[]>(
      STORAGE_KEYS.MEDICATIONS,
      createDefaultMedications(today),
    );
    const family = storageService.getItem<FamilyMemberItem[]>(
      STORAGE_KEYS.FAMILY,
      defaultFamily,
    );
    const rawProgress = storageService.getItem<any>(
      STORAGE_KEYS.PROGRESS,
      defaultProgress,
    );
    const games = storageService.getItem<any[]>(STORAGE_KEYS.GAMES, []);

    // Merge stored game sessions into progress.recent
    const recentSessions = games.length
      ? games.slice().reverse().slice(0, 15).map((g) => ({
          id: g.id || Date.now(),
          game_type: g.game_type || "memory",
          difficulty: g.difficulty || "easy",
          accuracy: Math.round(g.accuracy || 80),
          response_time: typeof g.response_time === "number" ? Math.round(g.response_time * 10) / 10 : 3.0,
          completed_at: g.completed_at || new Date().toISOString(),
        }))
      : (Array.isArray(rawProgress?.recent) && rawProgress.recent.length)
        ? rawProgress.recent
        : defaultProgress.recent;

    // Ensure weekly array has all required properties for both patient & caregiver charts
    const weeklyData = (rawProgress?.weekly || defaultProgress.weekly).map((w: any) => ({
      day: w.day || "Mon",
      date: w.date || today,
      accuracy: typeof w.accuracy === "number" ? w.accuracy : (typeof w.score === "number" ? w.score : 80),
      score: typeof w.score === "number" ? w.score : (typeof w.accuracy === "number" ? w.accuracy : 80),
      routine: typeof w.routine === "number" ? w.routine : (typeof w.routine_done === "number" ? w.routine_done : 5),
      routine_done: typeof w.routine_done === "number" ? w.routine_done : (typeof w.routine === "number" ? w.routine : 5),
      medication: typeof w.medication === "number" ? w.medication : (typeof w.meds_taken === "number" ? w.meds_taken : 2),
      meds_taken: typeof w.meds_taken === "number" ? w.meds_taken : (typeof w.medication === "number" ? w.medication : 2),
      sessions: w.sessions || 2,
      response_time: typeof w.response_time === "number" ? w.response_time : 3.5,
      difficulty: w.difficulty || 1,
    }));

    // Ensure family recall stats exist
    const familyStats = (Array.isArray(rawProgress?.family) && rawProgress.family.length)
      ? rawProgress.family
      : (family.length
          ? family.map((f: any, idx: number) => ({
              id: f.id,
              name: f.name,
              relation: f.relation,
              accuracy: [95, 92, 88, 100][idx % 4],
              attempts: [18, 14, 10, 22][idx % 4],
            }))
          : defaultProgress.family);

    const progress = {
      ...defaultProgress,
      ...rawProgress,
      streak: rawProgress?.streak || defaultProgress.streak,
      total_sessions: Math.max(games.length, rawProgress?.total_sessions || defaultProgress.total_sessions),
      recent: recentSessions,
      weekly: weeklyData,
      family: familyStats,
      recommendations: {
        ...defaultProgress.recommendations,
        ...(rawProgress?.recommendations || {}),
      },
    };

    const alerts = storageService.getItem(
      STORAGE_KEYS.ALERTS,
      defaultAlerts,
    );

    return {
      patient: { id: patientId, name: patient.name },
      date: today,
      routines: routines.filter((r) => r.active !== false),
      medications: medications.filter((m) => m.active !== false),
      family: family.filter((f) => f.active !== false),
      progress,
      alerts,
      demo_mode: true,
    };
  },

  async updateRoutineStatus(rid: number, status: "completed" | "pending" | "snoozed", date?: string) {
    const today = date || getTodayISOString();
    const routines = storageService.getItem<RoutineTaskItem[]>(
      STORAGE_KEYS.ROUTINES,
      createDefaultRoutines(today),
    );
    const updated = routines.map((r) => {
      if (r.id === Number(rid)) {
        return {
          ...r,
          status: status === "completed" ? "completed" : "pending",
          completed_at: status === "completed" ? new Date().toISOString() : null,
          date: today,
        };
      }
      return r;
    });
    storageService.setItem(STORAGE_KEYS.ROUTINES, updated);
    return updated.find((r) => r.id === Number(rid));
  },

  async addRoutine(data: any) {
    const today = getTodayISOString();
    const routines = storageService.getItem<RoutineTaskItem[]>(
      STORAGE_KEYS.ROUTINES,
      createDefaultRoutines(today),
    );
    const newRoutine: RoutineTaskItem = {
      id: Date.now(),
      patient_id: data.patient_id || 1,
      title: data.title,
      category: data.category || "Custom",
      scheduled_time: data.scheduled_time,
      repeat_rule: data.repeat_rule || "daily",
      priority: data.priority || "normal",
      description: data.description || "",
      status: "pending",
      completed_at: null,
      active: true,
      date: today,
    };
    routines.push(newRoutine);
    storageService.setItem(STORAGE_KEYS.ROUTINES, routines);
    return newRoutine;
  },

  async updateRoutine(rid: number, data: any) {
    const today = getTodayISOString();
    const routines = storageService.getItem<RoutineTaskItem[]>(
      STORAGE_KEYS.ROUTINES,
      createDefaultRoutines(today),
    );
    const updated: RoutineTaskItem[] = routines.map((r) =>
      r.id === Number(rid) ? ({ ...r, ...data } as RoutineTaskItem) : r,
    );
    storageService.setItem(STORAGE_KEYS.ROUTINES, updated);
    return updated.find((r) => r.id === Number(rid));
  },

  async deleteRoutine(rid: number) {
    const today = getTodayISOString();
    const routines = storageService.getItem<RoutineTaskItem[]>(
      STORAGE_KEYS.ROUTINES,
      createDefaultRoutines(today),
    );
    const updated = routines.map((r) =>
      r.id === Number(rid) ? { ...r, active: false } : r,
    );
    storageService.setItem(STORAGE_KEYS.ROUTINES, updated);
    return { ok: true };
  },

  async updateMedicationStatus(rid: number, status: "taken" | "pending" | "snoozed", date?: string) {
    const today = date || getTodayISOString();
    const medications = storageService.getItem<MedicationItem[]>(
      STORAGE_KEYS.MEDICATIONS,
      createDefaultMedications(today),
    );
    const updated: MedicationItem[] = medications.map((m) => {
      if (m.id === Number(rid)) {
        return {
          ...m,
          status: status === "taken" ? "taken" : status === "snoozed" ? "snoozed" : "pending",
          snoozed_until: status === "snoozed" ? new Date(Date.now() + 15 * 60000).toISOString() : null,
          date: today,
        };
      }
      return m;
    });
    storageService.setItem(STORAGE_KEYS.MEDICATIONS, updated);
    return updated.find((m) => m.id === Number(rid));
  },

  async addMedication(data: any) {
    const today = getTodayISOString();
    const medications = storageService.getItem<MedicationItem[]>(
      STORAGE_KEYS.MEDICATIONS,
      createDefaultMedications(today),
    );
    const newMed: MedicationItem = {
      id: Date.now(),
      log_id: Date.now() + 100,
      patient_id: data.patient_id || 1,
      medicine_name: data.medicine_name,
      dosage: data.dosage || "1 dose",
      instructions: data.instructions || "",
      scheduled_time: data.scheduled_time,
      repeat_rule: data.repeat_rule || "daily",
      grace_period_minutes: data.grace_period_minutes || 30,
      status: "pending",
      due_at: `${today}T${data.scheduled_time}:00`,
      deadline: `${today}T${data.scheduled_time}:00`,
      snoozed_until: null,
      active: true,
      date: today,
    };
    medications.push(newMed);
    storageService.setItem(STORAGE_KEYS.MEDICATIONS, medications);
    return newMed;
  },

  async updateMedication(rid: number, data: any) {
    const today = getTodayISOString();
    const medications = storageService.getItem<MedicationItem[]>(
      STORAGE_KEYS.MEDICATIONS,
      createDefaultMedications(today),
    );
    const updated: MedicationItem[] = medications.map((m) =>
      m.id === Number(rid) ? ({ ...m, ...data } as MedicationItem) : m,
    );
    storageService.setItem(STORAGE_KEYS.MEDICATIONS, updated);
    return updated.find((m) => m.id === Number(rid));
  },

  async deleteMedication(rid: number) {
    const today = getTodayISOString();
    const medications = storageService.getItem<MedicationItem[]>(
      STORAGE_KEYS.MEDICATIONS,
      createDefaultMedications(today),
    );
    const updated = medications.map((m) =>
      m.id === Number(rid) ? { ...m, active: false } : m,
    );
    storageService.setItem(STORAGE_KEYS.MEDICATIONS, updated);
    return { ok: true };
  },

  async addFamilyMember(data: any) {
    const family = storageService.getItem<FamilyMemberItem[]>(
      STORAGE_KEYS.FAMILY,
      defaultFamily,
    );
    const newMember: FamilyMemberItem = {
      id: Date.now(),
      patient_id: data.patient_id || 1,
      name: data.name,
      relation: data.relation,
      memory_note: data.memory_note || "",
      important_facts: data.important_facts || "",
      photo: data.photo || null,
      phone: data.phone || "",
      active: true,
    };
    family.push(newMember);
    storageService.setItem(STORAGE_KEYS.FAMILY, family);
    return newMember;
  },

  async updateFamilyMember(rid: number, data: any) {
    const family = storageService.getItem<FamilyMemberItem[]>(
      STORAGE_KEYS.FAMILY,
      defaultFamily,
    );
    const updated = family.map((f) =>
      f.id === Number(rid) ? { ...f, ...data } : f,
    );
    storageService.setItem(STORAGE_KEYS.FAMILY, updated);
    return updated.find((f) => f.id === Number(rid));
  },

  async deleteFamilyMember(rid: number) {
    const family = storageService.getItem<FamilyMemberItem[]>(
      STORAGE_KEYS.FAMILY,
      defaultFamily,
    );
    const updated = family.map((f) =>
      f.id === Number(rid) ? { ...f, active: false } : f,
    );
    storageService.setItem(STORAGE_KEYS.FAMILY, updated);
    return { ok: true };
  },

  async uploadFamilyPhoto(rid: number, photoDataUrl: string) {
    const family = storageService.getItem<FamilyMemberItem[]>(
      STORAGE_KEYS.FAMILY,
      defaultFamily,
    );
    const updated = family.map((f) =>
      f.id === Number(rid) ? { ...f, photo: photoDataUrl } : f,
    );
    storageService.setItem(STORAGE_KEYS.FAMILY, updated);
    return updated.find((f) => f.id === Number(rid));
  },

  async saveGameSession(session: any) {
    const games = storageService.getItem<any[]>(STORAGE_KEYS.GAMES, []);
    const newSession = {
      ...session,
      id: session.id || Date.now(),
      completed_at: session.completed_at || new Date().toISOString(),
    };
    games.push(newSession);
    storageService.setItem(STORAGE_KEYS.GAMES, games);

    // Update progress
    const progress = storageService.getItem<any>(STORAGE_KEYS.PROGRESS, defaultProgress);
    const recentScores = games.slice(-5).map((g) => g.accuracy || g.score || 80);
    const avgScore = Math.round(
      recentScores.reduce((a, b) => a + b, 0) / recentScores.length,
    );
    progress.memory_score = avgScore;
    progress.total_sessions = (progress.total_sessions || games.length - 1) + 1;

    // Prepend to recent list
    const recent = Array.isArray(progress.recent) ? progress.recent : (defaultProgress.recent || []);
    progress.recent = [
      {
        id: newSession.id,
        game_type: newSession.game_type,
        difficulty: newSession.difficulty,
        accuracy: Math.round(newSession.accuracy),
        response_time: Math.round((newSession.response_time || 3.0) * 10) / 10,
        completed_at: newSession.completed_at,
      },
      ...recent.filter((s: any) => s.id !== newSession.id),
    ].slice(0, 20);

    // Update family recall if this was a family game
    if (newSession.game_type === "family" && newSession.attempts?.length) {
      const familyList = Array.isArray(progress.family) && progress.family.length
        ? progress.family
        : defaultProgress.family;
      newSession.attempts.forEach((att: any) => {
        const found = familyList.find((f: any) => f.id === att.target);
        if (found) {
          found.attempts = (found.attempts || 0) + 1;
          const currAcc = found.accuracy ?? 80;
          found.accuracy = Math.round((currAcc + (att.correct ? 100 : 0)) / 2);
        }
      });
      progress.family = familyList;
    }

    storageService.setItem(STORAGE_KEYS.PROGRESS, progress);
    return newSession;
  },

  async markAlertRead(alertId: number) {
    const alerts = storageService.getItem<any[]>(STORAGE_KEYS.ALERTS, defaultAlerts);
    const updated = alerts.map((a) =>
      a.id === Number(alertId) ? { ...a, read: true } : a,
    );
    storageService.setItem(STORAGE_KEYS.ALERTS, updated);
    return { ok: true };
  },

  async triggerDemoReminder(patientId = 1) {
    const alerts = storageService.getItem<any[]>(STORAGE_KEYS.ALERTS, defaultAlerts);
    const newAlert = {
      id: Date.now(),
      patient_id: patientId,
      caregiver_id: 2,
      type: "routine_reminder",
      title: "Gentle Reminder Sent",
      message: "Asha Ji was gently reminded about the upcoming routine task.",
      severity: "info",
      source_key: `demo-${Date.now()}`,
      read: false,
      created_at: new Date().toISOString(),
    };
    alerts.unshift(newAlert);
    storageService.setItem(STORAGE_KEYS.ALERTS, alerts);
    return { ok: true, alert: newAlert };
  },
};
