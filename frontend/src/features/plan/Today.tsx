import { ArrowRight, CalendarDays, CalendarRange, ListChecks, Plus, Repeat2 } from "lucide-react";
import { TaskRow, type TaskControls } from "./TaskRow";
import { isUpcoming, type Snapshot, type Task } from "./model";
import logo from "../../assets/brand/silva.png";

function DailySummary({ done, total }: { done: number; total: number }) {
  const progress = total ? done / total : 0;
  return (
    <section className="daily-summary" aria-label="Podsumowanie dzisiejszych nawyków">
      <div className="summary-copy">
        <span className="kicker">
          <span className="signal-dot" /> DZIENNY RYTM
        </span>
        <h2>
          {total === 0
            ? "Zaplanuj swój dzień"
            : done === total
              ? "Plan dnia domknięty"
              : "Twój plan na dziś"}
        </h2>
        <p>
          {total === 0
            ? "Dodaj nawyk, który chcesz odhaczać codziennie."
            : `Wykonane nawyki ${done} z ${total}`}
        </p>
      </div>
      <div className="summary-art" aria-hidden="true">
        <img src={logo} alt="" draggable="false" />
      </div>
      <div className="progress-ring" aria-hidden="true">
        <svg viewBox="0 0 112 112">
          <circle className="ring-track" cx="56" cy="56" r="49" />
          <circle
            className="ring-fill"
            cx="56"
            cy="56"
            r="49"
            pathLength="100"
            strokeDasharray={`${progress * 100} 100`}
          />
        </svg>
        <div className="ring-label">
          <strong>
            {Math.round(progress * 100)}
            <small>%</small>
          </strong>
        </div>
      </div>
    </section>
  );
}

function TaskSection({
  label,
  icon: Icon,
  tasks,
  controls,
  empty,
  onAdd,
}: {
  label: string;
  icon: typeof CalendarDays;
  tasks: Task[];
  controls: TaskControls;
  empty: string;
  onAdd?: () => void;
}) {
  const done = tasks.filter((task) => task.done).length;
  return (
    <section className="panel task-panel">
      <div className="panel-heading">
        <span className="heading-icon">
          <Icon size={17} />
        </span>
        <h2>{label}</h2>
        {tasks.length > 0 && (
          <span className="panel-count" aria-label={`${done} z ${tasks.length} wykonanych`}>
            {done} / {tasks.length}
          </span>
        )}
        {onAdd && (
          <button
            className="icon-button section-add"
            type="button"
            title="Dodaj sprawę bieżącą"
            aria-label="Dodaj sprawę bieżącą"
            onClick={onAdd}
          >
            <Plus size={19} />
          </button>
        )}
      </div>
      {tasks.length > 0 ? (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} controls={controls} />
          ))}
        </ul>
      ) : (
        <p className="inline-empty">{empty}</p>
      )}
    </section>
  );
}

export function Today({
  snapshot,
  controls,
  onNew,
  onProgress,
}: {
  snapshot: Snapshot;
  controls: TaskControls;
  onNew: () => void;
  onProgress: () => void;
}) {
  const tasks = snapshot.tasks.filter((task) => !task.archived);
  const daily = tasks.filter((task) => task.cadence === "daily");
  const oneOff = tasks.filter(
    (task) =>
      task.cadence === "once" &&
      !isUpcoming(task, snapshot.today) &&
      (!task.done ||
        snapshot.entries.some(
          (entry) =>
            entry.taskId === task.id && entry.kind === "complete" && entry.day === snapshot.today,
        )),
  );
  const completed = daily.filter((task) => task.done).length;
  const loggedToday = snapshot.entries.filter((entry) => entry.day === snapshot.today).length;

  return (
    <div className="view-stack">
      <DailySummary done={completed} total={daily.length} />
      <div className="today-grid">
        <div className="view-stack">
          <TaskSection
            label="Codzienne nawyki"
            icon={Repeat2}
            tasks={daily}
            controls={controls}
            empty="Nie masz aktywnych codziennych nawyków."
          />
          <TaskSection
            label="Sprawy bieżące"
            icon={ListChecks}
            tasks={oneOff}
            controls={controls}
            empty="Tu pojawią się zadania jednorazowe bez daty, na dziś lub zaległe."
            onAdd={onNew}
          />
        </div>
        <div className="view-stack">
          <TaskSection
            label="W tym tygodniu"
            icon={CalendarDays}
            tasks={tasks.filter((task) => task.cadence === "weekly")}
            controls={controls}
            empty="Brak zadań tygodniowych."
          />
          <TaskSection
            label="W tym miesiącu"
            icon={CalendarRange}
            tasks={tasks.filter((task) => task.cadence === "monthly")}
            controls={controls}
            empty="Brak zadań miesięcznych."
          />
          <button className="history-link" onClick={onProgress}>
            <span>
              <span className="signal-dot" /> Zapisano dzisiaj <strong>{loggedToday}</strong>
            </span>
            <span className="history-action">
              Zobacz postęp <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
