// frontend/tests/auth_routing.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";
import { authService } from "../src/services/authService";
import { storageService, STORAGE_KEYS } from "../src/services/storageService";
import { Provider } from "../src/context";
import "../src/locales";

describe("RecallX Frontend Authentication & Routing Behavior", () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.initializeStorage(true);
    storageService.clearSession();
  });

  it("authenticates Patient with demo credentials and saves recallx_session", async () => {
    const res = await authService.login("patient@recallx.demo", "patient123");
    expect(res.user.role).toBe("patient");
    expect(res.user.name).toBe("Asha Ji");

    // Check localStorage session
    const session = authService.getSession();
    expect(session).toEqual({
      isAuthenticated: true,
      role: "patient",
      userId: 1,
    });
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getCurrentRole()).toBe("patient");
    expect(authService.getCurrentUser()).not.toBeNull();
  });

  it("authenticates Caregiver with demo credentials and saves recallx_session", async () => {
    const res = await authService.login("caregiver@recallx.demo", "caregiver123");
    expect(res.user.role).toBe("caregiver");
    expect(res.user.name).toBe("Rahul");

    const session = authService.getSession();
    expect(session).toEqual({
      isAuthenticated: true,
      role: "caregiver",
      userId: 2,
    });
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getCurrentRole()).toBe("caregiver");
  });

  it("accepts short identifiers for patient and caregiver", async () => {
    const patientRes = await authService.login("patient", "patient123");
    expect(patientRes.user.role).toBe("patient");

    const careRes = await authService.login("caregiver", "caregiver123");
    expect(careRes.user.role).toBe("caregiver");
  });

  it("rejects incorrect passwords with descriptive error", async () => {
    await expect(
      authService.login("patient@recallx.demo", "wrongpassword"),
    ).rejects.toThrow(/invalid password/i);

    await expect(
      authService.login("caregiver@recallx.demo", "wrongpassword"),
    ).rejects.toThrow(/invalid password/i);
  });

  it("rejects unknown user identifiers", async () => {
    await expect(
      authService.login("unknown@example.com", "anypass"),
    ).rejects.toThrow(/unrecognized demo credentials/i);
  });

  it("supports one-click demo login for patient and caregiver", async () => {
    const p = await authService.demo("patient");
    expect(p.user.role).toBe("patient");
    expect(authService.isAuthenticated()).toBe(true);

    const c = await authService.demo("caregiver");
    expect(c.user.role).toBe("caregiver");
    expect(authService.getCurrentRole()).toBe("caregiver");
  });

  it("logout clears session but preserves patient routines, family and settings", async () => {
    // 1. Log in
    await authService.demo("patient");
    expect(authService.isAuthenticated()).toBe(true);

    // 2. Log out
    await authService.logout();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getSession()).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();

    // 3. Verify demo data is intact
    const routines = storageService.getItem(STORAGE_KEYS.ROUTINES, []);
    expect(routines.length).toBeGreaterThan(0);

    const family = storageService.getItem(STORAGE_KEYS.FAMILY, []);
    expect(family.length).toBeGreaterThan(0);

    const settings = storageService.getItem(STORAGE_KEYS.SETTINGS, null);
    expect(settings).not.toBeNull();
  });

  it("handles corrupted recallx_session JSON safely", () => {
    localStorage.setItem(STORAGE_KEYS.SESSION, "corrupt-json-data{{{{");
    expect(authService.getSession()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getCurrentRole()).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();
  });

  it("always renders Login page on root '/' without auto-redirecting", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Provider>
          <App />
        </Provider>
      </MemoryRouter>,
    );

    // Should display login screen elements
    expect(await screen.findByText(/a little care/i)).toBeDefined();
    expect(screen.getByText(/patient demo/i)).toBeDefined();
    expect(screen.getByText(/caregiver demo/i)).toBeDefined();
  });

  it("renders Login page on root '/' even if session exists (no auto-redirect on '/')", async () => {
    // Create an existing session
    await authService.demo("patient");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Provider>
          <App />
        </Provider>
      </MemoryRouter>,
    );

    // Should still display Login page
    expect(await screen.findByText(/a little care/i)).toBeDefined();
    expect(screen.getByText(/patient demo/i)).toBeDefined();
  });

  it("redirects unauthenticated direct access to /patient back to '/'", async () => {
    // Ensure no session
    storageService.clearSession();

    render(
      <MemoryRouter initialEntries={["/patient"]}>
        <Provider>
          <App />
        </Provider>
      </MemoryRouter>,
    );

    // Unauthenticated user redirected to login page on '/'
    expect(await screen.findByText(/a little care/i)).toBeDefined();
  });

  it("redirects unauthenticated direct access to /caregiver back to '/'", async () => {
    storageService.clearSession();

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <Provider>
          <App />
        </Provider>
      </MemoryRouter>,
    );

    // Unauthenticated user redirected to login page on '/'
    expect(await screen.findByText(/a little care/i)).toBeDefined();
  });

  it("enforces role protection: patient cannot access /caregiver", async () => {
    // Set patient session
    await authService.demo("patient");

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <Provider>
          <App />
        </Provider>
      </MemoryRouter>,
    );

    // Should redirect away from caregiver to patient view
    await waitFor(() => {
      expect(screen.queryByText(/caregiver space/i)).toBeNull();
    });
  });
});
