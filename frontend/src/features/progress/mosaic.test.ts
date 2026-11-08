import { describe, expect, it } from "vitest";
import type { Entry } from "../plan/model";
import {
  activityName,
  activityColor,
  periodBounds,
  shiftPeriod,
  periodEntries,
  mosaicBuckets,
} from "./mosaicModel";
const entry: Entry = {
  id: 1,
  taskId: 1,
  title: "Zagrać",
  category: "Gry",
  tower: "LoL",
  day: "2025-12-31",
  kind: "complete",
  note: "",
};
describe("mozaika", () => {
  it("tydzień od poniedziałku przekracza rok bez gubienia wpisów", () => {
    expect(periodBounds("2026-01-01", "week")).toEqual({ start: "2025-12-29", end: "2026-01-04" });
    expect(
      periodEntries(
        [entry, { ...entry, id: 2, day: "2026-01-02" }],
        "2026-01-01",
        "week",
        "2026-01-01",
      ),
    ).toEqual([entry]);
  });
  it("nawigacja miesiąca nie przeskakuje lutego po 31 stycznia", () => {
    expect(shiftPeriod("2026-01-31", "month", 1)).toBe("2026-02-01");
    expect(periodBounds("2024-02-17", "month").end).toBe("2024-02-29");
    expect(shiftPeriod("2026-01-01", "week", -1)).toBe("2025-12-22");
  });
  it("przypisanie zadania i alias dają ten sam kolor co ręczny wkład", () => {
    expect(activityName(entry)).toBe("League of Legends");
    expect(activityColor("LoL")).toBe(activityColor("League of Legends"));
    expect(activityColor("LoL")).not.toBe(activityColor("Genshin Impact"));
    expect(activityName({ ...entry, tower: null, category: "Ruch" })).toBe("Ruch");
    expect(activityName({ ...entry, tower: null })).toBe("Zagrać");
  });
  it("miesiąc ma rozłączne tygodnie i nie gubi ostatniego dnia", () => {
    const buckets = mosaicBuckets("2026-11-08", "month");
    expect(buckets[0]).toEqual({ start: "2026-11-01", end: "2026-11-01" });
    expect(buckets.at(-1)?.end).toBe("2026-11-30");
    for (const day of ["2026-11-01", "2026-11-08", "2026-11-30"])
      expect(buckets.filter((b) => day >= b.start && day <= b.end)).toHaveLength(1);
    expect(mosaicBuckets("2026-11-08", "year")).toHaveLength(12);
  });
  it("wpis i ręczny wkład zachowują odrębność nawet przy takim samym id", () => {
    const manual = {
      id: 1,
      title: "Sesja",
      category: "Programowanie",
      day: entry.day,
      kind: "contribution" as const,
      link: null,
      metrics: { minutes: 20 },
    };
    expect(periodEntries([entry, manual], "2025-12-31", "month", "2026-01-01")).toHaveLength(2);
    expect(activityName(manual)).toBe("Programowanie");
  });
});
