import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  activityHistory,
  categoryKey,
  metricTotals,
  type Contribution,
} from "../contributions/model";
import { dateLabel, entryCount, type Snapshot } from "../plan/model";
import { ActivityRows } from "./ActivityRows";
import { Mosaic, colorStyle, entryKey } from "./Mosaic";
import { activityName, periodBounds, periodEntries, shiftPeriod, type Range } from "./mosaicModel";

export function Progress({
  snapshot,
  onToday,
  onAdd,
  onEdit,
  onLink,
}: {
  snapshot: Snapshot;
  onToday: () => void;
  onAdd: (category: string) => void;
  onEdit: (entry: Contribution) => void;
  onLink: (link: string) => void;
}) {
  const [anchor, setAnchor] = useState(snapshot.today);
  const [range, setRange] = useState<Range>("week");
  const [activity, setActivity] = useState("");
  const [selected, setSelected] = useState("");
  const [limit, setLimit] = useState(20);
  const history = activityHistory(snapshot.entries, snapshot.contributions);
  const names = new Map<string, string>();
  [...snapshot.tasks.filter((t) => !t.archived), ...history].forEach((e) => {
    const name = activityName(e);
    names.set(categoryKey(name), name);
  });
  const activities = [...names.values()].sort((a, b) => a.localeCompare(b, "pl"));
  const active = activities.includes(activity) ? activity : "";
  const entries = periodEntries(history, anchor, range, snapshot.today);
  const shown = entries.filter(
    (e) => !active || categoryKey(activityName(e)) === categoryKey(active),
  );
  const picked = entries.find((e) => entryKey(e) === selected);
  const bounds = periodBounds(anchor, range);
  const next = shiftPeriod(anchor, range, 1);
  const previous = shiftPeriod(anchor, range, -1);
  const label =
    range === "week"
      ? `${dateLabel(bounds.start, { day: "numeric", month: "short", year: "numeric" })} – ${dateLabel(bounds.end, { day: "numeric", month: "short", year: "numeric" })}`
      : dateLabel(
          bounds.start,
          range === "month" ? { month: "long", year: "numeric" } : { year: "numeric" },
        );
  const totals = shown.reduce(
    (acc, e) => {
      if (e.kind === "contribution")
        for (const [key, value] of Object.entries(e.metrics)) acc[key] = (acc[key] ?? 0) + value;
      return acc;
    },
    {} as Record<string, number>,
  );
  function change(day: string, newRange = range) {
    setAnchor(day);
    setRange(newRange);
    setSelected("");
    setLimit(20);
  }
  return (
    <div className="view-stack">
      <div className="panel-toolbar">
        <div className="segmented" aria-label="Zakres postępu">
          {(
            [
              ["week", "Tydzień"],
              ["month", "Miesiąc"],
              ["year", "Rok"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              aria-pressed={range === value}
              onClick={() => change(anchor, value)}
            >
              {text}
            </button>
          ))}
        </div>
        <button className="secondary-button" onClick={() => onAdd(active)}>
          <Plus size={16} /> Dodaj wkład
        </button>
      </div>
      <section className="panel chart-panel" aria-labelledby="mosaic-heading">
        <div className="chart-header">
          <div>
            <span className="kicker">MOZAIKA AKTYWNOŚCI</span>
            <h2 id="mosaic-heading">{label}</h2>
            <p>Każdy kwadrat to jeden zapisany wkład. Kolor oznacza aktywność.</p>
          </div>
          <div className="period-controls">
            <button
              className="icon-button"
              aria-label="Poprzedni okres"
              disabled={previous < "2000-01-01"}
              onClick={() => change(previous)}
            >
              <ChevronLeft size={20} />
            </button>
            <button className="quiet-button" onClick={() => change(snapshot.today)}>
              Bieżący
            </button>
            <button
              className="icon-button"
              aria-label="Następny okres"
              disabled={next > snapshot.today}
              onClick={() => change(next)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="mosaic-filters" role="group" aria-label="Wyróżnij aktywność">
          <button
            aria-pressed={!active}
            onClick={() => {
              setActivity("");
              setSelected("");
              setLimit(20);
            }}
          >
            Wszystkie
          </button>
          {activities.map((name) => (
            <button
              key={name}
              aria-pressed={active === name}
              onClick={() => {
                setActivity(active === name ? "" : name);
                setSelected("");
                setLimit(20);
              }}
            >
              <span className="mosaic-dot" style={colorStyle(name)} aria-hidden="true" />
              {name}
            </button>
          ))}
        </div>
        <p className="mosaic-summary" aria-live="polite">
          {entryCount(shown.length)} · Dni z aktywnością: {new Set(shown.map((e) => e.day)).size}
          {active ? ` · ${active}` : ""}
        </p>
        <Mosaic
          entries={entries}
          anchor={anchor}
          range={range}
          today={snapshot.today}
          activity={active}
          selected={selected}
          onSelect={(key) => setSelected(selected === key ? "" : key)}
          onMonth={(day) => change(day, "month")}
        />
        <div className="mosaic-detail" aria-live="polite">
          {picked ? (
            <ActivityRows entries={[picked]} onEdit={onEdit} onLink={onLink} />
          ) : (
            <p>
              {range === "year"
                ? "Wybierz miesiąc, aby zobaczyć jego wpisy."
                : "Wybierz kwadrat, aby zobaczyć szczegóły działania."}
            </p>
          )}
        </div>
        {!!active && metricTotals(totals).length > 0 && (
          <p className="mosaic-summary">Zapisane ilości: {metricTotals(totals).join(" · ")}</p>
        )}
      </section>
      <section className="panel task-panel" aria-label="Historia aktywności">
        <div className="panel-heading">
          <h2>{active || "Historia aktywności"}</h2>
          <span className="panel-count">{entryCount(shown.length)}</span>
        </div>
        {!shown.length ? (
          <div className="history-empty">
            <p>W tym okresie nie ma jeszcze wpisów{active ? ` dla aktywności „${active}”` : ""}.</p>
            <button className="quiet-button" onClick={onToday}>
              Przejdź do dzisiaj
            </button>
          </div>
        ) : (
          <>
            <ActivityRows entries={shown.slice(0, limit)} onEdit={onEdit} onLink={onLink} />
            {shown.length > limit && (
              <button className="quiet-button show-more" onClick={() => setLimit(limit + 50)}>
                Pokaż kolejne wpisy
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
