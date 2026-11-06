CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly', 'once', 'goal')),
    detail TEXT NOT NULL DEFAULT '',
    scheduled_for TEXT,
    archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
);

CREATE TABLE entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    day TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('complete', 'step')),
    period TEXT,
    note TEXT NOT NULL DEFAULT '',
    UNIQUE (task_id, period),
    CHECK ((kind = 'complete' AND period IS NOT NULL) OR (kind = 'step' AND period IS NULL))
);

PRAGMA user_version = 1;
