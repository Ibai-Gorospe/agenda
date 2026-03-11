import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskManager } from "../hooks/useTaskManager";
import { TIMINGS } from "../constants";

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

const renderTaskManager = async (user = { id: "user-1" }, addToast = vi.fn()) => {
  const rendered = renderHook(() => useTaskManager(user, addToast));
  await act(async () => { await Promise.resolve(); });
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
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
        task: expect.objectContaining({ id: "task-1", position: 3 }),
      }),
    ]);
    expect(addToast).toHaveBeenCalledWith("1 tarea movida a hoy", "success", null, 3000);
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
