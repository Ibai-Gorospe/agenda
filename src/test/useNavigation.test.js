import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNavigation } from "../hooks/useNavigation";

describe("useNavigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults activeView to 'day'", () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.activeView).toBe("day");
  });

  it("reads saved activeView from localStorage", () => {
    localStorage.setItem("agenda-activeView", "week");
    const { result } = renderHook(() => useNavigation());
    expect(result.current.activeView).toBe("week");
  });

  it("setActiveView updates view and persists", () => {
    const { result } = renderHook(() => useNavigation());
    act(() => { result.current.setActiveView("month"); });
    expect(result.current.activeView).toBe("month");
    expect(localStorage.getItem("agenda-activeView")).toBe("month");
  });

  it("today returns current date in YYYY-MM-DD format", () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("selectedDate defaults to today", () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.selectedDate).toBe(result.current.today);
  });

  it("prevMonth decrements month", () => {
    const { result } = renderHook(() => useNavigation());
    const initialMonth = result.current.calMonth;
    act(() => { result.current.prevMonth(); });
    if (initialMonth === 0) {
      expect(result.current.calMonth).toBe(11);
    } else {
      expect(result.current.calMonth).toBe(initialMonth - 1);
    }
  });

  it("nextMonth increments month", () => {
    const { result } = renderHook(() => useNavigation());
    const initialMonth = result.current.calMonth;
    act(() => { result.current.nextMonth(); });
    if (initialMonth === 11) {
      expect(result.current.calMonth).toBe(0);
    } else {
      expect(result.current.calMonth).toBe(initialMonth + 1);
    }
  });

  it("prevMonth wraps from January to December of previous year", () => {
    const { result } = renderHook(() => useNavigation());
    // Set to January
    while (result.current.calMonth !== 0) {
      act(() => { result.current.prevMonth(); });
    }
    const yearBefore = result.current.calYear;
    act(() => { result.current.prevMonth(); });
    expect(result.current.calMonth).toBe(11);
    expect(result.current.calYear).toBe(yearBefore - 1);
  });

  it("nextMonth wraps from December to January of next year", () => {
    const { result } = renderHook(() => useNavigation());
    // Set to December
    while (result.current.calMonth !== 11) {
      act(() => { result.current.nextMonth(); });
    }
    const yearBefore = result.current.calYear;
    act(() => { result.current.nextMonth(); });
    expect(result.current.calMonth).toBe(0);
    expect(result.current.calYear).toBe(yearBefore + 1);
  });

  it("navItems has 5 items", () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.navItems).toHaveLength(5);
    expect(result.current.navItems.map(n => n.key)).toEqual(["day", "week", "month", "year", "weight"]);
  });

  it("prevWeek and nextWeek change weekStart by 7 days", () => {
    const { result } = renderHook(() => useNavigation());
    const initial = result.current.weekStart;
    act(() => { result.current.nextWeek(); });
    const nextWeekDate = new Date(result.current.weekStart + "T12:00:00");
    const initialDate = new Date(initial + "T12:00:00");
    expect(nextWeekDate - initialDate).toBe(7 * 24 * 60 * 60 * 1000);

    act(() => { result.current.prevWeek(); });
    expect(result.current.weekStart).toBe(initial);
  });

  it("goToThisWeek resets to current week", () => {
    const { result } = renderHook(() => useNavigation());
    const thisWeek = result.current.weekStart;
    act(() => { result.current.nextWeek(); result.current.nextWeek(); });
    expect(result.current.weekStart).not.toBe(thisWeek);
    act(() => { result.current.goToThisWeek(); });
    expect(result.current.weekStart).toBe(thisWeek);
  });

  it("isThisWeek is true when on current week", () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.isThisWeek).toBe(true);
    act(() => { result.current.nextWeek(); });
    expect(result.current.isThisWeek).toBe(false);
  });

  it("formatWeekRange returns a string", () => {
    const { result } = renderHook(() => useNavigation());
    const label = result.current.formatWeekRange();
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  it("setCalMonth is available", () => {
    const { result } = renderHook(() => useNavigation());
    act(() => { result.current.setCalMonth(5); });
    expect(result.current.calMonth).toBe(5);
  });
});
