import { Check, ChevronRight, Pencil, RotateCcw, Target } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";
import { cadences, dateLabel, isUpcoming, type Task } from "./model";

export type TaskControls = {
  today: string;
  busy: boolean;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onGoal: (task: Task) => void;
  onRestore: (task: Task) => void;
};

export function TaskRow({
  task,
  controls,
  showCadence = false,
}: {
  task: Task;
  controls: TaskControls;
  showCadence?: boolean;
}) {
  const goal = task.cadence === "goal";
  const scheduled = task.scheduledFor;
  const upcoming = isUpcoming(task, controls.today);
  const meta = [
    showCadence ? cadences[task.cadence] : task.category,
    scheduled ? dateLabel(scheduled, { day: "numeric", month: "short" }) : "",
    task.detail,
  ].filter(Boolean);

  return (
    <li className="task-row" data-done={task.done || undefined}>
      {goal || task.archived ? (
        <CategoryIcon category={task.category} />
      ) : (
        <button
          type="button"
          className="completion-control"
          aria-label={`Wykonanie: ${task.title}`}
          aria-pressed={task.done}
          title={upcoming && !task.done ? "Zaplanowane na później" : undefined}
          disabled={controls.busy || (upcoming && !task.done)}
          onClick={() => controls.onComplete(task)}
        >
          <span>{task.done && <Check size={15} strokeWidth={2.5} />}</span>
        </button>
      )}
      <div className="task-copy">
        <strong>{task.title}</strong>
        <small>{meta.join(" · ")}</small>
      </div>
      {task.archived ? (
        <button
          className="icon-button"
          aria-label={`Przywróć: ${task.title}`}
          title="Przywróć"
          disabled={controls.busy}
          onClick={() => controls.onRestore(task)}
        >
          <RotateCcw size={17} />
        </button>
      ) : (
        <>
          {goal ? (
            <button
              className="quiet-button goal-link"
              aria-label={`Otwórz cel: ${task.title}`}
              onClick={() => controls.onGoal(task)}
            >
              <Target size={16} />
              {task.done ? "Ukończony" : "Kroki"} <ChevronRight size={14} />
            </button>
          ) : (
            <CategoryIcon category={task.category} />
          )}
          <button
            className="icon-button task-edit"
            aria-label={`Edytuj: ${task.title}`}
            title="Edytuj"
            onClick={() => controls.onEdit(task)}
          >
            <Pencil size={16} />
          </button>
        </>
      )}
    </li>
  );
}
