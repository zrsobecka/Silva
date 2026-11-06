import type { Entry, Task } from "../plan/model";

const towerSettings = {
  Oddychanie: ["minutes"],
  Programowanie: ["questions", "scripts", "tutorials", "minutes"],
  "League of Legends": ["soloQueue", "flex"],
  "Genshin Impact": ["minutes"],
  "Czytanie książek": ["pages", "minutes"],
  "Jazda samochodem": ["minutes"],
  Gotowanie: [],
} as const satisfies Record<string, readonly Metric[]>;

const aliases: Record<string, string> = {
  lol: "League of Legends",
  genshin: "Genshin Impact",
  czytanie: "Czytanie książek",
  "jazda autem": "Jazda samochodem",
};

const metricLabels = {
  minutes: "Minuty",
  questions: "Pytania",
  scripts: "Skrypty",
  tutorials: "Tutoriale",
  soloQueue: "Gry Solo Queue",
  flex: "Gry Flex",
  pages: "Strony",
};

type Metric = keyof typeof metricLabels;
export type Metrics = Partial<Record<Metric, number>>;

export type ContributionDraft = {
  id?: number;
  title: string;
  category: string;
  day: string;
  link: string | null;
  metrics: Metrics;
};

export type Contribution = Omit<ContributionDraft, "id"> & { id: number };
export type ActivityEntry = Entry | (Contribution & { kind: "contribution" });
export type Tower = { name: string; tasks: Task[]; entries: ActivityEntry[]; metrics: Metrics };

export const towerNames = Object.keys(towerSettings);

export function categoryKey(name: string) {
  return name.trim().toLocaleLowerCase("pl");
}

export function towerName(name: string) {
  const key = categoryKey(name);
  return (
    towerNames.find((tower) => categoryKey(tower) === key) ??
    (Object.hasOwn(aliases, key) ? aliases[key] : name.trim())
  );
}

export function categoryMetrics(category: string): readonly Metric[] {
  const name = towerName(category);
  return Object.hasOwn(towerSettings, name)
    ? towerSettings[name as keyof typeof towerSettings]
    : [];
}

export function activityHistory(entries: Entry[], contributions: Contribution[]): ActivityEntry[] {
  return [
    ...contributions.map((entry) => ({ ...entry, kind: "contribution" as const })),
    ...entries,
  ].sort((first, second) => second.day.localeCompare(first.day));
}

export function groupTowers(history: ActivityEntry[], tasks: Task[]) {
  const towers = new Map<string, Tower>();

  function ensureTower(category: string) {
    const name = towerName(category);
    const key = categoryKey(name);
    const tower = towers.get(key) ?? { name, tasks: [], entries: [], metrics: {} };
    towers.set(key, tower);
    return tower;
  }

  towerNames.forEach(ensureTower);
  for (const task of tasks) {
    const group = ensureTower(task.category);
    const tower = task.tower ? ensureTower(task.tower) : group;
    if (!task.archived) tower.tasks.push(task);
  }
  for (const entry of history) {
    const group = ensureTower(entry.category);
    const tower = entry.kind !== "contribution" && entry.tower ? ensureTower(entry.tower) : group;
    tower.entries.push(entry);
    if (entry.kind === "contribution") {
      for (const metric of Object.keys(entry.metrics) as Metric[]) {
        tower.metrics[metric] = (tower.metrics[metric] ?? 0) + (entry.metrics[metric] ?? 0);
      }
    }
  }
  return towers;
}

const numberFormat = new Intl.NumberFormat("pl-PL");

function counted(count: number, forms: [string, string, string]) {
  const last = count % 10;
  const teen = Math.floor(count / 10) % 10 === 1;
  return `${numberFormat.format(count)} ${forms[count === 1 ? 0 : !teen && last >= 2 && last <= 4 ? 1 : 2]}`;
}

export function brickCount(count: number) {
  return counted(count, ["cegiełka", "cegiełki", "cegiełek"]);
}

export function metricFields(category: string) {
  return categoryMetrics(category).map((metric) => ({ metric, label: metricLabels[metric] }));
}

export function metricTotals(metrics: Metrics, category?: string) {
  const formats: Record<Metric, (count: number) => string> = {
    minutes: (count) => `${numberFormat.format(count)} min`,
    questions: (count) => counted(count, ["pytanie", "pytania", "pytań"]),
    scripts: (count) => counted(count, ["skrypt", "skrypty", "skryptów"]),
    tutorials: (count) => counted(count, ["tutorial", "tutoriale", "tutoriali"]),
    soloQueue: (count) => `${numberFormat.format(count)} Solo Queue`,
    flex: (count) => `${numberFormat.format(count)} Flex`,
    pages: (count) => counted(count, ["strona", "strony", "stron"]),
  };
  return (Object.keys(formats) as Metric[]).flatMap((metric) => {
    const count = metrics[metric];
    const showZero =
      category === "League of Legends" && (metric === "soloQueue" || metric === "flex");
    return count || showZero ? [formats[metric](count ?? 0)] : [];
  });
}
