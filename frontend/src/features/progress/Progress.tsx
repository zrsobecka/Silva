import { useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Footprints,
  ListChecks,
} from "lucide-react";
import { activityHistory, groupTowers, type Contribution } from "../contributions/model";
import { dateLabel, entryCount, type Snapshot } from "../plan/model";
import { ActivityRows } from "./ActivityRows";
import { monthCalendar, shiftMonth, summarize } from "./analytics";
import { Towers } from "./Towers";

const weekdays = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
type Range = "month" | "year";

function MonthChart({
  month,
  today,
  counts,
  selected,
  onSelect,
}: {
  month: string;
  today: string;
  counts: Map<string, number>;
  selected: string;
  onSelect: (day: string) => void;
}) {
  const { offset, dates } = monthCalendar(month);
  return (
    <>
      <div className="month-grid">
        {weekdays.map((label) => (
          <span className="weekday" key={label}>
            {label}
          </span>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <span key={`gap-${index}`} aria-hidden="true" />
        ))}
        {dates.map((day) => {
          const count = counts.get(day) ?? 0;
          return (
            <button
              className="day-cell"
              key={day}
              data-level={Math.min(4, count)}
              aria-current={day === today ? "date" : undefined}
              aria-pressed={day === selected}
              title={`${dateLabel(day, { dateStyle: "full" })} · ${entryCount(count)}`}
              aria-label={`${dateLabel(day, { dateStyle: "full" })} · ${entryCount(count)}`}
              disabled={day > today}
              onClick={() => onSelect(day === selected ? "" : day)}
            >
              <span>{Number(day.slice(-2))}</span>
              {count > 0 && <strong>{count}</strong>}
            </button>
          );
        })}
      </div>
      <div
        className="chart-legend"
        aria-label="Kolory pokazują liczbę wpisów w dniu, od zera do czterech lub więcej"
      >
        <span>0</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span className="legend-color" data-level={level} key={level} />
        ))}
        <span>4+ wpisy</span>
      </div>
    </>
  );
}

function YearChart({
  year,
  today,
  counts,
  onSelect,
}: {
  year: string;
  today: string;
  counts: Map<string, number>;
  onSelect: (month: string) => void;
}) {
  const maximum = Math.max(1, ...counts.values());
  return (
    <div className="year-grid">
      {Array.from({ length: 12 }, (_, index) => {
        const month = `${year}-${String(index + 1).padStart(2, "0")}`;
        const count = counts.get(month) ?? 0;
        const label = dateLabel(month, { month: "short" }).replace(".", "");
        return (
          <button
            className="month-bar"
            key={month}
            disabled={month > today.slice(0, 7)}
            title={`${dateLabel(month, { month: "long", year: "numeric" })} · ${entryCount(count)}`}
            aria-label={`Pokaż ${dateLabel(month, { month: "long", year: "numeric" })} · ${entryCount(count)}`}
            onClick={() => onSelect(month)}
          >
            <strong>{count}</strong>
            <span className="bar-track">
              <span style={{ height: `${(count / maximum) * 100}%` }} />
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

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
  const currentMonth = snapshot.today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [range, setRange] = useState<Range>("month");
  const [category, setCategory] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [expanded, setExpanded] = useState(false);
  const year = month.slice(0, 4);
  const history = activityHistory(snapshot.entries, snapshot.contributions);
  const towers = groupTowers(history, snapshot.tasks);
  const categories = Array.from(towers.values(), (tower) => tower.name).sort((a, b) =>
    a.localeCompare(b, "pl"),
  );
  const categoryFilter = categories.includes(category) ? category : "";
  const summary = summarize(history, range === "month" ? month : year, categoryFilter);
  const activity = selectedDay
    ? summary.shown.filter((entry) => entry.day === selectedDay)
    : summary.shown;
  const previous = range === "month" ? shiftMonth(month, -1) : shiftMonth(month, -12);
  const next = range === "month" ? shiftMonth(month, 1) : shiftMonth(month, 12);
  const canAdvance = range === "month" ? month < currentMonth : year < currentMonth.slice(0, 4);

  function changeMonth(nextMonth: string) {
    setMonth(nextMonth > currentMonth ? currentMonth : nextMonth);
    setSelectedDay("");
    setExpanded(false);
  }

  function changeRange(nextRange: Range) {
    setRange(nextRange);
    setSelectedDay("");
    setExpanded(false);
  }

  return (
    <div className="view-stack">
      <Towers towers={towers} onAdd={onAdd} onEdit={onEdit} onLink={onLink} />
      <div className="panel-toolbar">
        <div className="segmented" aria-label="Zakres postępu">
          <button aria-pressed={range === "month"} onClick={() => changeRange("month")}>
            <CalendarDays size={16} /> Miesiąc
          </button>
          <button aria-pressed={range === "year"} onClick={() => changeRange("year")}>
            <ChartNoAxesCombined size={16} /> Rok
          </button>
        </div>
        <label className="filter">
          <span>Grupa</span>
          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategory(event.target.value);
              setExpanded(false);
            }}
          >
            <option value="">Wszystkie grupy</option>
            {categories.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="stats-grid">
        <div className="panel stat">
          <span>
            <ListChecks size={17} /> Wykonane zadania
          </span>
          <strong>{summary.completed}</strong>
        </div>
        <div className="panel stat">
          <span>
            <Footprints size={17} /> Kroki w celach
          </span>
          <strong>{summary.steps}</strong>
        </div>
        <div className="panel stat">
          <span>
            <Activity size={17} /> Aktywne dni
          </span>
          <strong>{summary.days.size}</strong>
        </div>
      </div>
      <section
        className="panel chart-panel"
        aria-label={range === "month" ? "Kalendarz postępu" : "Roczny wykres postępu"}
      >
        <div className="chart-header">
          <div>
            <span className="kicker">
              {range === "month" ? "KALENDARZ AKTYWNOŚCI" : "AKTYWNOŚĆ W MIESIĄCACH"}
            </span>
            <h2>
              {range === "month" ? dateLabel(month, { month: "long", year: "numeric" }) : year}
            </h2>
          </div>
          <div className="period-controls">
            <button
              className="icon-button"
              aria-label={range === "month" ? "Poprzedni miesiąc" : "Poprzedni rok"}
              disabled={previous < "2000-01"}
              onClick={() => changeMonth(previous)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="icon-button"
              aria-label={range === "month" ? "Następny miesiąc" : "Następny rok"}
              disabled={!canAdvance}
              onClick={() => changeMonth(next)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        {range === "month" ? (
          <MonthChart
            month={month}
            today={snapshot.today}
            counts={summary.days}
            selected={selectedDay}
            onSelect={(day) => {
              setSelectedDay(day);
              setExpanded(false);
            }}
          />
        ) : (
          <YearChart
            year={year}
            today={snapshot.today}
            counts={summary.months}
            onSelect={(month) => {
              changeMonth(month);
              changeRange("month");
            }}
          />
        )}
      </section>
      <section className="panel task-panel">
        <div className="panel-heading">
          <span className="heading-icon">
            <Activity size={17} />
          </span>
          <h2>
            {selectedDay
              ? dateLabel(selectedDay, { day: "numeric", month: "long" })
              : "Historia aktywności"}
          </h2>
          <span className="panel-count">{entryCount(activity.length)}</span>
        </div>
        {activity.length === 0 ? (
          <div className="history-empty">
            <p>W tym widoku nie ma jeszcze wpisów.</p>
            <button className="quiet-button" onClick={onToday}>
              Przejdź do dzisiaj <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <ActivityRows
              entries={expanded ? activity : activity.slice(0, 10)}
              onEdit={onEdit}
              onLink={onLink}
            />
            {activity.length > 10 && (
              <button className="quiet-button show-more" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Pokaż mniej" : "Pokaż wszystkie wpisy"}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
