import { useCallback, useRef } from "react";
import { upsertTask, deleteTaskDB } from "../api/tasks";
import { scheduleNotification } from "../api/notifications";

const QUEUE_KEY = "agenda-offline-queue";
const MAX_OP_AGE_MS = 86400000;

const getQueue = () => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
  catch { return []; }
};

const storeQueue = (queue) => {
  if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  else localStorage.removeItem(QUEUE_KEY);
};

export function useOfflineQueue() {
  const flushing = useRef(false);

  const enqueue = useCallback((op) => {
    const q = getQueue();
    q.push({ ...op, ts: Date.now() });
    storeQueue(q);
  }, []);

  const enqueueMany = useCallback((ops) => {
    if (!ops?.length) return;
    const q = getQueue();
    const ts = Date.now();
    q.push(...ops.map(op => ({ ...op, ts })));
    storeQueue(q);
  }, []);

  const flush = useCallback(async (userId) => {
    if (flushing.current) return;
    const q = getQueue();
    if (!q.length) return;
    flushing.current = true;
    storeQueue([]);
    let index = 0;
    try {
      for (; index < q.length; index++) {
        const op = q[index];
        if (op.type === "upsert") {
          await upsertTask(userId, op.date, op.task);
          scheduleNotification(op.task, op.date);
        }
        if (op.type === "delete") await deleteTaskDB(op.id);
      }
    } catch {
      const cutoff = Date.now() - MAX_OP_AGE_MS;
      const remaining = q.slice(index).filter(op => op.ts > cutoff);
      storeQueue(remaining);
    } finally {
      flushing.current = false;
    }
  }, []);

  return { enqueue, enqueueMany, flush };
}
