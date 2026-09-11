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
    const progress = storageService.getItem(
      STORAGE_KEYS.PROGRESS,
      defaultProgress,
    );
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
    games.push({
      ...session,
      id: Date.now(),
      completed_at: new Date().toISOString(),
    });
    storageService.setItem(STORAGE_KEYS.GAMES, games);

    // Update progress score
    const progress = storageService.getItem<any>(STORAGE_KEYS.PROGRESS, defaultProgress);
    const recentScores = games.slice(-5).map((g) => g.accuracy || g.score || 80);
    const avgScore = Math.round(
      recentScores.reduce((a, b) => a + b, 0) / recentScores.length,
    );
    progress.memory_score = avgScore;
    storageService.setItem(STORAGE_KEYS.PROGRESS, progress);
    return session;
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
