import { towerNames, type Contribution, type ContributionDraft } from "../contributions/model";

export const cadences = {
  daily: "Codziennie",
  weekly: "Co tydzień",
  monthly: "Co miesiąc",
  once: "Jednorazowo",
  goal: "Cel długoterminowy",
} as const;

export type Cadence = keyof typeof cadences;

export type TaskDraft = {
  id?: number;
  title: string;
  category: string;
  tower?: string | null;
  cadence: Cadence;
  detail: string;
  scheduledFor: string | null;
};

export type Task = Omit<TaskDraft, "id"> & {
  id: number;
  archived: boolean;
  done: boolean;
};

export type Entry = {
  id: number;
  taskId: number;
  title: string;
  category: string;
  tower?: string | null;
  day: string;
  kind: "complete" | "step";
  note: string;
};

export type Snapshot = {
  today: string;
  focusTaskId: number | null;
  tasks: Task[];
  entries: Entry[];
  contributions: Contribution[];
};

export type Action =
  | { type: "save"; draft: TaskDraft }
  | { type: "archive"; id: number; archived: boolean }
  | { type: "complete"; id: number; done: boolean }
  | { type: "setFocus"; taskId: number | null }
  | { type: "addStep"; id: number; note: string }
  | { type: "removeStep"; id: number }
  | { type: "saveContribution"; draft: ContributionDraft }
  | { type: "removeContribution"; id: number };

const defaultCategories = ["Dom", "Gry", "Nauka", "Praca", "Ruch", "Samodzielność"];

export function allCategories(tasks: Task[]) {
  return [
    ...new Set([...defaultCategories, ...towerNames, ...tasks.map((task) => task.category)]),
  ].sort((first, second) => first.localeCompare(second, "pl"));
}

export function groupTasks(tasks: Task[]) {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const group = groups.get(task.category) ?? [];
    group.push(task);
    groups.set(task.category, group);
  }
  return [...groups].sort(([first], [second]) => first.localeCompare(second, "pl"));
}

export function isUpcoming(task: Task, today: string) {
  return task.cadence === "once" && task.scheduledFor !== null && task.scheduledFor > today;
}

export function calendarDate(day: string) {
  const [year, month, date = 1] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
}

export function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dateLabel(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pl-PL", options).format(calendarDate(day));
}

export function entryCount(count: number) {
  const last = count % 10;
  const teen = Math.floor(count / 10) % 10 === 1;
  return `${count} ${count === 1 ? "wpis" : !teen && last >= 2 && last <= 4 ? "wpisy" : "wpisów"}`;
}
