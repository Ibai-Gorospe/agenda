import { useState, useCallback } from "react";
import { genId } from "../helpers";
import { TIMINGS, UI } from "../constants";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", action = null, duration = TIMINGS.TOAST_DURATION) => {
    const id = genId();
    setToasts(prev => [...prev.slice(-(UI.MAX_TOASTS)), { id, message, type, action, exiting: false }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TIMINGS.TOAST_EXIT_ANIM);
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TIMINGS.TOAST_EXIT_ANIM);
  }, []);

  return { toasts, addToast, dismissToast };
}
