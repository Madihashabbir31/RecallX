import { read, write, update } from "./offline";
export const API_BASE = import.meta.env.VITE_API_URL || "/api";
export async function request(
  path: string,
  method = "GET",
  body?: any,
): Promise<any> {
  const token = localStorage.getItem("recallx-token");
  const response = await fetch(API_BASE + path, {
    method,
    headers: {
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body:
      body instanceof FormData
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
  });
  if (!response.ok) {
    const e = await response
      .json()
      .catch(() => ({ detail: "Something went wrong. Please try again." }));
    throw new Error(
      typeof e.detail === "string"
        ? e.detail
        : "Please check the information and try again.",
    );
  }
  return response.json();
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
export const authService = {
  login: (email: string, password: string) =>
    request("/auth/login", "POST", { email, password }),
  demo: (role: string) => request("/auth/demo/" + role, "POST"),
};
