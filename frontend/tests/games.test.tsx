import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Game from "../src/pages/Game";
import "../src/locales";
const mocks = vi.hoisted(() => ({
  perform: vi.fn(),
  setToast: vi.fn(),
  data: {
    family: [
      { id: 1, name: "Rahul", relation: "Son", memory_note: "Lives in Pune" },
      {
        id: 2,
        name: "Priya",
        relation: "Daughter",
        memory_note: "Loves gardening",
      },
    ],
    progress: {
      family: [],
      recommendations: {
        memory: { next_level: "easy" },
        object: { next_level: "easy" },
        sequence: { next_level: "easy" },
        family: { next_level: "easy" },
      },
    },
  },
}));
vi.mock("../src/context", () => ({
  useApp: () => ({
    data: mocks.data,
    perform: mocks.perform,
    pid: 1,
    settings: { voice: false, reduced_motion: true },
    setToast: mocks.setToast,
  }),
  Photo: ({ person }: any) => (
    <div data-testid="family-photo">{person.name}</div>
  ),
}));
function mount(game: string) {
  return render(
    <MemoryRouter initialEntries={["/patient/games/" + game]}>
      <Routes>
        <Route path="/patient/games/:type" element={<Game />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  mocks.perform.mockReset();
  mocks.perform.mockResolvedValue({ queued: false });
});
describe("Playable cognitive activities", () => {
  it("completes Memory Match, saves the score exactly once and supports pause", async () => {
    mount("memory");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getAllByRole("button", { name: "Resume" }).length).toBe(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Resume" })[0]);
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".memory-tile"),
    );
    const known = new Map<number, string>();
    let guard = 0;
    while (
      document.querySelectorAll(".memory-tile.matched").length < 6 &&
      guard++ < 15
    ) {
      const available = buttons
        .map((b, i) => ({ b, i }))
        .filter((x) => !x.b.disabled);
      let first = available.find((x) => !known.has(x.i)) || available[0];
      if (!first) break;
      const pair = available.find(
        (x) =>
          known.has(x.i) &&
          available.some(
            (y) => y.i !== x.i && known.get(y.i) === known.get(x.i),
          ),
      );
      if (pair) first = pair;
      fireEvent.click(first.b);
      const text = first.b.textContent || "";
      known.set(first.i, text);
      const rest = available.filter((x) => x.i !== first.i);
      const second =
        rest.find((x) => known.get(x.i) === text) ||
        rest.find((x) => !known.has(x.i)) ||
        rest[0];
      if (!second) throw new Error("No candidate");
      fireEvent.click(second.b);
      known.set(second.i, second.b.textContent || "");
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 700));
      });
      if (screen.queryByText("Well done!")) break;
    }
    await waitFor(() => expect(mocks.perform).toHaveBeenCalledTimes(1));
    expect(mocks.perform.mock.calls[0][1].game_type).toBe("memory");
    expect(mocks.perform.mock.calls[0][1].accuracy).toBeGreaterThan(0);
  }, 20000);
  it("completes Object Recall with correct choices and saved results", async () => {
    mount("object");
    for (let round = 0; round < 5; round++) {
      const name = document.querySelector(
        ".object-preview strong",
      )!.textContent!;
      fireEvent.click(screen.getByRole("button", { name: "I’m ready" }));
      const choice = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".answer-card"),
      ).find((x) => x.textContent?.includes(name))!;
      fireEvent.click(choice);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    await waitFor(() => expect(mocks.perform).toHaveBeenCalledTimes(1));
    expect(mocks.perform.mock.calls[0][1].accuracy).toBe(100);
  });
  it("always offers every sequence object and persists correct order", async () => {
    mount("sequence");
    for (let round = 0; round < 5; round++) {
      const names = Array.from(
        document.querySelectorAll(".object-preview strong"),
      ).map((x) => x.textContent!);
      fireEvent.click(screen.getByRole("button", { name: "I’m ready" }));
      for (const name of names) {
        const choice = Array.from(
          document.querySelectorAll<HTMLButtonElement>(".answer-card"),
        ).find((x) => x.textContent?.includes(name));
        expect(choice).toBeTruthy();
        fireEvent.click(choice!);
      }
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    await waitFor(() => expect(mocks.perform).toHaveBeenCalledTimes(1));
    expect(mocks.perform.mock.calls[0][1].accuracy).toBe(100);
  });
  it("tracks family hints and individual attempts", async () => {
    mount("family");
    for (let round = 0; round < 2; round++) {
      const name = screen.getByTestId("family-photo").textContent!;
      if (round === 0)
        fireEvent.click(screen.getByRole("button", { name: "Hint" }));
      const choice = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".answer-card"),
      ).find((x) => x.textContent?.includes(name))!;
      fireEvent.click(choice);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    await waitFor(() => expect(mocks.perform).toHaveBeenCalledTimes(1));
    const payload = mocks.perform.mock.calls[0][1];
    expect(payload.attempts).toHaveLength(2);
    expect(payload.hints_used).toBe(1);
    expect(payload.accuracy).toBe(100);
  });
  it("offers retry after a save failure without replacing the event ID", async () => {
    mocks.perform.mockRejectedValueOnce(new Error("Network error"));
    mount("family");
    for (let round = 0; round < 2; round++) {
      fireEvent.click(
        document.querySelector<HTMLButtonElement>(".answer-card")!,
      );
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    await screen.findByText("Network error");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mocks.perform).toHaveBeenCalledTimes(2));
    expect(mocks.perform.mock.calls[0][1].event_id).toBe(
      mocks.perform.mock.calls[1][1].event_id,
    );
  });
});
