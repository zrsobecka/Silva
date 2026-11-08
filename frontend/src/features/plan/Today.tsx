import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BrickWall,
  CalendarDays,
  CalendarRange,
  ListChecks,
  Plus,
  Target,
} from "lucide-react";
import { activityHistory, towerName } from "../contributions/model";
import { TaskRow, type TaskControls } from "./TaskRow";
import { entryCount, isUpcoming, type Snapshot, type Task } from "./model";
import logo from "../../assets/brand/silva.png";

function DailyHabits({ tasks, controls }: { tasks: Task[]; controls: TaskControls }) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  const progress = total ? done / total : 0;
  return (
    <section className="panel task-panel" aria-labelledby="daily-habits-heading">
      <div className="daily-summary">
        <div className="summary-copy">
          <span className="kicker">
            <span className="signal-dot" /> DZIENNY RYTM
          </span>
          <h2 id="daily-habits-heading">Codzienne nawyki</h2>
          <p>
            {total === 0
              ? "Dodaj nawyk, który chcesz odhaczać codziennie."
              : `${done} z ${total} wykonanych`}
          </p>
        </div>
        <div className="summary-art" aria-hidden="true">
          <img src={logo} alt="" draggable="false" />
        </div>
        {total > 0 && (
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
        )}
      </div>
      {total > 0 && (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} controls={controls} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskSection({
  label,
  icon: Icon,
  tasks,
  controls,
  empty,
  children,
}: {
  label: string;
  icon: typeof CalendarDays;
  tasks: Task[];
  controls: TaskControls;
  empty: string;
  children?: ReactNode;
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
      </div>
      {children}
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

function QuickTask({ busy, onAdd }: { busy: boolean; onAdd: (title: string) => Promise<boolean> }) {
  const [title, setTitle] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = title.trim();
    if (busy || !name) return;
    if (await onAdd(name)) setTitle("");
  }

  return (
    <form className="quick-task" onSubmit={submit}>
      <label className="field">
        Co masz do zrobienia?
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="np. Odebrać paczkę"
          maxLength={100}
          required
          readOnly={busy}
        />
      </label>
      <button className="secondary-button" type="submit" disabled={busy || !title.trim()}>
        <Plus size={16} aria-hidden="true" /> Dodaj sprawę
      </button>
    </form>
  );
}

function NextStep({
  task,
  completedTower,
  options,
  controls,
  onFocus,
}: {
  task?: Task;
  completedTower?: string;
  options: Task[];
  controls: TaskControls;
  onFocus: (taskId: number | null) => void;
}) {
  return (
    <section className="panel next-step" aria-labelledby="next-step-heading">
      <div className="panel-heading">
        <span className="heading-icon">
          <Target size={17} />
        </span>
        <h2 id="next-step-heading">Mój następny krok</h2>
      </div>
      {task && (
        <ul className="task-list">
          <TaskRow task={task} controls={controls} />
        </ul>
      )}
      <div className="today-card-body">
        {completedTower && (
          <p className="step-complete" role="status">
            Kwadrat w aktywności „{completedTower}”.
          </p>
        )}
        {options.length > 0 || task ? (
          <select
            aria-label="Następny krok na dziś"
            value={task?.id ?? ""}
            onChange={(event) => onFocus(Number(event.target.value) || null)}
            disabled={controls.busy}
          >
            <option value="">{task ? "Odepnij krok" : "Wybierz jedną rzecz na dziś"}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title} · {option.category}
              </option>
            ))}
          </select>
        ) : (
          <p>Dodaj pojedynczą sprawę, żeby wybrać pierwszy krok na dziś.</p>
        )}
      </div>
    </section>
  );
}

export function Today({
  snapshot,
  controls,
  onAddOneOff,
  onFocus,
  onProgress,
}: {
  snapshot: Snapshot;
  controls: TaskControls;
  onAddOneOff: (title: string) => Promise<boolean>;
  onFocus: (taskId: number | null) => void;
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
  const activityToday = activityHistory(
    snapshot.entries.filter((entry) => entry.day === snapshot.today),
    snapshot.contributions.filter((entry) => entry.day === snapshot.today),
  );
  const focus = tasks.find((task) => task.id === snapshot.focusTaskId);
  const focusEntry = focus?.done
    ? snapshot.entries.find(
        (entry) =>
          entry.taskId === focus.id && entry.day === snapshot.today && entry.kind === "complete",
      )
    : undefined;
  const focusOptions = tasks.filter(
    (task) =>
      task === focus ||
      (!task.done && task.cadence !== "goal" && !isUpcoming(task, snapshot.today)),
  );

  return (
    <div className="view-stack">
      <div className="today-grid">
        <NextStep
          task={focus}
          completedTower={
            focusEntry ? towerName(focusEntry.tower ?? focusEntry.category) : undefined
          }
          options={focusOptions}
          controls={controls}
          onFocus={onFocus}
        />
        <section className="panel today-activity" aria-labelledby="today-activity-heading">
          <div className="panel-heading">
            <span className="heading-icon">
              <BrickWall size={17} />
            </span>
            <h2 id="today-activity-heading">Zrobione dzisiaj</h2>
            <span className="panel-count">{entryCount(activityToday.length)}</span>
          </div>
          <div className="today-card-body">
            {activityToday.length > 0 ? (
              <ul className="today-activity-list">
                {activityToday.slice(0, 2).map((entry) => (
                  <li key={`${entry.kind}:${entry.id}`}>
                    {entry.kind === "step" ? entry.note : entry.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Tu zobaczysz odhaczone zadania, kroki w celach i dodane wkłady.</p>
            )}
            <button className="quiet-button history-action" onClick={onProgress}>
              Zobacz postęp <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
      <div className="today-grid">
        <div className="view-stack">
          <TaskSection
            label="Pojedyncze sprawy"
            icon={ListChecks}
            tasks={oneOff}
            controls={controls}
            empty="Nie masz dziś żadnych pojedynczych spraw na liście."
          >
            <QuickTask busy={controls.busy} onAdd={onAddOneOff} />
          </TaskSection>
        </div>
        <div className="view-stack">
          <DailyHabits tasks={daily} controls={controls} />
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
        </div>
      </div>
    </div>
  );
}
