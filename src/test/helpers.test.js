import { describe, it, expect } from "vitest";
import {
  pad, todayStr, formatDateLabel, isWeekend, getWeekStart,
  formatWeekRange, recurrenceToDays, daysToRecurrence,
  getRecurrenceLabel, nextRecurrenceDate, genId, getWeekdayName, dateAdd,
  getTaskSeriesId, getTaskScheduledDate, getTaskState, isTaskOpen, isTaskDone, isTaskSkipped,
  getTaskRolloverMode, normalizeTask, resetSubtasks, getScheduledDateBadge,
} from "../helpers";

describe("pad", () => {
  it("pads single digit", () => { expect(pad(5)).toBe("05"); });
  it("keeps two digits", () => { expect(pad(12)).toBe("12"); });
  it("pads zero", () => { expect(pad(0)).toBe("00"); });
});

describe("todayStr", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatDateLabel", () => {
  it("returns Spanish formatted date", () => {
    const result = formatDateLabel("2026-03-03");
    expect(result).toContain("marzo");
    expect(result).toContain("2026");
    expect(result).toContain("3");
  });
});

describe("isWeekend", () => {
  it("returns true for Saturday", () => { expect(isWeekend("2026-03-07")).toBe(true); });
  it("returns true for Sunday", () => { expect(isWeekend("2026-03-08")).toBe(true); });
  it("returns false for Monday", () => { expect(isWeekend("2026-03-02")).toBe(false); });
  it("returns false for Wednesday", () => { expect(isWeekend("2026-03-04")).toBe(false); });
});

describe("getWeekStart", () => {
  it("returns Monday for a Wednesday", () => {
    expect(getWeekStart("2026-03-04")).toBe("2026-03-02");
  });
  it("returns same day for Monday", () => {
    expect(getWeekStart("2026-03-02")).toBe("2026-03-02");
  });
  it("returns Monday for Sunday", () => {
    expect(getWeekStart("2026-03-08")).toBe("2026-03-02");
  });
});

describe("formatWeekRange", () => {
  it("same month", () => {
    expect(formatWeekRange("2026-03-02")).toBe("2 — 8 Mar 2026");
  });
  it("cross-month", () => {
    expect(formatWeekRange("2026-02-23")).toBe("23 Feb — 1 Mar 2026");
  });
});

describe("recurrenceToDays", () => {
  it("daily returns all 7 days", () => {
    expect(recurrenceToDays("daily")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it("weekdays returns Mon-Fri", () => {
    expect(recurrenceToDays("weekdays")).toEqual([1, 2, 3, 4, 5]);
  });
  it("weekly returns day of date", () => {
    // 2026-03-02 is Monday (1)
    expect(recurrenceToDays("weekly", "2026-03-02")).toEqual([1]);
  });
  it("custom days:1,3,5", () => {
    expect(recurrenceToDays("days:1,3,5")).toEqual([1, 3, 5]);
  });
  it("empty for null/undefined", () => {
    expect(recurrenceToDays(null)).toEqual([]);
    expect(recurrenceToDays("")).toEqual([]);
  });
});

describe("daysToRecurrence", () => {
  it("empty array returns empty string", () => {
    expect(daysToRecurrence([])).toBe("");
  });
  it("all 7 days returns daily", () => {
    expect(daysToRecurrence([0, 1, 2, 3, 4, 5, 6])).toBe("daily");
  });
  it("Mon-Fri returns weekdays", () => {
    expect(daysToRecurrence([1, 2, 3, 4, 5])).toBe("weekdays");
  });
  it("custom days", () => {
    expect(daysToRecurrence([1, 3, 5])).toBe("days:1,3,5");
  });
  it("deduplicates and sorts", () => {
    expect(daysToRecurrence([5, 1, 3, 1])).toBe("days:1,3,5");
  });
});

describe("getRecurrenceLabel", () => {
  it("null returns null", () => { expect(getRecurrenceLabel(null)).toBeNull(); });
  it("daily", () => { expect(getRecurrenceLabel("daily")).toBe("Diaria"); });
  it("weekdays", () => { expect(getRecurrenceLabel("weekdays")).toBe("L-V"); });
  it("weekly", () => { expect(getRecurrenceLabel("weekly")).toBe("Semanal"); });
  it("monthly", () => { expect(getRecurrenceLabel("monthly")).toBe("Mensual"); });
  it("custom days", () => {
    expect(getRecurrenceLabel("days:1,3,5")).toBe("L, X, V");
  });
  it("days:0,1,2,3,4,5,6 returns Diaria", () => {
    expect(getRecurrenceLabel("days:0,1,2,3,4,5,6")).toBe("Diaria");
  });
});

describe("nextRecurrenceDate", () => {
  it("daily: next day", () => {
    expect(nextRecurrenceDate("2026-03-03", "daily")).toBe("2026-03-04");
  });
  it("weekly: +7 days", () => {
    expect(nextRecurrenceDate("2026-03-03", "weekly")).toBe("2026-03-10");
  });
  it("monthly: next month", () => {
    expect(nextRecurrenceDate("2026-03-03", "monthly")).toBe("2026-04-03");
  });
  it("weekdays: skips weekend", () => {
    // Friday 2026-03-06 → next weekday is Monday 2026-03-09
    expect(nextRecurrenceDate("2026-03-06", "weekdays")).toBe("2026-03-09");
  });
  it("custom days:1,3,5 from Monday", () => {
    // 2026-03-02 is Monday(1) → next match is Wednesday(3) = 2026-03-04
    expect(nextRecurrenceDate("2026-03-02", "days:1,3,5")).toBe("2026-03-04");
  });
  it("unknown returns null", () => {
    expect(nextRecurrenceDate("2026-03-03", "unknown")).toBeNull();
  });
});

describe("genId", () => {
  it("returns UUID-like string", () => {
    const id = genId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });
  it("returns unique values", () => {
    expect(genId()).not.toBe(genId());
  });
});

describe("getWeekdayName", () => {
  it("returns Spanish weekday name", () => {
    expect(getWeekdayName("2026-03-02")).toBe("lunes");
    expect(getWeekdayName("2026-03-08")).toBe("domingo");
  });
});

describe("dateAdd", () => {
  it("adds positive days", () => {
    expect(dateAdd("2026-03-03", 5)).toBe("2026-03-08");
  });
  it("subtracts days", () => {
    expect(dateAdd("2026-03-03", -3)).toBe("2026-02-28");
  });
  it("crosses month boundary", () => {
    expect(dateAdd("2026-01-31", 1)).toBe("2026-02-01");
  });
  it("crosses year boundary", () => {
    expect(dateAdd("2025-12-31", 1)).toBe("2026-01-01");
  });
});

describe("task metadata helpers", () => {
  it("falls back to id for series id", () => {
    expect(getTaskSeriesId({ id: "task-1" })).toBe("task-1");
  });

  it("falls back to visible date for scheduled date", () => {
    expect(getTaskScheduledDate({ id: "task-1" }, "2026-03-11")).toBe("2026-03-11");
  });

  it("maps legacy done boolean to task state", () => {
    expect(getTaskState({ done: true })).toBe("done");
    expect(getTaskState({ done: false })).toBe("open");
  });

  it("understands skipped state explicitly", () => {
    expect(isTaskSkipped({ state: "skipped" })).toBe(true);
    expect(isTaskOpen({ state: "open" })).toBe(true);
    expect(isTaskDone({ state: "done" })).toBe(true);
  });

  it("uses anchor as default rollover mode for gym", () => {
    expect(getTaskRolloverMode({ category: "gym" })).toBe("anchor");
    expect(getTaskRolloverMode({ category: "salud" })).toBe("carry");
  });

  it("normalizes state, done and rollover mode together", () => {
    expect(normalizeTask({ id: "task-1", category: "gym", done: false }, "2026-03-11")).toEqual(
      expect.objectContaining({
        state: "open",
        done: false,
        rolloverMode: "anchor",
        scheduledDate: "2026-03-11",
      })
    );
  });

  it("resets subtasks to pending", () => {
    expect(resetSubtasks([{ id: "sub-1", text: "Paso", done: true }])).toEqual([
      { id: "sub-1", text: "Paso", done: false },
    ]);
  });

  it("labels carry-over tasks from yesterday", () => {
    expect(getScheduledDateBadge("2026-03-10", "2026-03-11")).toBe("De ayer");
  });

  it("labels carry-over tasks from older dates", () => {
    expect(getScheduledDateBadge("2026-03-08", "2026-03-11")).toBe("Del 8 mar");
  });
});
