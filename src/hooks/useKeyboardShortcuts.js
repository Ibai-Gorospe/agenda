import { useEffect } from "react";

export function useKeyboardShortcuts({ onSearch, onNewTask }) {
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); onSearch(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); onNewTask(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearch, onNewTask]);
}
