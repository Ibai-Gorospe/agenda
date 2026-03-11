import { describe, expect, it } from "vitest";
import { toggleSubtaskById, withToggledSubtask } from "../taskSubtasks";

describe("toggleSubtaskById", () => {
  it("toggles only the subtask with the matching id", () => {
    expect(toggleSubtaskById([
      { id: "sub-1", text: "Primera", done: false },
      { id: "sub-2", text: "Segunda", done: true },
    ], "sub-1")).toEqual([
      { id: "sub-1", text: "Primera", done: true },
      { id: "sub-2", text: "Segunda", done: true },
    ]);
  });
});

describe("withToggledSubtask", () => {
  it("returns a task copy with the matching subtask toggled", () => {
    expect(withToggledSubtask({
      id: "task-1",
      text: "Principal",
      subtasks: [
        { id: "sub-1", text: "Primera", done: false },
        { id: "sub-2", text: "Segunda", done: false },
      ],
    }, "sub-2")).toEqual({
      id: "task-1",
      text: "Principal",
      subtasks: [
        { id: "sub-1", text: "Primera", done: false },
        { id: "sub-2", text: "Segunda", done: true },
      ],
    });
  });
});
