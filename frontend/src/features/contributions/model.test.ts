import { expect, it } from "vitest";
import type { Task } from "../plan/model";
import { summarize } from "../progress/analytics";
import { activityHistory, groupTowers, metricTotals } from "./model";

it("counts each contribution once, includes earlier plan entries and sums LoL queues independently", () => {
  const history = activityHistory(
    [
      {
        id: 1,
        taskId: 1,
        title: "Zagrać",
        category: "LoL",
        kind: "complete",
        day: "2026-10-28",
        note: "",
      },
    ],
    [
      {
        id: 1,
        title: "Trzy mecze",
        category: "League of Legends",
        day: "2026-11-05",
        link: null,
        metrics: { soloQueue: 2, flex: 1 },
      },
      {
        id: 2,
        title: "Dwa mecze",
        category: "league of legends",
        day: "2026-11-06",
        link: null,
        metrics: { flex: 2 },
      },
      {
        id: 3,
        title: "Ugotowałam zupę",
        category: "Gotowanie",
        day: "2026-11-06",
        link: null,
        metrics: {},
      },
    ],
  );
  const towers = groupTowers(history, []);
  expect(towers.get("league of legends")?.entries).toHaveLength(3);
  expect(towers.get("league of legends")?.metrics).toEqual({ soloQueue: 2, flex: 3 });
  expect(towers.get("gotowanie")?.entries).toHaveLength(1);
  expect(summarize(history, "2026-11", "LoL").shown).toHaveLength(2);
  expect(metricTotals({}, "League of Legends")).toEqual(["0 Solo Queue", "0 Flex"]);
});

it("shows existing plan groups and their tasks before any contribution, while old entries stay in their recorded group", () => {
  const task: Task = {
    id: 1,
    title: "Ugotować coś",
    category: "Dom",
    cadence: "weekly",
    detail: "",
    scheduledFor: null,
    archived: false,
    done: false,
  };
  const game: Task = { ...task, id: 2, title: "Zagrać w Genshin Impact", category: "Gry" };
  const history = activityHistory(
    [
      {
        id: 1,
        taskId: game.id,
        title: game.title,
        category: game.category,
        kind: "complete",
        day: "2026-11-05",
        note: "",
      },
    ],
    [],
  );
  const towers = groupTowers(history, [task, game]);
  expect(towers.get("dom")).toMatchObject({ name: "Dom", tasks: [task], entries: [] });
  expect(towers.get("gry")).toMatchObject({ name: "Gry", tasks: [game], entries: history });
  expect(towers.get("genshin impact")?.entries).toHaveLength(0);
  expect(Array.from(towers.values()).flatMap((tower) => tower.entries)).toEqual(history);

  const assigned = { ...game, tower: "Genshin Impact" };
  const assignedHistory = history.map((entry) => ({ ...entry, tower: assigned.tower }));
  const afterAssignment = groupTowers(assignedHistory, [task, assigned]);
  expect(afterAssignment.get("gry")).toMatchObject({ name: "Gry", entries: [] });
  expect(afterAssignment.get("genshin impact")).toMatchObject({
    tasks: [assigned],
    entries: assignedHistory,
  });
  expect(summarize(assignedHistory, "2026-11", "Gry").shown).toEqual(assignedHistory);
});
