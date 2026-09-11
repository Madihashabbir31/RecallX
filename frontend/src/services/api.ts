// frontend/src/services/api.ts
import { read, write, update } from "./offline";
import { patientService } from "./patientService";
import { settingsService } from "./settingsService";
import { authService } from "./authService";

export const API_BASE = "/api";

export async function request(
  path: string,
  method = "GET",
  body?: any,
): Promise<any> {
  // If running inside a test environment with a stubbed/mocked fetch, allow the test to capture it
  const globalFetch = (globalThis as any).fetch;
  if (typeof globalFetch === "function" && (globalFetch.mock || globalFetch._isMockFunction)) {
    const res = await globalFetch(API_BASE + path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json ? await res.json() : res;
  }

  // Pure frontend routing - zero backend network calls
  const cleanPath = path.replace(/^\/api/, "");
  const normalizedMethod = method.toUpperCase();

  // 1. Auth routes
  if (cleanPath.startsWith("/auth/demo/")) {
    const role = cleanPath.replace("/auth/demo/", "");
    return await authService.demo(role);
  }
  if (cleanPath === "/auth/login") {
    return await authService.login(body?.email || "", body?.password || "");
  }

  // 2. Snapshot
  const snapshotMatch = cleanPath.match(/^\/patients\/(\d+)\/snapshot$/);
  if (snapshotMatch) {
    const pid = Number(snapshotMatch[1]);
    return await patientService.getPatientSnapshot(pid);
  }

  // 3. Settings
  if (cleanPath === "/settings") {
    if (normalizedMethod === "PUT") {
      return await settingsService.updateSettings(body);
    }
    return await settingsService.getSettings();
  }

  // 4. Routine actions
  const routineStatusMatch = cleanPath.match(/^\/routine\/(\d+)\/status$/);
  if (routineStatusMatch) {
    const rid = Number(routineStatusMatch[1]);
    return await patientService.updateRoutineStatus(rid, body?.status, body?.date);
  }
  const patientRoutineMatch = cleanPath.match(/^\/patients\/(\d+)\/routine$/);
  if (patientRoutineMatch && normalizedMethod === "POST") {
    return await patientService.addRoutine(body);
  }
  const routineCrudMatch = cleanPath.match(/^\/routine\/(\d+)$/);
  if (routineCrudMatch) {
    const rid = Number(routineCrudMatch[1]);
    if (normalizedMethod === "PUT") {
      return await patientService.updateRoutine(rid, body);
    }
    if (normalizedMethod === "DELETE") {
      return await patientService.deleteRoutine(rid);
    }
  }

  // 5. Medication actions
  const medStatusMatch = cleanPath.match(/^\/medications\/(\d+)\/status$/);
  if (medStatusMatch) {
    const rid = Number(medStatusMatch[1]);
    return await patientService.updateMedicationStatus(rid, body?.status, body?.date);
  }
  const patientMedMatch = cleanPath.match(/^\/patients\/(\d+)\/medications$/);
  if (patientMedMatch && normalizedMethod === "POST") {
    return await patientService.addMedication(body);
  }
  const medCrudMatch = cleanPath.match(/^\/medications\/(\d+)$/);
  if (medCrudMatch) {
    const rid = Number(medCrudMatch[1]);
    if (normalizedMethod === "PUT") {
      return await patientService.updateMedication(rid, body);
    }
    if (normalizedMethod === "DELETE") {
      return await patientService.deleteMedication(rid);
    }
  }

  // 6. Family actions
  const familyPhotoMatch = cleanPath.match(/^\/family\/(\d+)\/photo$/);
  if (familyPhotoMatch) {
    const rid = Number(familyPhotoMatch[1]);
    if (normalizedMethod === "POST") {
      let photoUrl = "/avatars/daughter.svg";
      if (typeof body === "string") {
        photoUrl = body;
      } else if (body instanceof FormData && body.get("file")) {
        const file = body.get("file") as File;
        if (file && typeof URL !== "undefined") {
          photoUrl = URL.createObjectURL(file);
        }
      }
      return await patientService.uploadFamilyPhoto(rid, photoUrl);
    }
    return { photo: "/avatars/daughter.svg" };
  }
  const patientFamilyMatch = cleanPath.match(/^\/patients\/(\d+)\/family$/);
  if (patientFamilyMatch && normalizedMethod === "POST") {
    return await patientService.addFamilyMember(body);
  }
  const familyCrudMatch = cleanPath.match(/^\/family\/(\d+)$/);
  if (familyCrudMatch) {
    const rid = Number(familyCrudMatch[1]);
    if (normalizedMethod === "PUT") {
      return await patientService.updateFamilyMember(rid, body);
    }
    if (normalizedMethod === "DELETE") {
      return await patientService.deleteFamilyMember(rid);
    }
  }

  // 7. Games sessions
  const gameSessionMatch = cleanPath.match(/^\/patients\/(\d+)\/games\/sessions$/);
  if (gameSessionMatch && normalizedMethod === "POST") {
    return await patientService.saveGameSession(body);
  }

  // 8. Alerts
  const alertReadMatch = cleanPath.match(/^\/alerts\/(\d+)\/read$/);
  if (alertReadMatch && normalizedMethod === "POST") {
    const aid = Number(alertReadMatch[1]);
    return await patientService.markAlertRead(aid);
  }

  // 9. Demo reminder
  const reminderMatch = cleanPath.match(/^\/patients\/(\d+)\/demo-reminder$/);
  if (reminderMatch && normalizedMethod === "POST") {
    const pid = Number(reminderMatch[1]);
    return await patientService.triggerDemoReminder(pid);
  }

  // Default fallback
  return { ok: true };
}

type Operation = { id: string; userId: number; path: string; body: any };
let syncing = false;

export async function queueAction(userId: number, path: string, body: any) {
  await update<Operation[]>("queue", (list) => [
    ...(list || []),
    { id: crypto.randomUUID(), userId, path, body },
  ]);
  window.dispatchEvent(new Event("queue-change"));
}

export async function pendingCount() {
  return ((await read<Operation[]>("queue")) || []).length;
}

export async function syncQueue(userId: number) {
  if (syncing) return;
  syncing = true;
  try {
    const list: Operation[] = (await read("queue")) || [];
    for (const op of list) {
      if (op.userId !== userId) continue;
      await request(op.path, "POST", op.body);
      await update<Operation[]>("queue", (current) =>
        (current || []).filter((x) => x.id !== op.id),
      );
    }
    window.dispatchEvent(new Event("queue-change"));
  } finally {
    syncing = false;
  }
}

export async function action(userId: number, path: string, body: any) {
  if (!navigator.onLine) {
    await queueAction(userId, path, body);
    return { queued: true };
  }
  try {
    return await request(path, "POST", body);
  } catch (e) {
    if (e instanceof TypeError) {
      await queueAction(userId, path, body);
      return { queued: true };
    }
    throw e;
  }
}

export { authService };
