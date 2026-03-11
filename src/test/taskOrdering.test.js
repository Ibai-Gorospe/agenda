import { describe, expect, it } from "vitest";
import {
  assignOrderedTaskPositions,
  getNextTaskPosition,
  replaceTasksForDate,
} from "../taskOrdering";

describe("getNextTaskPosition", () => {
  it("returns 0 for an empty list", () => {
    expect(getNextTaskPosition()).toBe(0);
  });

  it("returns the next available position after the current max", () => {
    expect(getNextTaskPosition([
      { id: "task-1", position: 2 },
      { id: "task-2", position: 7 },
      { id: "task-3", position: 4 },
    ])).toBe(8);
  });
});

describe("assignOrderedTaskPositions", () => {
  it("recalculates positions sequentially while preserving the provided order", () => {
    expect(assignOrderedTaskPositions([
      { id: "task-2", text: "Segundo", position: 9 },
      { id: "task-1", text: "Primero", position: 3 },
    ])).toEqual([
      { id: "task-2", text: "Segundo", position: 0 },
      { id: "task-1", text: "Primero", position: 1 },
    ]);
  });
});

describe("replaceTasksForDate", () => {
  it("updates only the targeted date in the task map", () => {
    expect(replaceTasksForDate({
      "2026-03-10": [{ id: "task-1", position: 0 }],
      "2026-03-11": [{ id: "task-2", position: 4 }],
    }, "2026-03-11", [
      { id: "task-2", position: 0 },
      { id: "task-1", position: 1 },
    ])).toEqual({
      "2026-03-10": [{ id: "task-1", position: 0 }],
      "2026-03-11": [
        { id: "task-2", position: 0 },
        { id: "task-1", position: 1 },
      ],
    });
  });
});
