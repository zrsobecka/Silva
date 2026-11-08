import type { CSSProperties } from "react";
import {
  activityMatches,
  activityName,
  metricTotals,
  noActivityLabel,
  type ActivityEntry,
} from "../contributions/model";
import { dateLabel, entryCount } from "../plan/model";
import { activityColor, mosaicBuckets, type Range } from "./mosaicModel";

export const entryKey = (entry: ActivityEntry) => `${entry.kind}:${entry.id}`;
export const colorStyle = (name: string) =>
  ({ "--activity-color": activityColor(name) }) as CSSProperties;

export function Mosaic({
  entries,
  anchor,
  range,
  today,
  activity,
  selected,
  onSelect,
  onMonth,
}: {
  entries: ActivityEntry[];
  anchor: string;
  range: Range;
  today: string;
  activity: string | null;
  selected: string;
  onSelect: (key: string) => void;
  onMonth: (day: string) => void;
}) {
  return (
    <div className={`mosaic-grid mosaic-${range}`}>
      {mosaicBuckets(anchor, range).map((bucket) => {
        const items = entries
          .filter((e) => e.day >= bucket.start && e.day <= bucket.end)
          .sort((a, b) => a.day.localeCompare(b.day) || a.id - b.id);
        const matching = items.filter((entry) => activityMatches(entry, activity));
        const future = bucket.start > today;
        const label =
          range === "year"
            ? dateLabel(bucket.start, { month: "long" })
            : range === "week"
              ? dateLabel(bucket.start, { weekday: "short", day: "numeric" })
              : `${dateLabel(bucket.start, { day: "numeric", month: "short" })} – ${dateLabel(bucket.end, { day: "numeric", month: "short" })}`;
        const marks = (
          <span className="mosaic-marks">
            {items.map((entry) => {
              const name = activityName(entry);
              const dim = !activityMatches(entry, activity);
              if (range === "year")
                return (
                  <span
                    key={entryKey(entry)}
                    className="mosaic-mini"
                    style={colorStyle(name)}
                    data-dim={dim}
                  />
                );
              const detail =
                entry.kind === "contribution"
                  ? metricTotals(entry.metrics).join(" · ")
                  : entry.kind === "step"
                    ? entry.note
                    : "";
              const title = [
                dateLabel(entry.day, { dateStyle: "long" }),
                name === entry.title ? "" : name || noActivityLabel,
                entry.title,
                detail,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <button
                  key={entryKey(entry)}
                  className="mosaic-square"
                  style={colorStyle(name)}
                  data-dim={dim}
                  title={title}
                  aria-label={title}
                  aria-pressed={selected === entryKey(entry)}
                  onClick={() => onSelect(entryKey(entry))}
                />
              );
            })}
          </span>
        );
        return (
          <div className="mosaic-bucket" key={bucket.start}>
            {range === "year" ? (
              <button
                className="mosaic-month"
                disabled={future}
                onClick={() => onMonth(bucket.start)}
                aria-label={`${label} · ${entryCount(matching.length)}. Pokaż miesiąc.`}
              >
                <span className="mosaic-label">
                  {label} · {matching.length}
                </span>
                <span aria-hidden="true">{marks}</span>
                {!items.length && (
                  <span className="mosaic-empty">{future ? "Przed Tobą" : "Brak wpisów"}</span>
                )}
              </button>
            ) : (
              <>
                <span className="mosaic-label">{label}</span>
                {marks}
                {!items.length && (
                  <span className="mosaic-empty">{future ? "Przed Tobą" : "Brak wpisów"}</span>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
