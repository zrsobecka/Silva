import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../plan/Editors";
import { dateLabel } from "../plan/model";
import {
  categoryKey,
  metricFields,
  towerName,
  type Contribution,
  type ContributionDraft,
  type Metrics,
} from "./model";

export function ContributionEditor({
  entry,
  initialCategory,
  categories,
  today,
  busy,
  error,
  onClose,
  onSave,
  onRemove,
}: {
  entry?: Contribution;
  initialCategory?: string;
  categories: string[];
  today: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (draft: ContributionDraft) => void;
  onRemove: (id: number) => void;
}) {
  const [category, setCategory] = useState(entry?.category ?? initialCategory ?? "");
  const [day, setDay] = useState(entry?.day ?? today);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const name = towerName(category);
  const fields = metricFields(name);
  const validDay = day.length === 10 && day >= "2000-01-01" && day <= today;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const metrics: Metrics = {};
    for (const { metric } of fields) {
      const value = form.get(metric);
      if (value) metrics[metric] = Number(value);
    }
    onSave({
      id: entry?.id,
      title: String(form.get("title") ?? "").trim(),
      category: name,
      day,
      link: String(form.get("link") ?? "").trim() || null,
      metrics,
    });
  }

  return (
    <Modal
      title={entry ? "Edytuj wkład" : "Dodaj wkład"}
      subtitle="WIEŻE POSTĘPU"
      busy={busy}
      error={error}
      onClose={onClose}
    >
      <form className="editor-form" onSubmit={submit}>
        <label className="field">
          Co zrobiłaś?
          <input
            name="title"
            required
            maxLength={160}
            placeholder="np. Napisałam skrypt do porządkowania plików"
            defaultValue={entry?.title}
            data-initial-focus
          />
        </label>
        <div className="field-grid">
          <label className="field">
            Obszar
            <input
              name="category"
              required
              maxLength={32}
              list="contribution-categories"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Wybierz lub wpisz nowy"
            />
            <datalist id="contribution-categories">
              {categories.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </label>
          <label className="field">
            {validDay ? `Data · ${dateLabel(day, { dateStyle: "long" })}` : "Data"}
            <input
              name="day"
              type="date"
              required
              min="2000-01-01"
              max={today}
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </label>
        </div>
        {fields.length > 0 && (
          <fieldset className="contribution-metrics" key={categoryKey(name)}>
            <legend>Ilości (opcjonalnie)</legend>
            <div className="field-grid">
              {fields.map(({ metric, label }) => (
                <label className="field" key={metric}>
                  {label}
                  <input
                    name={metric}
                    type="number"
                    min={1}
                    max={999999}
                    step={1}
                    defaultValue={
                      entry && categoryKey(towerName(entry.category)) === categoryKey(name)
                        ? entry.metrics[metric]
                        : undefined
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className="field">
          Link (opcjonalnie)
          <input
            name="link"
            type="url"
            maxLength={2048}
            placeholder="https://…"
            defaultValue={entry?.link ?? ""}
          />
        </label>
        <p className="form-help">
          Jeden wpis dodaje jeden kwadrat. Podane ilości sumują się osobno.
        </p>
        {entry && confirmRemoval ? (
          <div className="dialog-actions contribution-remove">
            <p>Usunąć wpis wraz z jego kwadratem i ilościami?</p>
            <button
              className="quiet-button"
              type="button"
              disabled={busy}
              onClick={() => setConfirmRemoval(false)}
            >
              Zachowaj wpis
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => onRemove(entry.id)}
            >
              Usuń wpis
            </button>
          </div>
        ) : (
          <div className="dialog-actions">
            {entry && (
              <button
                className="quiet-button archive-button"
                type="button"
                disabled={busy}
                onClick={() => setConfirmRemoval(true)}
              >
                <Trash2 size={16} /> Usuń
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
              Zapisz wkład
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
