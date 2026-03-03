import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  it("calls onSearch on Ctrl+K", () => {
    const onSearch = vi.fn();
    const onNewTask = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSearch, onNewTask }));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onNewTask).not.toHaveBeenCalled();
  });

  it("calls onNewTask on Ctrl+N", () => {
    const onSearch = vi.fn();
    const onNewTask = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSearch, onNewTask }));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", ctrlKey: true }));
    expect(onNewTask).toHaveBeenCalledTimes(1);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("does not fire without Ctrl/Meta modifier", () => {
    const onSearch = vi.fn();
    const onNewTask = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSearch, onNewTask }));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "n" }));
    expect(onSearch).not.toHaveBeenCalled();
    expect(onNewTask).not.toHaveBeenCalled();
  });

  it("cleans up listener on unmount", () => {
    const onSearch = vi.fn();
    const onNewTask = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onSearch, onNewTask }));

    unmount();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    expect(onSearch).not.toHaveBeenCalled();
  });
});
