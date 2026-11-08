import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  BrickWall,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Layers3,
  Plus,
  ShieldCheck,
} from "lucide-react";
import logo from "../assets/brand/silva.png";
import { ContributionEditor } from "../features/contributions/ContributionEditor";
import {
  activityOptions,
  categoryKey,
  towerNames,
  type Contribution,
} from "../features/contributions/model";
import { GoalEditor, TaskEditor } from "../features/plan/Editors";
import { Plan } from "../features/plan/Plan";
import { Today } from "../features/plan/Today";
import {
  dateLabel,
  type Action,
  type Cadence,
  type PlanGroup,
  type Snapshot,
  type Task,
} from "../features/plan/model";
import { Progress } from "../features/progress/Progress";
import { openContributionLink, readPlan, updatePlan } from "../infrastructure/plan";

const views = {
  today: {
    label: "Dzisiaj",
    icon: CalendarDays,
    description: "Nawyki, sprawy bieżące i zadania w toku.",
  },
  plan: {
    label: "Plan",
    icon: Layers3,
    description: "Zaplanuj zadania, nawyki, cele i sprawy związane z pracą.",
  },
  progress: {
    label: "Postęp",
    icon: ChartNoAxesCombined,
    description: "Zobacz, jak codzienne działania składają się na większy postęp.",
  },
} as const;

type View = keyof typeof views;
type Editor =
  | { type: "task"; id?: number; cadence?: Cadence; activity?: string; group?: PlanGroup }
  | { type: "goal"; id: number }
  | { type: "contribution"; entry?: Contribution; category?: string }
  | null;

function errorMessage(error: unknown) {
  return typeof error === "string"
    ? error
    : "Silva nie mogła odczytać lub zapisać danych. Spróbuj ponownie.";
}

export function App() {
  const [view, setView] = useState<View>("today");
  const [planByGroup, setPlanByGroup] = useState(true);
  const [editor, setEditor] = useState<Editor>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const revision = useRef(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (pending.current) return;
    const version = ++revision.current;
    try {
      const data = await readPlan();
      if (!signal?.aborted && version === revision.current) {
        setSnapshot(data);
      }
    } catch (error) {
      if (!signal?.aborted && version === revision.current) setError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    const lifecycle = new AbortController();
    const check = () => void refresh(lifecycle.signal);
    const initial = window.setTimeout(check, 0);
    const timer = window.setInterval(check, 30_000);
    window.addEventListener("focus", check);
    return () => {
      lifecycle.abort();
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openNew = useCallback(() => {
    setError("");
    setEditor({ type: "task" });
  }, []);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() === "n" &&
        snapshot &&
        !editor
      ) {
        event.preventDefault();
        openNew();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [editor, openNew, snapshot]);

  function navigate(next: View) {
    setError("");
    setView(next);
  }

  async function run(action: Action, message: string) {
    if (pending.current) return false;
    pending.current = true;
    revision.current++;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setSnapshot(await updatePlan(action));
      setNotice(message);
      return true;
    } catch (error) {
      setError(errorMessage(error));
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function closeEditor() {
    setEditor(null);
    setError("");
  }

  function openEditor(next: Editor) {
    setError("");
    setEditor(next);
  }

  function complete(task: Task) {
    void run(
      { type: "complete", id: task.id, done: !task.done },
      task.done ? "Cofnięto wykonanie." : "Zapisano w historii.",
    );
  }

  const activeTask =
    editor &&
    editor.type !== "contribution" &&
    snapshot?.tasks.find((task) => task.id === editor.id);
  const activities = snapshot ? activityOptions(snapshot) : [];
  const activitySuggestions = [
    ...new Map(
      [...towerNames, ...activities.filter(Boolean)].map((name) => [categoryKey(name), name]),
    ).values(),
  ].sort((a, b) => a.localeCompare(b, "pl"));
  const controls = {
    today: snapshot?.today ?? "",
    busy,
    onComplete: complete,
    onEdit: (task: Task) => openEditor({ type: "task", id: task.id }),
    onGoal: (task: Task) => openEditor({ type: "goal", id: task.id }),
    onRestore: (task: Task) =>
      void run({ type: "archive", id: task.id, archived: false }, "Przywrócono do planu."),
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Przejdź do treści
      </a>
      <aside className="sidebar">
        <div className="wordmark">
          <img src={logo} alt="" width="46" height="46" draggable="false" />
          <div>
            <strong>Silva</strong>
            <span>PERSONAL COMMAND CENTER</span>
          </div>
        </div>
        <div className="side-rule" />
        <span className="side-label">PRZESTRZEŃ</span>
        <nav className="navigation" aria-label="Główna nawigacja">
          {(Object.keys(views) as View[]).map((key) => {
            const { icon: Icon, label } = views[key];
            return (
              <button
                key={key}
                aria-current={view === key ? "page" : undefined}
                onClick={() => navigate(key)}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
                <ChevronRight className="nav-arrow" size={15} />
              </button>
            );
          })}
        </nav>
        <div className="side-footer">
          <ShieldCheck size={17} />
          <div>
            <strong>Dane lokalne</strong>
            <span>Na tym komputerze</span>
          </div>
        </div>
      </aside>
      <main id="main" className="workspace" tabIndex={-1}>
        <header className="page-header">
          <div>
            <div className="kicker page-kicker">
              <Activity size={15} />{" "}
              {snapshot
                ? dateLabel(snapshot.today, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "SILVA"}
            </div>
            <h1>{views[view].label}</h1>
            <p>{views[view].description}</p>
          </div>
          <div className="header-actions">
            <button
              className={`${view === "plan" ? "primary-button" : "secondary-button"} header-add`}
              onClick={openNew}
              disabled={!snapshot}
              title="Dodaj zadanie (Ctrl+N)"
            >
              <Plus size={18} /> Dodaj zadanie
            </button>
            <button
              className={`${view === "plan" ? "secondary-button" : "primary-button"} header-add`}
              disabled={!snapshot}
              onClick={() => openEditor({ type: "contribution" })}
            >
              <BrickWall size={18} /> Dodaj wkład
            </button>
          </div>
        </header>
        {!editor && error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            {!snapshot && (
              <button
                className="quiet-button"
                onClick={() => {
                  setError("");
                  void refresh();
                }}
              >
                Spróbuj ponownie
              </button>
            )}
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            <Check size={17} /> {notice}
            <button className="quiet-button" onClick={() => setNotice("")}>
              Zamknij
            </button>
          </div>
        )}
        {!snapshot && !error && (
          <p className="panel loading" role="status">
            Wczytywanie Twojego planu…
          </p>
        )}
        {snapshot && view === "today" && (
          <Today
            snapshot={snapshot}
            controls={controls}
            onAddOneOff={(title) =>
              run(
                {
                  type: "save",
                  draft: {
                    title,
                    category: "",
                    tower: "",
                    cadence: "once",
                    detail: "",
                    scheduledFor: null,
                  },
                },
                "Dodano pojedynczą sprawę.",
              )
            }
            onFocus={(taskId) =>
              void run(
                { type: "setFocus", taskId },
                taskId === null ? "Usunięto przypięcie." : "Przypięto krok na dziś.",
              )
            }
            onProgress={() => navigate("progress")}
          />
        )}
        {snapshot && view === "plan" && (
          <Plan
            tasks={snapshot.tasks}
            activities={activities}
            byGroup={planByGroup}
            controls={controls}
            onNew={(cadence, activity, group) =>
              openEditor({ type: "task", cadence, activity, group })
            }
            onGroupChange={setPlanByGroup}
          />
        )}
        {snapshot && view === "progress" && (
          <Progress
            snapshot={snapshot}
            activities={activities}
            onToday={() => navigate("today")}
            onAdd={(category) => openEditor({ type: "contribution", category })}
            onEdit={(entry) => openEditor({ type: "contribution", entry })}
            onLink={(link) => {
              setError("");
              void openContributionLink(link).catch((error: unknown) =>
                setError(errorMessage(error)),
              );
            }}
          />
        )}
      </main>
      {snapshot && editor?.type === "task" && (
        <TaskEditor
          key={editor.id ?? "new"}
          task={activeTask || undefined}
          initialCadence={editor.cadence ?? "once"}
          initialActivity={editor.activity}
          initialGroup={editor.group}
          activities={activitySuggestions}
          busy={busy}
          error={error}
          onClose={closeEditor}
          onSave={async (draft) => {
            if (await run({ type: "save", draft }, "Zapisano w planie.")) closeEditor();
          }}
          onArchive={async (task) => {
            if (
              await run(
                { type: "archive", id: task.id, archived: true },
                "Przeniesiono do archiwum.",
              )
            )
              closeEditor();
          }}
        />
      )}
      {snapshot && editor?.type === "goal" && activeTask && (
        <GoalEditor
          task={activeTask}
          entries={snapshot.entries.filter(
            (entry) => entry.taskId === activeTask.id && entry.kind === "step",
          )}
          busy={busy}
          error={error}
          onClose={closeEditor}
          onAdd={(note) =>
            run({ type: "addStep", id: activeTask.id, note }, "Zapisano krok w historii.")
          }
          onRemove={(id) => {
            void run({ type: "removeStep", id }, "Usunięto krok.");
          }}
          onComplete={complete}
        />
      )}
      {snapshot && editor?.type === "contribution" && (
        <ContributionEditor
          entry={editor.entry}
          initialCategory={editor.category}
          categories={activitySuggestions}
          today={snapshot.today}
          busy={busy}
          error={error}
          onClose={closeEditor}
          onSave={async (draft) => {
            const message = draft.id
              ? "Zapisano zmiany we wkładzie."
              : `Dodano wkład do aktywności „${draft.category}”.`;
            if (await run({ type: "saveContribution", draft }, message)) closeEditor();
          }}
          onRemove={async (id) => {
            if (await run({ type: "removeContribution", id }, "Usunięto wkład i jego kwadrat."))
              closeEditor();
          }}
        />
      )}
    </div>
  );
}
