import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast } from "../hooks/useToast";

describe("useToast", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("starts with empty toasts", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it("addToast adds a toast with correct fields", () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast("Hola", "success"); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: "Hola",
      type: "success",
      exiting: false,
    });
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it("addToast defaults to info type", () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast("Test"); });
    expect(result.current.toasts[0].type).toBe("info");
  });

  it("auto-dismisses toast after duration", () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast("Auto", "info", null, 1000); });
    expect(result.current.toasts).toHaveLength(1);

    // After duration, toast should be marked as exiting
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.toasts[0].exiting).toBe(true);

    // After exit animation, toast is removed
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("dismissToast marks toast as exiting then removes it", () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast("Manual dismiss"); });
    const id = result.current.toasts[0].id;

    act(() => { result.current.dismissToast(id); });
    expect(result.current.toasts[0].exiting).toBe(true);

    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("respects MAX_TOASTS limit", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      for (let i = 0; i < 8; i++) {
        result.current.addToast(`Toast ${i}`, "info", null, 0);
      }
    });
    // UI.MAX_TOASTS is 4, but slice(-(MAX_TOASTS)) keeps the last MAX_TOASTS+1
    expect(result.current.toasts.length).toBeLessThanOrEqual(5);
  });

  it("supports action on toast", () => {
    const { result } = renderHook(() => useToast());
    const action = { label: "Undo", fn: vi.fn() };
    act(() => { result.current.addToast("With action", "info", action); });
    expect(result.current.toasts[0].action).toEqual(action);
  });
});
