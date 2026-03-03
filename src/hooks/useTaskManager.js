import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../supabase";
import { todayStr, nextRecurrenceDate, genId, formatDateLabel } from "../helpers";
import { TIMINGS } from "../constants";
import { fetchTasks, upsertTask, deleteTaskDB, batchUpsertPositions } from "../api/tasks";
import { supportsNotif, scheduleNotification } from "../api/notifications";
import { useOfflineQueue } from "./useOfflineQueue";

export function useTaskManager(user, addToast) {
  const [tasks, setTasks] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissedPendingBanner, setDismissedPendingBanner] = useState(false);
  const [showPendingSelector, setShowPendingSelector] = useState(false);
  const undoRef = useRef(null);
  const { enqueue, flush } = useOfflineQueue();

  // Load tasks when user changes
  useEffect(() => {
    if (user === undefined) return;
    if (!user || user.guest) { setTasks({}); return; }
    setTasksLoading(true);
    fetchTasks(user.id)
      .then(setTasks)
      .catch(() => addToast("No se pudieron cargar las tareas. Revisa tu conexión.", "error"))
      .finally(() => setTasksLoading(false));
  }, [user, addToast]);

  // Request notification permission
  useEffect(() => {
    if (supportsNotif && Notification.permission === "default") Notification.requestPermission();
  }, []);

  // Online/offline detection + flush queue
  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      if (user && !user.guest) {
        try {
          await flush(user.id);
          addToast("Conexión restaurada — cambios sincronizados", "success", null, 2500);
        } catch {
          addToast("Conexión restaurada", "success", null, 2500);
        }
      } else {
        addToast("Conexión restaurada", "success", null, 2500);
      }
    };
    const goOffline = () => { setIsOnline(false); };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [addToast, user, flush]);

  // Flush pending deletes when page is hidden
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden" && undoRef.current && user && !user.guest) {
        const { task: t, timer } = undoRef.current;
        clearTimeout(timer);
        undoRef.current = null;
        try { await deleteTaskDB(t.id); } catch { /* best effort */ }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  // ── Sync wrapper (offline-aware) ──
  const withSync = useCallback(async (fn, queueOp = null) => {
    if (!isOnline && queueOp) {
      enqueue(queueOp);
      return;
    }
    setSyncing(true);
    try { await fn(); }
    catch (err) {
      if (queueOp) enqueue(queueOp);
      else addToast(err.message || "Error de sincronización", "error");
    }
    finally { setSyncing(false); }
  }, [isOnline, addToast, enqueue]);

  const persistTask = useCallback(async (date, task) => {
    let savedTask;
    setTasks(prev => {
      const dayTasks = prev[date] || [];
      const idx = dayTasks.findIndex(t => t.id === task.id);
      savedTask = idx >= 0
        ? { ...task, position: dayTasks[idx].position }
        : { ...task, position: dayTasks.length };
      const newDay = idx >= 0
        ? dayTasks.map(t => t.id === task.id ? savedTask : t)
        : [...dayTasks, savedTask];
      return { ...prev, [date]: newDay };
    });
    if (user && !user.guest) {
      await withSync(
        async () => {
          await upsertTask(user.id, date, savedTask);
          scheduleNotification(savedTask, date);
        },
        { type: "upsert", date, task: savedTask }
      );
    }
  }, [user, withSync]);

  const handleToggle = useCallback(async (date, id) => {
    let updatedTask, nextDate, nextTask;
    setTasks(prev => {
      const task = (prev[date] || []).find(t => t.id === id);
      if (!task) return prev;
      const nowDone = !task.done;
      updatedTask = { ...task, done: nowDone };

      if (nowDone && task.recurrence) {
        nextDate = nextRecurrenceDate(date, task.recurrence);
        if (nextDate) {
          nextTask = { ...task, id: genId(), done: false, position: (prev[nextDate] || []).length };
        }
      }

      const newState = { ...prev, [date]: (prev[date] || []).map(t => t.id === id ? updatedTask : t) };
      if (nextDate && nextTask) {
        newState[nextDate] = [...(newState[nextDate] || []), nextTask];
      }
      return newState;
    });

    if (user && !user.guest && updatedTask) {
      await withSync(async () => {
        await upsertTask(user.id, date, updatedTask);
        if (nextDate && nextTask) {
          await upsertTask(user.id, nextDate, nextTask);
        }
      });
    }

    if (updatedTask?.done && nextDate && nextTask) {
      addToast(`Siguiente repetición creada para ${formatDateLabel(nextDate).split(",")[0]}`, "success", null, 3000);
    }
  }, [user, withSync, addToast]);

  const handleDelete = useCallback(async (date, id) => {
    const task = tasks[date]?.find(t => t.id === id);
    if (!task) return;
    setTasks(prev => ({ ...prev, [date]: (prev[date] || []).filter(t => t.id !== id) }));
    if (undoRef.current) clearTimeout(undoRef.current.timer);
    const undoData = { date, task, timer: null };
    undoRef.current = undoData;
    addToast("Tarea eliminada", "info", {
      label: "Deshacer",
      fn: () => {
        if (undoRef.current === undoData) {
          clearTimeout(undoData.timer);
          undoRef.current = null;
          setTasks(prev => {
            const restored = [...(prev[date] || []), task].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            return { ...prev, [date]: restored };
          });
          addToast("Tarea restaurada", "success", null, TIMINGS.HIGHLIGHT_DURATION);
        }
      }
    }, TIMINGS.UNDO_WINDOW);
    undoData.timer = setTimeout(async () => {
      if (undoRef.current === undoData) {
        undoRef.current = null;
        if (user && !user.guest) {
          try { await deleteTaskDB(id); }
          catch { addToast("Error al eliminar en el servidor", "error"); }
        }
      }
    }, TIMINGS.UNDO_WINDOW);
  }, [tasks, user, addToast]);

  const handleDuplicate = useCallback(async (date, task) => {
    const newTask = {
      ...task,
      id: genId(),
      done: false,
      position: (tasks[date] || []).length,
      subtasks: (task.subtasks || []).map(s => ({ ...s, id: genId(), done: false })),
    };
    await persistTask(date, newTask);
    addToast("Tarea duplicada", "success", null, TIMINGS.HIGHLIGHT_DURATION);
  }, [tasks, persistTask, addToast]);

  const moveTask = useCallback(async (fromDate, toDate, taskId) => {
    if (fromDate === toDate) return;
    let movedTask;
    setTasks(prev => {
      const task = (prev[fromDate] || []).find(t => t.id === taskId);
      if (!task) return prev;
      const toLen = (prev[toDate] || []).length;
      movedTask = { ...task, position: toLen };
      const fromTasks = (prev[fromDate] || []).filter(t => t.id !== taskId);
      const toTasks = [...(prev[toDate] || []), movedTask];
      return { ...prev, [fromDate]: fromTasks, [toDate]: toTasks };
    });
    if (user && !user.guest) {
      await withSync(async () => {
        await supabase.from("tasks").update({ date: toDate, position: movedTask.position }).eq("id", taskId);
      });
    }
  }, [user, withSync]);

  const handleReorder = useCallback(async (date, reorderedTasks) => {
    const withPositions = reorderedTasks.map((t, i) => ({ ...t, position: i }));
    setTasks(prev => ({ ...prev, [date]: withPositions }));
    if (user && !user.guest) {
      await withSync(async () => {
        await batchUpsertPositions(user.id, date, withPositions);
      });
    }
  }, [user, withSync]);

  // ── Pending past tasks ──

  const pendingPastCount = useMemo(() => {
    const td = todayStr();
    let count = 0;
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      if (date < td) count += dayTasks.filter(t => !t.done).length;
    });
    return count;
  }, [tasks]);

  const pendingPastTasks = useMemo(() => {
    const td = todayStr();
    const result = [];
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      if (date < td) {
        const pending = dayTasks.filter(t => !t.done);
        if (pending.length > 0) result.push({ date, tasks: pending });
      }
    });
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [tasks]);

  // Unified move-to-today logic (fixes duplicate code)
  const _moveTasksToToday = useCallback(async (filterFn, remainFn, extraActions) => {
    const todayDate = todayStr();
    const updates = [];
    setTasks(prev => {
      const newTasks = {};
      let todayTasks = [...(prev[todayDate] || [])];
      let position = todayTasks.length;
      Object.entries(prev).forEach(([date, dayTasks]) => {
        if (date >= todayDate) { newTasks[date] = dayTasks; return; }
        const toMove = dayTasks.filter(filterFn);
        const remaining = dayTasks.filter(remainFn);
        toMove.forEach(task => {
          const movedTask = { ...task, position: position++ };
          todayTasks.push(movedTask);
          updates.push({ id: task.id, date: todayDate, position: movedTask.position });
        });
        newTasks[date] = remaining;
      });
      newTasks[todayDate] = todayTasks;
      return newTasks;
    });
    setDismissedPendingBanner(true);
    if (extraActions) extraActions();
    if (user && !user.guest) {
      await withSync(async () => {
        await Promise.all(
          updates.map(u => supabase.from("tasks").update({ date: u.date, position: u.position }).eq("id", u.id))
        );
      });
    }
    return updates.length;
  }, [user, withSync]);

  const moveAllPendingToToday = useCallback(async () => {
    await _moveTasksToToday(t => !t.done, t => t.done);
  }, [_moveTasksToToday]);

  const moveSelectedPendingToToday = useCallback(async (selectedIds) => {
    const count = await _moveTasksToToday(
      t => selectedIds.has(t.id),
      t => !selectedIds.has(t.id),
      () => setShowPendingSelector(false)
    );
    addToast(`${count} tarea${count > 1 ? "s" : ""} movida${count > 1 ? "s" : ""} a hoy`, "success", null, 3000);
  }, [_moveTasksToToday, addToast]);

  return {
    tasks, setTasks, syncing, tasksLoading, isOnline,
    dismissedPendingBanner, setDismissedPendingBanner,
    showPendingSelector, setShowPendingSelector,
    persistTask, handleToggle, handleDelete, handleDuplicate,
    moveTask, handleReorder,
    pendingPastCount, pendingPastTasks,
    moveAllPendingToToday, moveSelectedPendingToToday,
  };
}
