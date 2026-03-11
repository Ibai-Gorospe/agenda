import { describe, expect, it } from "vitest";
import { buildTaskDeletePlan, TASK_DELETE_MODES } from "../taskDeletion";

describe("buildTaskDeletePlan", () => {
  it("keeps a recurring series alive when deleting the only materialized occurrence", () => {
    const plan = buildTaskDeletePlan({
      "2026-03-11": [{
        id: "task-1",
        text: "Creatina",
        done: false,
        recurrence: "daily",
        position: 0,
        seriesId: "series-1",
        scheduledDate: "2026-03-11",
      }],
    }, "2026-03-11", "task-1");

    expect(plan.removedTasks).toHaveLength(1);
    expect(plan.addedTasks).toHaveLength(1);
    expect(plan.nextState["2026-03-11"]).toEqual([]);
    expect(plan.nextState["2026-03-12"][0]).toEqual(expect.objectContaining({
      text: "Creatina",
      recurrence: "daily",
      scheduledDate: "2026-03-12",
      deletedDates: ["2026-03-11"],
    }));
  });

  it("marks only one recurring occurrence as deleted when siblings exist", () => {
    const plan = buildTaskDeletePlan({
      "2026-03-10": [{
        id: "task-1",
        text: "Vitamina D3 + K2",
        done: false,
        recurrence: "daily",
        position: 0,
        seriesId: "series-1",
        scheduledDate: "2026-03-10",
      }],
      "2026-03-11": [{
        id: "task-2",
        text: "Vitamina D3 + K2",
        done: false,
        recurrence: "daily",
        position: 0,
        seriesId: "series-1",
        scheduledDate: "2026-03-11",
      }],
    }, "2026-03-10", "task-1");

    expect(plan.upsertTasks).toEqual([
      expect.objectContaining({
        date: "2026-03-11",
        task: expect.objectContaining({ deletedDates: ["2026-03-10"] }),
      }),
    ]);
    expect(plan.nextState["2026-03-10"]).toEqual([]);
  });

  it("cuts a recurring series from the selected occurrence onward", () => {
    const plan = buildTaskDeletePlan({
      "2026-03-10": [{
        id: "task-1",
        text: "Gym",
        done: false,
        recurrence: "daily",
        position: 0,
        seriesId: "series-1",
        scheduledDate: "2026-03-10",
      }],
      "2026-03-11": [{
        id: "task-2",
        text: "Gym",
        done: false,
        recurrence: "daily",
        position: 0,
        seriesId: "series-1",
        scheduledDate: "2026-03-11",
      }],
      "2026-03-12": [{
        id: "task-3",
        text: "Gym",
        done: false,
        recurrence: "daily",
        position: 0,
        seriesId: "series-1",
        scheduledDate: "2026-03-12",
      }],
    }, "2026-03-11", "task-2", TASK_DELETE_MODES.FUTURE);

    expect(plan.removedTasks.map(({ task }) => task.id)).toEqual(["task-2", "task-3"]);
    expect(plan.upsertTasks).toEqual([
      expect.objectContaining({
        date: "2026-03-10",
        task: expect.objectContaining({ id: "task-1", recurrence: null }),
      }),
    ]);
  });

  it("removes all materialized occurrences when deleting a whole series", () => {
    const plan = buildTaskDeletePlan({
      "2026-03-10": [{
        id: "task-1",
        text: "Magnesio",
        done: false,
        recurrence: "daily",
        position: 0,
        seriesId: "series-1",
        scheduledDate: "2026-03-10",
      }],
      "2026-03-11": [{
        id: "task-2",
        text: "Magnesio",
        done: false,
        recurrence: "daily",
        position: 0,
        seriesId: "series-1",
        scheduledDate: "2026-03-11",
      }],
    }, "2026-03-11", "task-2", TASK_DELETE_MODES.ALL);

    expect(plan.removedTasks.map(({ task }) => task.id)).toEqual(["task-1", "task-2"]);
    expect(plan.upsertTasks).toEqual([]);
    expect(plan.nextState["2026-03-10"]).toEqual([]);
    expect(plan.nextState["2026-03-11"]).toEqual([]);
  });
});
