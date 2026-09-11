import "fake-indexeddb/auto";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

class LocalStorageMock {
  private store: Record<string, string> = {};

  get length() {
    return Object.keys(this.store).length;
  }

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  key(index: number) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

const mockStorage = new LocalStorageMock();
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    writable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: new LocalStorageMock(),
    writable: true,
  });
}
if (typeof globalThis !== "undefined") {
  (globalThis as any).localStorage = mockStorage;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

Object.defineProperty(window, "matchMedia", {
  value: vi.fn(() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
