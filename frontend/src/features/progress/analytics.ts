import { calendarDate, dateKey, type Entry } from "../plan/model";

export function summarize(entries: Entry[], period: string, category: string) {
  const shown = entries.filter(
    (entry) => entry.day.startsWith(period + "-") && (!category || entry.category === category),
  );
  const days = new Map<string, number>();
  const months = new Map<string, number>();
  for (const entry of shown) {
    const month = entry.day.slice(0, 7);
    days.set(entry.day, (days.get(entry.day) ?? 0) + 1);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  return {
    shown,
    days,
    months,
    completed: shown.filter((entry) => entry.kind === "complete").length,
    steps: shown.filter((entry) => entry.kind === "step").length,
  };
}

export function monthCalendar(month: string) {
  const start = calendarDate(month);
  const year = start.getFullYear();
  const index = start.getMonth();
  const length = new Date(year, index + 1, 0).getDate();
  return {
    offset: (start.getDay() + 6) % 7,
    dates: Array.from({ length }, (_, day) => dateKey(new Date(year, index, day + 1, 12))),
  };
}

export function shiftMonth(month: string, delta: number) {
  const date = calendarDate(month);
  date.setMonth(date.getMonth() + delta);
  return dateKey(date).slice(0, 7);
}
