import { useState } from "react";
import {
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Layers3,
  ListChecks,
  Plus,
  Tag,
  Target,
} from "lucide-react";
import { activityMatches, noActivityLabel, workActivity } from "../contributions/model";
import { CategoryIcon } from "./CategoryIcon";
import { TaskRow, type TaskControls } from "./TaskRow";
import { groupPlanTasks, planSection, type Cadence, type PlanGroup, type Task } from "./model";

const sections = [
  { key: "tasks", label: "Zadania", icon: ListChecks, cadence: "once", add: "Dodaj zadanie" },
  { key: "habits", label: "Nawyki", icon: CalendarDays, cadence: "daily", add: "Dodaj nawyk" },
  { key: "goals", label: "Cele", icon: Target, cadence: "goal", add: "Dodaj cel" },
  { key: "work", label: "Praca", icon: BriefcaseBusiness, cadence: "once", add: "Dodaj do pracy" },
] as const;

export function Plan({
  tasks,
  activities,
  byGroup,
  controls,
  onNew,
  onGroupChange,
}: {
  tasks: Task[];
  activities: string[];
  byGroup: boolean;
  controls: TaskControls;
  onNew: (cadence: Cadence, activity?: string, group?: PlanGroup) => void;
  onGroupChange: (byGroup: boolean) => void;
}) {
  const [archived, setArchived] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const active = activity !== null && activities.includes(activity) ? activity : null;
  const shown = tasks.filter((task) => task.archived === archived && activityMatches(task, active));
  const panels = byGroup
    ? groupPlanTasks(shown).map(({ group, items }) => ({
        key: group ?? "",
        label: group ?? "Bez grupy",
        icon: null,
        items,
        cadence: "once" as const,
        activity: active ?? (group === workActivity ? workActivity : undefined),
        group: group ?? undefined,
        add: "Dodaj zadanie",
      }))
    : sections.map((section) => {
        const group: PlanGroup | undefined = section.key === "work" ? workActivity : undefined;
        return {
          ...section,
          items: shown.filter((task) => planSection(task) === section.key),
          activity: group ?? active ?? undefined,
          group,
          add: group && active !== null && active !== group ? null : section.add,
        };
      });

  return (
    <div className="view-stack">
      <div className="panel-toolbar">
        {archived ? (
          <h2>Archiwum</h2>
        ) : (
          <div className="segmented" role="group" aria-label="Widok planu">
            <button aria-pressed={!byGroup} onClick={() => onGroupChange(false)}>
              <Layers3 size={16} /> Według typu
            </button>
            <button aria-pressed={byGroup} onClick={() => onGroupChange(true)}>
              <Tag size={16} /> Według grup
            </button>
          </div>
        )}
        <div className="header-actions">
          <label className="filter">
            <span>Aktywność</span>
            <select
              value={active === null ? "" : `:${active}`}
              onChange={(event) =>
                setActivity(event.target.value ? event.target.value.slice(1) : null)
              }
            >
              <option value="">Wszystkie</option>
              {activities.map((name) => (
                <option key={name} value={`:${name}`}>
                  {name || noActivityLabel}
                </option>
              ))}
            </select>
          </label>
          <button className="quiet-button" onClick={() => setArchived(!archived)}>
            {archived ? <ArrowLeft size={16} /> : <Archive size={16} />}
            {archived ? "Wróć do planu" : "Archiwum"}
          </button>
        </div>
      </div>
      {shown.length === 0 && (archived || active !== null) && (
        <div className="panel empty-state">
          <Archive size={26} />
          <h2>{active !== null ? "Brak pozycji dla tej aktywności" : "Archiwum jest puste"}</h2>
          {active !== null ? (
            <button className="quiet-button" onClick={() => setActivity(null)}>
              Pokaż wszystkie aktywności
            </button>
          ) : (
            <p>Zarchiwizowane zadania zachowują swoją historię i można je przywrócić.</p>
          )}
        </div>
      )}
      {panels.map(({ key, label, icon: Icon, cadence, activity, group, add, items }) => {
        if (items.length === 0 && (archived || active !== null)) return null;
        return (
          <section className="panel task-panel" key={key} aria-label={label}>
            <div className="panel-heading">
              {Icon ? (
                <span className="heading-icon">
                  <Icon size={17} />
                </span>
              ) : (
                <CategoryIcon category={label} forPlanGroup />
              )}
              <h2>{label}</h2>
              <span className="panel-count">{items.length}</span>
              {!archived && add && (
                <button className="quiet-button" onClick={() => onNew(cadence, activity, group)}>
                  <Plus size={16} /> {add}
                </button>
              )}
            </div>
            {items.length > 0 && (
              <ul className="task-list">
                {items.map((task) => (
                  <TaskRow key={task.id} task={task} controls={controls} showCadence />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
