import { useCallback, useRef } from "react";
import { upsertTask, deleteTaskDB } from "../api/tasks";

const QUEUE_KEY = "agenda-offline-queue";

export function useOfflineQueue() {
  const flushing = useRef(false);

  const getQueue = () => {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
    catch { return []; }
  };

  const enqueue = useCallback((op) => {
    const q = getQueue();
    q.push({ ...op, ts: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  }, []);

  const flush = useCallback(async (userId) => {
    if (flushing.current) return;
    const q = getQueue();
    if (!q.length) return;
    flushing.current = true;
    localStorage.removeItem(QUEUE_KEY);
    try {
      for (const op of q) {
        if (op.type === "upsert") await upsertTask(userId, op.date, op.task);
        if (op.type === "delete") await deleteTaskDB(op.id);
      }
    } catch {
      // Re-queue remaining on failure
      const remaining = q.filter(op => op.ts > Date.now() - 86400000);
      if (remaining.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } finally {
      flushing.current = false;
    }
  }, []);

  return { enqueue, flush };
}
