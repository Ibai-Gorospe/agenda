import { describe, expect, it } from "vitest";
import { replaceTaskById, upsertTaskById } from "../taskCollections";

describe("replaceTaskById", () => {
  it("replaces only the task with the matching id", () => {
    expect(replaceTaskById([
      { id: "task-1", text: "Primera", position: 0 },
      { id: "task-2", text: "Segunda", position: 1 },
    ], { id: "task-2", text: "Actualizada", position: 1 })).toEqual([
      { id: "task-1", text: "Primera", position: 0 },
      { id: "task-2", text: "Actualizada", position: 1 },
    ]);
  });
});

describe("upsertTaskById", () => {
  it("replaces an existing task without changing the list length", () => {
    expect(upsertTaskById([
      { id: "task-1", text: "Primera", position: 0 },
      { id: "task-2", text: "Segunda", position: 1 },
    ], { id: "task-1", text: "Primera editada", position: 0 })).toEqual([
      { id: "task-1", text: "Primera editada", position: 0 },
      { id: "task-2", text: "Segunda", position: 1 },
    ]);
  });

  it("appends the task when the id does not exist", () => {
    expect(upsertTaskById([
      { id: "task-1", text: "Primera", position: 0 },
    ], { id: "task-2", text: "Nueva", position: 1 })).toEqual([
      { id: "task-1", text: "Primera", position: 0 },
      { id: "task-2", text: "Nueva", position: 1 },
    ]);
  });
});
