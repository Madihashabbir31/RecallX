import { it, expect, vi, beforeEach } from "vitest";
import { read, clearPrivate } from "../src/services/offline";
import { queueAction, syncQueue, pendingCount } from "../src/services/api";
beforeEach(async () => {
  await clearPrivate();
  localStorage.setItem("recallx-token", "test-token");
});
it("retains concurrent offline actions and syncs each once", async () => {
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      queueAction(1, "/routine/" + i + "/status", {
        status: "completed",
        event_id: "event-" + i,
      }),
    ),
  );
  expect(await pendingCount()).toBe(5);
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetch);
  await syncQueue(1);
  expect(fetch).toHaveBeenCalledTimes(5);
  expect(await pendingCount()).toBe(0);
  await syncQueue(1);
  expect(fetch).toHaveBeenCalledTimes(5);
});
it("does not replay another account’s queued data", async () => {
  await queueAction(2, "/routine/1/status", { status: "completed" });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await syncQueue(1);
  expect(fetch).not.toHaveBeenCalled();
  expect(await pendingCount()).toBe(1);
});
it("keeps failed events for retry", async () => {
  await queueAction(1, "/routine/1/status", { status: "completed" });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  await expect(syncQueue(1)).rejects.toThrow("offline");
  expect(await pendingCount()).toBe(1);
});
