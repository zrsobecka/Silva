import { describe, expect, it } from "vitest";
import type { Entry } from "../plan/model";
import { monthCalendar, shiftMonth, summarize } from "./analytics";

const entries: Entry[] = [
  {
    id: 1,
    taskId: 1,
    title: "Uporządkować notatki",
    category: "Organizacja",
    day: "2026-11-06",
    kind: "complete",
    note: "",
  },
  {
    id: 2,
    taskId: 8,
    title: "Przygotować wystawę",
    category: "Projekt",
    day: "2026-11-06",
    kind: "step",
    note: "Wybrano prace",
  },
  {
    id: 3,
    taskId: 2,
    title: "Przejrzeć kalendarz",
    category: "Organizacja",
    day: "2026-10-31",
    kind: "complete",
    note: "",
  },
  {
    id: 4,
    taskId: 1,
    title: "Uporządkować notatki",
    category: "Organizacja",
    day: "2025-11-06",
    kind: "complete",
    note: "",
  },
];

describe("kalendarz postępu", () => {
  it("oddziela zadania i kroki, licząc dzień tylko raz", () => {
    const result = summarize(entries, "2026-11", "");
    expect(result.completed).toBe(1);
    expect(result.steps).toBe(1);
    expect([...result.days]).toEqual([["2026-11-06", 2]]);
  });

  it("w widoku roku filtruje grupę i liczy wpisy w każdym miesiącu", () => {
    const result = summarize(entries, "2026", "Organizacja");
    expect([...result.months]).toEqual([
      ["2026-11", 1],
      ["2026-10", 1],
    ]);
    expect(result.steps).toBe(0);
  });

  it("ustawia poniedziałek jako początek tygodnia i uwzględnia rok przestępny", () => {
    const february = monthCalendar("2024-02");
    expect(february.offset).toBe(3);
    expect(february.dates.at(-1)).toBe("2024-02-29");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});
