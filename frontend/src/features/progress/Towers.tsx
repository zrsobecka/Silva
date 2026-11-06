import { useLayoutEffect, useRef, useState } from "react";
import { BrickWall, Plus } from "lucide-react";
import { brickCount, metricTotals, type Contribution, type Tower } from "../contributions/model";
import { cadences } from "../plan/model";
import { ActivityRows } from "./ActivityRows";

const visibleBricks = 8;

export function Towers({
  towers,
  onAdd,
  onEdit,
  onLink,
}: {
  towers: Map<string, Tower>;
  onAdd: (category: string) => void;
  onEdit: (entry: Contribution) => void;
  onLink: (link: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const active = towers.get(selected);

  useLayoutEffect(() => {
    const title = heading.current;
    if (selected && title && title.getBoundingClientRect().bottom > window.innerHeight - 90) {
      title.focus({ preventScroll: true });
      title.scrollIntoView({ block: "start" });
    }
  }, [selected]);

  return (
    <section className="panel towers-panel" aria-labelledby="tower-heading">
      <div className="chart-header">
        <div>
          <span className="kicker">
            <BrickWall size={15} /> Cała historia
          </span>
          <h2 id="tower-heading">Wieże postępu</h2>
          <p>Każdy wpis to jedna cegiełka. Wybierz wieżę, żeby zobaczyć jej wpisy.</p>
        </div>
      </div>
      <div className="tower-grid">
        {[...towers].map(([key, tower]) => {
          const count = tower.entries.length;
          const extra = Math.max(0, count - visibleBricks);
          const totals = metricTotals(tower.metrics, tower.name);
          return (
            <button
              className="tower-card"
              key={key}
              aria-expanded={selected === key}
              aria-controls={selected === key ? "tower-entries" : undefined}
              onClick={() => {
                setSelected(selected === key ? "" : key);
                setExpanded(false);
              }}
            >
              <span className="tower-stack" aria-hidden="true">
                {extra > 0 && <span className="tower-overflow">+{extra}</span>}
                {Array.from({ length: Math.min(count, visibleBricks) }, (_, index) => (
                  <span className="tower-brick" key={index} />
                ))}
                {count === 0 && <span className="tower-brick tower-empty" />}
              </span>
              <strong>{tower.name}</strong>
              <span className="tower-count">{brickCount(count)}</span>
              {totals.length > 0 && <span className="tower-metrics">{totals.join(" · ")}</span>}
            </button>
          );
        })}
      </div>
      {active && (
        <section
          className="tower-entries"
          id="tower-entries"
          aria-labelledby="tower-entries-heading"
        >
          <div className="tower-entries-header">
            <h3 id="tower-entries-heading" ref={heading} tabIndex={-1}>
              {active.name}
            </h3>
            <button className="secondary-button" onClick={() => onAdd(active.name)}>
              <Plus size={16} /> Dodaj do wieży
            </button>
          </div>
          {active.entries.length > 0 ? (
            <ActivityRows
              entries={expanded ? active.entries : active.entries.slice(0, 10)}
              onEdit={onEdit}
              onLink={onLink}
            />
          ) : (
            <p className="inline-empty">Tutaj pojawi się pierwszy wkład w ten obszar.</p>
          )}
          {active.entries.length > 10 && (
            <button className="quiet-button show-more" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Pokaż mniej" : "Pokaż wszystkie cegiełki"}
            </button>
          )}
          {active.tasks.length > 0 && (
            <section aria-labelledby="tower-plan-heading">
              <h4 id="tower-plan-heading" className="tower-plan-heading">
                Z planu
              </h4>
              <ul className="task-list">
                {active.tasks.map((task) => (
                  <li className="task-row" key={task.id}>
                    <div className="task-copy">
                      <strong>{task.title}</strong>
                      <small>{cadences[task.cadence]}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}
    </section>
  );
}
