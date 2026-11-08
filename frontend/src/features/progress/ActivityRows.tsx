import { BrickWall, Check, ExternalLink, Footprints, Pencil } from "lucide-react";
import {
  activityName,
  metricTotals,
  noActivityLabel,
  type ActivityEntry,
  type Contribution,
} from "../contributions/model";
import { CategoryIcon } from "../plan/CategoryIcon";
import { dateLabel } from "../plan/model";

export function ActivityRows({
  entries,
  onEdit,
  onLink,
}: {
  entries: ActivityEntry[];
  onEdit: (entry: Contribution) => void;
  onLink: (link: string) => void;
}) {
  return (
    <ul className="task-list">
      {entries.map((entry) => {
        const manual = entry.kind === "contribution";
        const activity = activityName(entry);
        const link = manual ? entry.link : null;
        const details = [
          ...(entry.kind === "step" ? [entry.title] : []),
          ...(entry.kind === "step" || activity !== entry.title
            ? [activity || noActivityLabel]
            : []),
          ...(manual ? metricTotals(entry.metrics) : []),
        ];
        return (
          <li className="task-row activity-row" key={`${entry.kind}:${entry.id}`}>
            <CategoryIcon category={activity} />
            <div className="task-copy">
              <strong>{entry.kind === "step" ? entry.note : entry.title}</strong>
              {details.length > 0 && <small>{details.join(" · ")}</small>}
            </div>
            <span className="entry-kind" aria-hidden="true">
              {manual ? (
                <BrickWall size={15} />
              ) : entry.kind === "step" ? (
                <Footprints size={15} />
              ) : (
                <Check size={15} />
              )}
            </span>
            <time dateTime={entry.day}>
              {dateLabel(entry.day, { day: "numeric", month: "short" })}
            </time>
            {link && (
              <button
                className="icon-button"
                title="Otwórz link"
                aria-label={`Otwórz link do wpisu „${entry.title}”`}
                onClick={() => onLink(link)}
              >
                <ExternalLink size={16} />
              </button>
            )}
            {manual && (
              <button
                className="icon-button"
                title="Edytuj wkład"
                aria-label={`Edytuj wkład „${entry.title}”`}
                onClick={() => onEdit(entry)}
              >
                <Pencil size={16} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
