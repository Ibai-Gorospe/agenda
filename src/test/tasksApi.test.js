import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockUpsert } = vi.hoisted(() => {
  const upsert = vi.fn();
  const from = vi.fn(() => ({ upsert }));
  return { mockFrom: from, mockUpsert: upsert };
});

vi.mock("../supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

import { batchUpsertPositions, upsertTask } from "../api/tasks";

describe("tasks api persistence", () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockUpsert.mockReset();
  });

  it("retries task upserts without deleted_dates when the remote schema lacks that column", async () => {
    mockUpsert
      .mockResolvedValueOnce({
        error: {
          code: "PGRST204",
          message: "Could not find the 'deleted_dates' column of 'tasks' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ error: null });

    await upsertTask("user-1", "2026-03-11", {
      id: "task-1",
      text: "Simple",
      done: false,
      position: 0,
      seriesId: "task-1",
      scheduledDate: "2026-03-11",
      deletedDates: [],
    });

    expect(mockFrom).toHaveBeenCalledWith("tasks");
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert.mock.calls[0][0].deleted_dates).toEqual([]);
    expect("deleted_dates" in mockUpsert.mock.calls[1][0]).toBe(false);
  });

  it("retries batch position upserts without deleted_dates when needed", async () => {
    mockUpsert
      .mockResolvedValueOnce({
        error: {
          code: "PGRST204",
          message: "Could not find the 'deleted_dates' column of 'tasks' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ error: null });

    await batchUpsertPositions("user-1", "2026-03-11", [
      {
        id: "task-1",
        text: "Primera",
        done: false,
        position: 0,
        seriesId: "task-1",
        scheduledDate: "2026-03-11",
        deletedDates: [],
      },
      {
        id: "task-2",
        text: "Segunda",
        done: false,
        position: 1,
        seriesId: "task-2",
        scheduledDate: "2026-03-11",
        deletedDates: [],
      },
    ]);

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert.mock.calls[0][0][0].deleted_dates).toEqual([]);
    expect("deleted_dates" in mockUpsert.mock.calls[1][0][0]).toBe(false);
  });

  it("surfaces the original Supabase error when retry is not applicable", async () => {
    mockUpsert.mockResolvedValueOnce({
      error: {
        code: "42501",
        message: "new row violates row-level security policy for table \"tasks\"",
      },
    });

    await expect(upsertTask("user-1", "2026-03-11", {
      id: "task-1",
      text: "Simple",
      done: false,
      position: 0,
      seriesId: "task-1",
      scheduledDate: "2026-03-11",
      deletedDates: [],
    })).rejects.toThrow("new row violates row-level security policy");
  });
});
