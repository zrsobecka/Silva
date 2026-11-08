import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Archive, Check, CirclePlus, RotateCcw, Trash2, X } from "lucide-react";
import { towerName } from "../contributions/model";
import {
  cadences,
  dateLabel,
  entryCount,
  type Cadence,
  type Entry,
  type Task,
  type TaskDraft,
} from "./model";

export function Modal({
  title,
  subtitle,
  busy,
  error,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      className="editor-dialog"
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className="dialog-header">
        <div>
          <span className="kicker">{subtitle}</span>
          <h2 id="dialog-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Zamknij"
          disabled={busy}
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </header>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {children}
    </dialog>
  );
}

export function TaskEditor({
  task,
  initialCadence,
  categories,
  towers,
  busy,
  error,
  onClose,
  onSave,
  onArchive,
}: {
  task?: Task;
  initialCadence: Cadence;
  categories: string[];
  towers: string[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  onArchive: (task: Task) => void;
}) {
  const [cadence, setCadence] = useState<Cadence>(task?.cadence ?? initialCadence);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    onSave({
      id: task?.id,
      title: String(fields.get("title") ?? "").trim(),
      category: String(fields.get("category") ?? "").trim(),
      tower: String(fields.get("tower") ?? "") || null,
      detail: String(fields.get("detail") ?? "").trim(),
      cadence,
      scheduledFor: String(fields.get("date") ?? "") || null,
    });
  }

  return (
    <Modal
      title={task ? "Edytuj pozycję" : "Dodaj do planu"}
      subtitle="PLAN"
      busy={busy}
      error={error}
      onClose={onClose}
    >
      <form className="editor-form" onSubmit={submit}>
        <label className="field">
          Nazwa
          <input
            name="title"
            required
            maxLength={100}
            defaultValue={task?.title}
            placeholder="np. Zrobić zakupy"
            data-initial-focus
          />
        </label>
        <div className="field-grid">
          <label className="field">
            Grupa
            <input
              name="category"
              required
              maxLength={32}
              list="silva-categories"
              defaultValue={task?.category}
              placeholder="Wybierz lub wpisz nową"
            />
            <datalist id="silva-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>
          <label className="field">
            Częstotliwość
            <select value={cadence} onChange={(event) => setCadence(event.target.value as Cadence)}>
              {Object.entries(cadences).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Aktywność w postępie
          <select
            name="tower"
            defaultValue={task?.tower ? towerName(task.tower) : ""}
            aria-describedby="task-tower-help"
          >
            <option value="">Automatycznie: aktywność lub nazwa zadania</option>
            {towers.map((tower) => (
              <option key={tower} value={tower}>
                {tower}
              </option>
            ))}
          </select>
          <span id="task-tower-help" className="form-help">
            Tutaj trafią wcześniejsze i przyszłe wpisy tego zadania. Grupa w Planie pozostaje bez
            zmian.
          </span>
        </label>
        {cadence === "once" && (
          <label className="field">
            Termin (opcjonalnie)
            <input
              name="date"
              type="date"
              min="2000-01-01"
              max="9999-12-31"
              defaultValue={task?.scheduledFor ?? ""}
            />
          </label>
        )}
        <label className="field">
          Opis lub warunek (opcjonalnie)
          <textarea
            name="detail"
            maxLength={240}
            defaultValue={task?.detail}
            rows={2}
            placeholder="np. Co najmniej 30 minut"
          />
        </label>
        {task && task.cadence !== cadence && (
          <p className="form-help">
            Wcześniejsze wpisy pozostaną w historii. Status będzie liczony dla nowej częstotliwości.
          </p>
        )}
        <div className="dialog-actions">
          {task && (
            <button
              className="quiet-button archive-button"
              type="button"
              disabled={busy}
              onClick={() => onArchive(task)}
            >
              <Archive size={17} /> Archiwizuj
            </button>
          )}
          <button
            className="quiet-button cancel-button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Anuluj
          </button>
          <button className="primary-button" type="submit" disabled={busy}>
            Zapisz
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function GoalEditor({
  task,
  entries,
  busy,
  error,
  onClose,
  onAdd,
  onRemove,
  onComplete,
}: {
  task: Task;
  entries: Entry[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onAdd: (note: string) => Promise<boolean>;
  onRemove: (id: number) => void;
  onComplete: (task: Task) => void;
}) {
  const [note, setNote] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onAdd(note.trim())) setNote("");
  }

  return (
    <Modal
      title={task.title}
      subtitle={`CEL · ${task.category.toLocaleUpperCase("pl")}`}
      busy={busy}
      error={error}
      onClose={onClose}
    >
      {task.detail && <p className="goal-description">{task.detail}</p>}
      <form className="editor-form goal-form" onSubmit={submit}>
        <label className="field">
          Co udało Ci się zrobić?
          <input
            required
            maxLength={160}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="np. Ukończony pierwszy etap"
            data-initial-focus
          />
        </label>
        <button className="primary-button" type="submit" disabled={busy || !note.trim()}>
          <CirclePlus size={17} /> Zapisz krok
        </button>
      </form>
      <div className="goal-steps">
        <h3>
          Kroki w tym celu <span className="panel-count">{entryCount(entries.length)}</span>
        </h3>
        {entries.length === 0 && (
          <p className="inline-empty">Każdy zapisany krok pojawi się też w historii postępu.</p>
        )}
        <ul className="task-list">
          {entries.map((entry) => (
            <li key={entry.id} className="task-row">
              <div className="task-copy">
                <strong>{entry.note}</strong>
                <small>{dateLabel(entry.day, { dateStyle: "medium" })}</small>
              </div>
              <button
                className="icon-button"
                title="Usuń krok"
                aria-label={`Usuń krok: ${entry.note}`}
                disabled={busy}
                onClick={() => onRemove(entry.id)}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="dialog-actions">
        <button
          className="quiet-button cancel-button"
          type="button"
          disabled={busy}
          onClick={onClose}
        >
          Zamknij
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => onComplete(task)}
        >
          {task.done ? <RotateCcw size={16} /> : <Check size={16} />}
          {task.done ? "Cofnij ukończenie" : "Oznacz cel jako ukończony"}
        </button>
      </div>
    </Modal>
  );
}
