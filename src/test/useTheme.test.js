import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../hooks/useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to light mode when nothing saved", () => {
    // Mock matchMedia to return false (prefers light)
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { result } = renderHook(() => useTheme());
    expect(result.current.darkMode).toBe(false);
  });

  it("reads saved preference from localStorage", () => {
    localStorage.setItem("agenda-dark", "true");
    const { result } = renderHook(() => useTheme());
    expect(result.current.darkMode).toBe(true);
  });

  it("toggleDarkMode flips the state", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { result } = renderHook(() => useTheme());
    expect(result.current.darkMode).toBe(false);
    act(() => { result.current.toggleDarkMode(); });
    expect(result.current.darkMode).toBe(true);
    act(() => { result.current.toggleDarkMode(); });
    expect(result.current.darkMode).toBe(false);
  });

  it("persists to localStorage on change", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.toggleDarkMode(); });
    expect(localStorage.getItem("agenda-dark")).toBe("true");
  });

  it("sets data-theme attribute on document", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { result } = renderHook(() => useTheme());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    act(() => { result.current.toggleDarkMode(); });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
