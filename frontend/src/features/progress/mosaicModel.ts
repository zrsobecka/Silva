import { categoryKey, towerName, type ActivityEntry } from "../contributions/model";
import { calendarDate, dateKey } from "../plan/model";

export type Range = "week" | "month" | "year";
const colors: Record<string, string> = {
  "": "#8a98a5",
  programowanie: "#58c3dc",
  cyberbezpieczeństwo: "#879fef",
  "czytanie książek": "#dfba63",
  oddychanie: "#6fd3b2",
  ruch: "#b2ce6f",
  gotowanie: "#eaa36d",
  "jazda samochodem": "#e88c92",
  "league of legends": "#b29bd5",
  "genshin impact": "#db8cc1",
};
export function activityColor(name: string) {
  const key = categoryKey(towerName(name));
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return colors[key] ?? `hsl(${hash % 360} 55% 70%)`;
}
export function moveDay(day: string, offset: number) {
  const date = calendarDate(day);
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}
export function periodBounds(anchor: string, range: Range) {
  const date = calendarDate(anchor);
  if (range === "week") {
    const start = moveDay(anchor, -((date.getDay() + 6) % 7));
    return { start, end: moveDay(start, 6) };
  }
  const year = date.getFullYear();
  const month = date.getMonth();
  return range === "month"
    ? {
        start: dateKey(new Date(year, month, 1, 12)),
        end: dateKey(new Date(year, month + 1, 0, 12)),
      }
    : { start: `${year}-01-01`, end: `${year}-12-31` };
}
export function shiftPeriod(anchor: string, range: Range, direction: number) {
  const { start } = periodBounds(anchor, range);
  if (range === "week") return moveDay(start, direction * 7);
  const date = calendarDate(start);
  if (range === "month") date.setMonth(date.getMonth() + direction);
  else date.setFullYear(date.getFullYear() + direction);
  return dateKey(date);
}
export function periodEntries(
  entries: ActivityEntry[],
  anchor: string,
  range: Range,
  today: string,
) {
  const { start, end } = periodBounds(anchor, range);
  return entries.filter((e) => e.day >= start && e.day <= end && e.day <= today);
}
export function mosaicBuckets(anchor: string, range: Range) {
  const { start, end } = periodBounds(anchor, range);
  if (range === "year")
    return Array.from({ length: 12 }, (_, i) => {
      const day = `${start.slice(0, 4)}-${String(i + 1).padStart(2, "0")}-01`;
      return periodBounds(day, "month");
    });
  const buckets: { start: string; end: string }[] = [];
  for (let day = start; day <= end;) {
    const last = range === "week" ? day : periodBounds(day, "week").end;
    buckets.push({ start: day, end: last > end ? end : last });
    day = moveDay(last, 1);
  }
  return buckets;
}
