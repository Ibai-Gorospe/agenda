import { describe, it, expect } from "vitest";
import { getCat, getPriorityColor, CATEGORIES, PRIORITY_OPTIONS, TIMINGS, UI } from "../constants";

describe("getCat", () => {
  it("returns correct category by id", () => {
    const cat = getCat("personal");
    expect(cat).toBeDefined();
    expect(cat.label).toBe("Personal");
    expect(cat.color).toBe("#5B7FD4");
  });
  it("returns gym category", () => {
    const cat = getCat("gym");
    expect(cat.label).toBe("Entreno");
  });
  it("returns undefined for unknown id", () => {
    expect(getCat("nonexistent")).toBeUndefined();
  });
});

describe("getPriorityColor", () => {
  it("returns red for high", () => { expect(getPriorityColor("high")).toBe("#EF4444"); });
  it("returns amber for medium", () => { expect(getPriorityColor("medium")).toBe("#F59E0B"); });
  it("returns indigo for low", () => { expect(getPriorityColor("low")).toBe("#6366F1"); });
  it("returns null for null/undefined", () => { expect(getPriorityColor(null)).toBeNull(); });
});

describe("TIMINGS", () => {
  it("has expected values", () => {
    expect(TIMINGS.TOAST_DURATION).toBe(4000);
    expect(TIMINGS.TOAST_EXIT_ANIM).toBe(250);
    expect(TIMINGS.UNDO_WINDOW).toBe(5000);
    expect(TIMINGS.HIGHLIGHT_DURATION).toBe(2000);
  });
});

describe("UI", () => {
  it("has expected values", () => {
    expect(UI.MAX_TOASTS).toBe(4);
    expect(UI.SEARCH_RESULTS_LIMIT).toBe(20);
    expect(UI.SEARCH_DEBOUNCE).toBe(300);
    expect(UI.WORKOUT_EXERCISES_VISIBLE).toBe(6);
  });
});
