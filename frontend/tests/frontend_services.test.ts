// frontend/tests/frontend_services.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { storageService, STORAGE_KEYS } from "../src/services/storageService";
import { patientService } from "../src/services/patientService";
import { settingsService } from "../src/services/settingsService";
import { authService } from "../src/services/authService";
import { request } from "../src/services/api";
import "../src/locales";

describe("Frontend-Only Architecture Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.initializeStorage(true);
  });

  it("initializes demo data safely in localStorage", () => {
    const patient = storageService.getItem(STORAGE_KEYS.PATIENT, null);
    expect(patient).not.toBeNull();
    expect((patient as any).name).toBe("Asha Ji");

    const routines = storageService.getItem<any[]>(STORAGE_KEYS.ROUTINES, []);
    expect(routines.length).toBeGreaterThanOrEqual(6);

    const meds = storageService.getItem<any[]>(STORAGE_KEYS.MEDICATIONS, []);
    expect(meds.length).toBeGreaterThanOrEqual(2);

    const family = storageService.getItem<any[]>(STORAGE_KEYS.FAMILY, []);
    expect(family.length).toBeGreaterThanOrEqual(7);
  });

  it("handles corrupted localStorage gracefully with safe fallback", () => {
    localStorage.setItem(STORAGE_KEYS.PATIENT, "invalid-json-{{{");
    const fallback = { id: 99, name: "Fallback Person" };
    const patient = storageService.getItem(STORAGE_KEYS.PATIENT, fallback);
    expect(patient).toEqual(fallback);
  });

  it("provides complete patient snapshot with zero network requests", async () => {
    const snapshot = await patientService.getPatientSnapshot(1);
    expect(snapshot.patient.id).toBe(1);
    expect(snapshot.patient.name).toBe("Asha Ji");
    expect(snapshot.routines.length).toBeGreaterThan(0);
    expect(snapshot.medications.length).toBeGreaterThan(0);
    expect(snapshot.family.length).toBeGreaterThan(0);
    expect(snapshot.progress.memory_score).toBeDefined();
    expect(snapshot.alerts).toBeDefined();
    expect(snapshot.demo_mode).toBe(true);
  });

  it("performs full CRUD on routine tasks locally", async () => {
    // Add
    const created = await patientService.addRoutine({
      title: "Evening Meditation",
      category: "Personal Care",
      scheduled_time: "19:00",
      description: "Gentle breathing exercises",
    });
    expect(created.title).toBe("Evening Meditation");

    // Complete status
    const completed = await patientService.updateRoutineStatus(created.id, "completed");
    expect(completed?.status).toBe("completed");

    // Update title
    const updated = await patientService.updateRoutine(created.id, {
      title: "Mindful Meditation",
    });
    expect(updated?.title).toBe("Mindful Meditation");

    // Delete
    await patientService.deleteRoutine(created.id);
    const snapshot = await patientService.getPatientSnapshot(1);
    expect(snapshot.routines.find((r) => r.id === created.id)).toBeUndefined();
  });

  it("performs full CRUD on medication reminders locally", async () => {
    // Add
    const created = await patientService.addMedication({
      medicine_name: "Vitamin B12",
      dosage: "1 capsule",
      scheduled_time: "12:00",
      instructions: "Take with lunch",
    });
    expect(created.medicine_name).toBe("Vitamin B12");

    // Taken status
    const taken = await patientService.updateMedicationStatus(created.id, "taken");
    expect(taken?.status).toBe("taken");

    // Delete
    await patientService.deleteMedication(created.id);
    const snapshot = await patientService.getPatientSnapshot(1);
    expect(snapshot.medications.find((m) => m.id === created.id)).toBeUndefined();
  });

  it("performs full CRUD on family members and stores photo data URLs locally", async () => {
    // Add
    const member = await patientService.addFamilyMember({
      name: "Rohit Sharma",
      relation: "Nephew",
      memory_note: "Rohit loves playing chess with you.",
      important_facts: "Lives in Mumbai",
    });
    expect(member.name).toBe("Rohit Sharma");

    // Photo upload simulation (base64 data URL)
    const mockDataUrl = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=";
    const withPhoto = await patientService.uploadFamilyPhoto(member.id, mockDataUrl);
    expect(withPhoto?.photo).toBe(mockDataUrl);

    // Delete
    await patientService.deleteFamilyMember(member.id);
    const snapshot = await patientService.getPatientSnapshot(1);
    expect(snapshot.family.find((f) => f.id === member.id)).toBeUndefined();
  });

  it("saves cognitive game sessions and updates memory scores locally", async () => {
    await patientService.saveGameSession({
      game_type: "memory",
      difficulty: "easy",
      score: 95,
      accuracy: 95,
      response_time: 42,
      mistakes: 1,
      moves: 8,
    });
    const snapshot = await patientService.getPatientSnapshot(1);
    expect(snapshot.progress.memory_score).toBeGreaterThan(80);
  });

  it("manages caregiver alerts and demo reminders locally", async () => {
    const res = await patientService.triggerDemoReminder(1);
    expect(res.ok).toBe(true);
    expect(res.alert.type).toBe("routine_reminder");

    const snapshot = await patientService.getPatientSnapshot(1);
    const alert = snapshot.alerts.find((a: any) => a.id === res.alert.id);
    expect(alert).toBeDefined();

    await patientService.markAlertRead(res.alert.id);
    const snapshot2 = await patientService.getPatientSnapshot(1);
    const updatedAlert = snapshot2.alerts.find((a: any) => a.id === res.alert.id);
    expect(updatedAlert?.read).toBe(true);
  });

  it("updates and persists settings and language across changes", async () => {
    const updated = await settingsService.updateSettings({
      language: "hi",
      text_size: "large",
      reduced_motion: true,
    });
    expect(updated.language).toBe("hi");
    expect(updated.text_size).toBe("large");
    expect(updated.reduced_motion).toBe(true);

    const reloaded = await settingsService.getSettings();
    expect(reloaded.language).toBe("hi");
    expect(document.documentElement.lang).toBe("hi");
  });

  it("supports demo authentication for patient and caregiver without server", async () => {
    const patientSession = await authService.demo("patient");
    expect(patientSession.user.role).toBe("patient");
    expect(patientSession.user.name).toBe("Asha Ji");

    const caregiverSession = await authService.demo("caregiver");
    expect(caregiverSession.user.role).toBe("caregiver");
    expect(caregiverSession.user.name).toBe("Rahul");

    await authService.logout();
    expect(storageService.getItem(STORAGE_KEYS.TOKEN, null)).toBeNull();
  });

  it("routes request() helper locally without network requests", async () => {
    const snap = await request("/patients/1/snapshot");
    expect(snap.patient.name).toBe("Asha Ji");

    const settings = await request("/settings");
    expect(settings.language).toBeDefined();

    const authDemo = await request("/auth/demo/caregiver", "POST");
    expect(authDemo.user.role).toBe("caregiver");
  });
});
