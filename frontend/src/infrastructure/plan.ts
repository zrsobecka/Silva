import { invoke } from "@tauri-apps/api/core";
import type { Action, Snapshot } from "../features/plan/model";

export function readPlan() {
  return invoke<Snapshot>("read_plan");
}

export function updatePlan(action: Action) {
  return invoke<Snapshot>("update_plan", { action });
}
