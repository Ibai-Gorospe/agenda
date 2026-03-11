import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskManager } from "../hooks/useTaskManager";
import { TIMINGS } from "../constants";
import { TASK_DELETE_MODES } from "../taskDeletion";

const mockFetchTasks = vi.fn();
const mockUpsertTask = vi.fn();
const mockDeleteTaskDB = vi.fn();
const mockBatchUpsertPositions = vi.fn();
const mockScheduleNotification = vi.fn();
const mockEnqueueMany = vi.fn();
const mockFlush = vi.fn();

vi.mock("../api/tasks", () => ({
  fetchTasks: (...args) => mockFetchTasks(...args),
  upsertTask: (...args) => mockUpsertTask(...args),
  deleteTaskDB: (...args) => mockDeleteTaskDB(...args),
  batchUpsertPositions: (...args) => mockBatchUpsertPositions(...args),
}));

vi.mock("../api/notifications", () => ({
  supportsNotif: false,
  scheduleNotification: (...args) => mockScheduleNotification(...args),
}));

vi.mock("../hooks/useOfflineQueue", () => ({
  useOfflineQueue: () => ({
    enqueueMany: mockEnqueueMany,
    flush: mockFlush,
  }),
}));

const setOffline = () => {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
};

const setOnline = () => {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
};

const renderTaskManager = async (user = { id: "user-1" }, addToast = vi.fn()) => {
  const rendered = renderHook(() => useTaskManager(user, addToast));
  await act(async () => { await Promise.resolve(); });
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
  return rendered;
};

const renderOnlineTaskManager = async (user = { id: "user-1" }, addToast = vi.fn()) => {
  setOnline();
  const rendered = renderHook(() => useTaskManager(user, addToast));
  await act(async () => { await Promise.resolve(); });
  return rendered;
};

describe("useTaskManager", () => {
  beforeEach(() => {
    mockFetchTasks.mockReset();
    mockUpsertTask.mockReset();
    mockDeleteTaskDB.mockReset();
    mockBatchUpsertPositions.mockReset();
    mockScheduleNotification.mockReset();
    mockEnqueueMany.mockReset();
    mockFlush.mockReset();
    vi.useRealTimers();
    mockFetchTasks.mockResolvedValue({});
    mockUpsertTask.mockResolvedValue(undefined);
    mockDeleteTaskDB.mockResolvedValue(undefined);
    mockBatchUpsertPositions.mockResolvedValue(undefined);
    setOffline();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues toggles while offline", async () => {
    const { result } = await renderTaskManager();
    expect(mockFetchTasks).toHaveBeenCalledWith("user-1");

    act(() => {
      result.current.setTasks({
        "2026-03-11": [{ id: "task-1", text: "Pagar", done: false, position: 0 }],
      });
    });

    await act(async () => {
      await result.current.handleToggle("2026-03-11", "task-1");
    });

    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-11",
        task: expect.objectContaining({ id: "task-1", done: true }),
      }),
    ]);
    expect(mockUpsertTask).not.toHaveBeenCalled();
  });

  it("queues manual moves while offline", async () => {
    const { result } = await renderTaskManager();
    expect(mockFetchTasks).toHaveBeenCalledWith("user-1");

    act(() => {
      result.current.setTasks({
        "2026-03-10": [{ id: "task-1", text: "Mover", done: false, position: 0 }],
        "2026-03-11": [{ id: "task-2", text: "Destino", done: false, position: 4 }],
      });
    });

    await act(async () => {
      await result.current.moveTask("2026-03-10", "2026-03-11", "task-1");
    });

    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-11",
        task: expect.objectContaining({ id: "task-1", position: 5 }),
      }),
    ]);
  });

  it("queues reorders while offline", async () => {
    const { result } = await renderTaskManager();
    expect(mockFetchTasks).toHaveBeenCalledWith("user-1");

    const reordered = [
      { id: "task-2", text: "Segundo", done: false, position: 9 },
      { id: "task-1", text: "Primero", done: false, position: 3 },
    ];

    await act(async () => {
      await result.current.handleReorder("2026-03-11", reordered);
    });

    expect(result.current.tasks["2026-03-11"]).toMatchObject([
      { id: "task-2", text: "Segundo", done: false, position: 0 },
      { id: "task-1", text: "Primero", done: false, position: 1 },
    ]);

    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-11",
        task: expect.objectContaining({ id: "task-2", position: 0 }),
      }),
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-11",
        task: expect.objectContaining({ id: "task-1", position: 1 }),
      }),
    ]);
  });

  it("queues pending-task moves while offline", async () => {
    const addToast = vi.fn();
    const { result } = await renderTaskManager({ id: "user-1" }, addToast);
    expect(mockFetchTasks).toHaveBeenCalledWith("user-1");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T12:00:00"));

    act(() => {
      result.current.setTasks({
        "2026-03-09": [{ id: "task-1", text: "Atrasada", done: false, position: 0 }],
        "2026-03-11": [{ id: "task-2", text: "Hoy", done: false, position: 2 }],
      });
    });

    await act(async () => {
      await result.current.moveSelectedPendingToToday(new Set(["task-1"]));
    });

    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-11",
        task: expect.objectContaining({
          id: "task-1",
          position: 3,
          scheduledDate: "2026-03-09",
        }),
      }),
    ]);
    expect(addToast).toHaveBeenCalledWith("1 tarea movida a hoy", "success", null, 3000);
  });

  it("materializes today's recurring instance from an overdue task", async () => {
    const { result } = await renderTaskManager();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T12:00:00"));

    act(() => {
      result.current.setTasks({
        "2026-03-10": [{
          id: "task-1",
          text: "Pastilla",
          done: false,
          recurrence: "daily",
          position: 0,
          seriesId: "series-1",
          scheduledDate: "2026-03-10",
        }],
      });
    });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.tasks["2026-03-11"]).toHaveLength(1);
    expect(result.current.tasks["2026-03-11"][0]).toEqual(expect.objectContaining({
      text: "Pastilla",
      done: false,
      recurrence: "daily",
      seriesId: "series-1",
      scheduledDate: "2026-03-11",
    }));
    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-11",
        task: expect.objectContaining({
          text: "Pastilla",
          scheduledDate: "2026-03-11",
        }),
      }),
    ]);
  });

  it("excludes anchor tasks from past pending selectors", async () => {
    const { result } = await renderTaskManager();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T12:00:00"));

    act(() => {
      result.current.setTasks({
        "2026-03-09": [
          { id: "carry-task", text: "Pastilla", done: false, position: 0, rolloverMode: "carry" },
          { id: "anchor-task", text: "Gym", done: false, position: 1, rolloverMode: "anchor" },
        ],
      });
    });

    expect(result.current.pendingPastCount).toBe(1);
    expect(result.current.pendingPastTasks).toEqual([
      expect.objectContaining({
        date: "2026-03-09",
        tasks: [expect.objectContaining({ id: "carry-task" })],
      }),
    ]);
  });

  it("marks older anchor occurrences as skipped once a newer one exists", async () => {
    const { result } = await renderTaskManager();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T12:00:00"));

    act(() => {
      result.current.setTasks({
        "2026-03-10": [{
          id: "task-1",
          text: "Rutina",
          done: false,
          recurrence: "daily",
          position: 0,
          seriesId: "series-1",
          scheduledDate: "2026-03-10",
          rolloverMode: "anchor",
        }],
      });
    });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.tasks["2026-03-10"][0]).toEqual(expect.objectContaining({
      state: "skipped",
      done: false,
      rolloverMode: "anchor",
    }));
    expect(result.current.tasks["2026-03-11"][0]).toEqual(expect.objectContaining({
      state: "open",
      scheduledDate: "2026-03-11",
    }));
  });

  it("does not create another future recurrence when completing an older moved instance", async () => {
    const { result } = await renderTaskManager();

    act(() => {
      result.current.setTasks({
        "2026-03-11": [
          {
            id: "task-yesterday",
            text: "Pastilla",
            done: false,
            recurrence: "daily",
            position: 0,
            seriesId: "series-1",
            scheduledDate: "2026-03-10",
          },
          {
            id: "task-today",
            text: "Pastilla",
            done: false,
            recurrence: "daily",
            position: 1,
            seriesId: "series-1",
            scheduledDate: "2026-03-11",
          },
        ],
      });
    });

    await act(async () => {
      await result.current.handleToggle("2026-03-11", "task-yesterday");
    });

    expect(result.current.tasks["2026-03-12"]).toBeUndefined();
  });

  it("does not recreate a deleted recurring occurrence", async () => {
    const { result } = await renderTaskManager();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T12:00:00"));

    act(() => {
      result.current.setTasks({
        "2026-03-10": [{
          id: "task-1",
          text: "Pastilla",
          done: false,
          recurrence: "daily",
          position: 0,
          seriesId: "series-1",
          scheduledDate: "2026-03-10",
        }],
        "2026-03-11": [{
          id: "task-2",
          text: "Pastilla",
          done: false,
          recurrence: "daily",
          position: 0,
          seriesId: "series-1",
          scheduledDate: "2026-03-11",
        }],
      });
    });
    await act(async () => { await Promise.resolve(); });

    act(() => {
      result.current.handleDelete("2026-03-10", "task-1");
      vi.advanceTimersByTime(TIMINGS.UNDO_WINDOW);
    });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.tasks["2026-03-10"]).toEqual([]);
    expect(result.current.tasks["2026-03-11"][0]).toEqual(expect.objectContaining({
      id: "task-2",
      deletedDates: ["2026-03-10"],
    }));
    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-11",
        task: expect.objectContaining({
          id: "task-2",
          deletedDates: ["2026-03-10"],
        }),
      }),
      expect.objectContaining({ type: "delete", id: "task-1" }),
    ]);
  });

  it("keeps a single recurring deletion alive by creating the next occurrence", async () => {
    const { result } = await renderTaskManager();
    vi.useFakeTimers();

    act(() => {
      result.current.setTasks({
        "2026-03-11": [{
          id: "task-1",
          text: "Creatina",
          done: false,
          recurrence: "daily",
          position: 0,
          seriesId: "series-1",
          scheduledDate: "2026-03-11",
        }],
      });
    });

    act(() => {
      result.current.handleDelete("2026-03-11", "task-1");
    });

    expect(result.current.tasks["2026-03-11"]).toEqual([]);
    expect(result.current.tasks["2026-03-12"][0]).toEqual(expect.objectContaining({
      recurrence: "daily",
      scheduledDate: "2026-03-12",
      deletedDates: ["2026-03-11"],
    }));

    act(() => {
      vi.advanceTimersByTime(TIMINGS.UNDO_WINDOW);
    });
    await act(async () => { await Promise.resolve(); });

    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-12",
        task: expect.objectContaining({
          recurrence: "daily",
          scheduledDate: "2026-03-12",
          deletedDates: ["2026-03-11"],
        }),
      }),
      expect.objectContaining({ type: "delete", id: "task-1" }),
    ]);
  });

  it("deletes this and following recurring occurrences without removing earlier history", async () => {
    const { result } = await renderTaskManager();
    vi.useFakeTimers();

    act(() => {
      result.current.setTasks({
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
      });
    });

    act(() => {
      result.current.handleDelete("2026-03-11", "task-2", TASK_DELETE_MODES.FUTURE);
    });

    expect(result.current.tasks["2026-03-10"][0]).toEqual(expect.objectContaining({
      id: "task-1",
      recurrence: null,
    }));
    expect(result.current.tasks["2026-03-11"]).toEqual([]);
    expect(result.current.tasks["2026-03-12"]).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(TIMINGS.UNDO_WINDOW);
    });
    await act(async () => { await Promise.resolve(); });

    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-10",
        task: expect.objectContaining({ id: "task-1", recurrence: null }),
      }),
      expect.objectContaining({ type: "delete", id: "task-2" }),
      expect.objectContaining({ type: "delete", id: "task-3" }),
    ]);
  });

  it("deletes the whole recurring series when requested", async () => {
    const { result } = await renderTaskManager();
    vi.useFakeTimers();

    act(() => {
      result.current.setTasks({
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
        "2026-03-13": [{ id: "other", text: "Otra", done: false, position: 0 }],
      });
    });

    act(() => {
      result.current.handleDelete("2026-03-11", "task-2", TASK_DELETE_MODES.ALL);
    });

    expect(result.current.tasks["2026-03-10"]).toEqual([]);
    expect(result.current.tasks["2026-03-11"]).toEqual([]);
    expect(result.current.tasks["2026-03-13"]).toEqual([
      expect.objectContaining({ id: "other" }),
    ]);

    act(() => {
      vi.advanceTimersByTime(TIMINGS.UNDO_WINDOW);
    });
    await act(async () => { await Promise.resolve(); });

    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({ type: "delete", id: "task-1" }),
      expect.objectContaining({ type: "delete", id: "task-2" }),
    ]);
  });

  it("toggles subtasks inline and persists the task update", async () => {
    const { result } = await renderTaskManager();

    act(() => {
      result.current.setTasks({
        "2026-03-11": [{
          id: "task-1",
          text: "Checklist",
          done: false,
          position: 0,
          subtasks: [
            { id: "sub-1", text: "Paso 1", done: false },
            { id: "sub-2", text: "Paso 2", done: false },
          ],
        }],
      });
    });

    await act(async () => {
      await result.current.toggleSubtask("2026-03-11", "task-1", "sub-1");
    });

    expect(result.current.tasks["2026-03-11"][0].subtasks[0]).toEqual(expect.objectContaining({ done: true }));
    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "upsert",
        date: "2026-03-11",
        task: expect.objectContaining({
          subtasks: [
            expect.objectContaining({ id: "sub-1", done: true }),
            expect.objectContaining({ id: "sub-2", done: false }),
          ],
        }),
      }),
    ]);
  });

  it("resets recurrent subtasks in the next occurrence", async () => {
    const { result } = await renderTaskManager();

    act(() => {
      result.current.setTasks({
        "2026-03-11": [{
          id: "task-1",
          text: "Rutina",
          done: false,
          recurrence: "daily",
          position: 0,
          seriesId: "series-1",
          scheduledDate: "2026-03-11",
          subtasks: [
            { id: "sub-1", text: "Serie A", done: true },
            { id: "sub-2", text: "Serie B", done: false },
          ],
        }],
      });
    });

    await act(async () => {
      await result.current.handleToggle("2026-03-11", "task-1");
    });

    expect(result.current.tasks["2026-03-12"][0].subtasks).toEqual([
      expect.objectContaining({ text: "Serie A", done: false }),
      expect.objectContaining({ text: "Serie B", done: false }),
    ]);
  });

  it("queues deletes after the undo window while offline", async () => {
    const { result } = await renderTaskManager();
    expect(mockFetchTasks).toHaveBeenCalledWith("user-1");
    vi.useFakeTimers();

    act(() => {
      result.current.setTasks({
        "2026-03-11": [{ id: "task-1", text: "Borrar", done: false, position: 0 }],
      });
    });

    act(() => {
      result.current.handleDelete("2026-03-11", "task-1");
      vi.advanceTimersByTime(TIMINGS.UNDO_WINDOW);
    });
    await act(async () => { await Promise.resolve(); });

    expect(mockEnqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({ type: "delete", id: "task-1" }),
    ]);
    expect(mockDeleteTaskDB).not.toHaveBeenCalled();
  });
});
