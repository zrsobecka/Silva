import { useState } from "react";
import { Archive, Layers3, Plus } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";
import { TaskRow, type TaskControls } from "./TaskRow";
import { groupTasks, type Task } from "./model";

export function Plan({
  tasks,
  controls,
  onNew,
}: {
  tasks: Task[];
  controls: TaskControls;
  onNew: () => void;
}) {
  const [archived, setArchived] = useState(false);
  const [category, setCategory] = useState("");
  const available = tasks.filter((task) => task.archived === archived);
  const groups = groupTasks(available);
  const shown = groups.some(([name]) => name === category)
    ? groups.filter(([name]) => name === category)
    : groups;
  const selected = shown.length === 1 && shown[0][0] === category ? category : "";

  return (
    <div className="view-stack">
      <div className="panel-toolbar">
        <div className="segmented" aria-label="Widok planu">
          <button
            aria-pressed={!archived}
            onClick={() => {
              setArchived(false);
              setCategory("");
            }}
          >
            <Layers3 size={16} /> Aktywne
          </button>
          <button
            aria-pressed={archived}
            onClick={() => {
              setArchived(true);
              setCategory("");
            }}
          >
            <Archive size={16} /> Archiwum
          </button>
        </div>
        {groups.length > 0 && (
          <label className="filter">
            <span>Grupa</span>
            <select value={selected} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Wszystkie grupy</option>
              {groups.map(([name]) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {shown.length === 0 && (
        <div className="panel empty-state">
          <Archive size={26} />
          <h2>{archived ? "Archiwum jest puste" : "Zaplanuj pierwszy krok"}</h2>
          <p>
            {archived
              ? "Zarchiwizowane zadania zachowują swoją historię i można je przywrócić."
              : "Dodaj zadanie, nawyk albo cel."}
          </p>
          {!archived && (
            <button className="primary-button" onClick={onNew}>
              <Plus size={17} /> Dodaj zadanie
            </button>
          )}
        </div>
      )}
      {shown.map(([name, group]) => (
        <section className="panel task-panel" key={name}>
          <div className="panel-heading">
            <CategoryIcon category={name} />
            <h2>{name}</h2>
            <span className="panel-count">{group.length}</span>
          </div>
          <ul className="task-list">
            {group.map((task) => (
              <TaskRow key={task.id} task={task} controls={controls} showCadence />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
