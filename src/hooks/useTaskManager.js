import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  todayStr,
  nextRecurrenceDate,
  genId,
  formatDateLabel,
  normalizeTask,
  getTaskSeriesId,
  getTaskScheduledDate,
  getTaskRolloverMode,
  getTaskState,
  isTaskOpen,
  isTaskDone,
  isTaskSkipped,
  resetSubtasks,
} from "../helpers";
import { TIMINGS } from "../constants";
import { fetchTasks, upsertTask, deleteTaskDB, batchUpsertPositions } from "../api/tasks";
import { supportsNotif, scheduleNotification } from "../api/notifications";
import { useOfflineQueue } from "./useOfflineQueue";

const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);
const asQueueOps = (ops) => (Array.isArray(ops) ? ops : [ops]).filter(Boolean);
const upsertQueueOp = (date, task) => ({ type: "upsert", date, task });
const deleteQueueOp = (id) => ({ type: "delete", id });
const getNextPosition = (dayTasks = []) => {
  if (!dayTasks.length) return 0;
  return Math.max(...dayTasks.map(t => t.position ?? 0)) + 1;
};

const normalizeTaskMap = (taskMap) => Object.fromEntries(
  Object.entries(taskMap).map(([date, dayTasks]) => [
    date,
    dayTasks.map(task => normalizeTask(task, date)),
  ])
);

const compareSeriesEntries = (a, b) => {
  if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
  if (a.displayDate !== b.displayDate) return a.displayDate.localeCompare(b.displayDate);
  return (a.task.position ?? 0) - (b.task.position ?? 0);
};

const getSeriesEntries = (taskMap) => {
  const entries = [];
  Object.entries(taskMap).forEach(([displayDate, dayTasks]) => {
    dayTasks.forEach(task => {
      const normalizedTask = normalizeTask(task, displayDate);
      const seriesId = getTaskSeriesId(normalizedTask);
      if (!seriesId) return;
      entries.push({
        task: normalizedTask,
        displayDate,
        seriesId,
        scheduledDate: getTaskScheduledDate(normalizedTask, displayDate),
      });
    });
  });
  return entries;
};

const findLatestSeriesEntry = (taskMap, seriesId) => {
  const entries = getSeriesEntries(taskMap)
    .filter(entry => entry.seriesId === seriesId)
    .sort(compareSeriesEntries);
  return entries.length ? entries[entries.length - 1] : null;
};

const hasSeriesInstanceOnDate = (taskMap, seriesId, scheduledDate) => (
  getSeriesEntries(taskMap).some(entry => (
    entry.seriesId === seriesId && entry.scheduledDate === scheduledDate
  ))
);

const createRecurringTaskInstance = (task, scheduledDate, position) => ({
  ...task,
  id: genId(),
  state: "open",
  done: false,
  position,
  subtasks: resetSubtasks(task.subtasks),
  seriesId: getTaskSeriesId(task),
  scheduledDate,
  rolloverMode: getTaskRolloverMode(task),
});

const buildRecurringReconciliation = (taskMap, untilDate) => {
  const entriesBySeries = new Map();

  getSeriesEntries(taskMap).forEach(entry => {
    if (!entriesBySeries.has(entry.seriesId)) entriesBySeries.set(entry.seriesId, []);
    entriesBySeries.get(entry.seriesId).push(entry);
  });

  const created = [];
  const updated = [];

  entriesBySeries.forEach(seriesEntries => {
    seriesEntries.sort(compareSeriesEntries);
    let latestEntry = seriesEntries[seriesEntries.length - 1];
    if (!latestEntry) return;

    if (latestEntry.task.recurrence) {
      let nextDate = nextRecurrenceDate(latestEntry.scheduledDate, latestEntry.task.recurrence);

      while (nextDate && nextDate <= untilDate) {
        const existing = seriesEntries.find(entry => entry.scheduledDate === nextDate);
        if (existing) {
          latestEntry = existing;
          nextDate = nextRecurrenceDate(latestEntry.scheduledDate, latestEntry.task.recurrence);
          continue;
        }

        const nextTask = createRecurringTaskInstance(latestEntry.task, nextDate, 0);
        const nextEntry = {
          task: nextTask,
          displayDate: nextDate,
          seriesId: latestEntry.seriesId,
          scheduledDate: nextDate,
        };

        seriesEntries.push(nextEntry);
        seriesEntries.sort(compareSeriesEntries);
        latestEntry = nextEntry;
        created.push({ date: nextDate, task: nextTask });
        nextDate = nextRecurrenceDate(latestEntry.scheduledDate, latestEntry.task.recurrence);
      }
    }

    if (latestEntry.scheduledDate) {
      seriesEntries.forEach(entry => {
        if (entry.scheduledDate >= latestEntry.scheduledDate) return;
        if (getTaskRolloverMode(entry.task) !== "anchor") return;
        if (!isTaskOpen(entry.task)) return;
        updated.push({
          date: entry.displayDate,
          task: {
            ...entry.task,
            state: "skipped",
            done: false,
          },
        });
      });
    }
  });

  const seen = new Set();
  const dedupedUpdated = updated.filter(({ task }) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });

  return {
    created: created.sort((a, b) => a.date.localeCompare(b.date)),
    updated: dedupedUpdated,
  };
};

export function useTaskManager(user, addToast) {
  const [tasks, setTasksState] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissedPendingBanner, setDismissedPendingBanner] = useState(false);
  const [showPendingSelector, setShowPendingSelector] = useState(false);
  const tasksRef = useRef({});
  const undoRef = useRef(null);
  const materializingRef = useRef(false);
  const { enqueueMany, flush } = useOfflineQueue();

  const setTasks = useCallback((value) => {
    const rawTasks = typeof value === "function" ? value(tasksRef.current) : value;
    const nextTasks = normalizeTaskMap(rawTasks);
    tasksRef.current = nextTasks;
    setTasksState(nextTasks);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (user === undefined) return undefined;
    if (!user || user.guest) {
      setTasks({});
      setTasksLoading(false);
      return undefined;
    }
    setTasksLoading(true);
    fetchTasks(user.id)
      .then((nextTasks) => {
        if (!cancelled) setTasks(nextTasks);
      })
      .catch(() => {
        if (!cancelled) addToast("No se pudieron cargar las tareas. Revisa tu conexión.", "error");
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, addToast, setTasks]);

  useEffect(() => {
    if (supportsNotif && Notification.permission === "default") Notification.requestPermission();
  }, []);

  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      if (user && !user.guest) {
        try {
          await flush(user.id);
          addToast("Conexión restaurada - cambios sincronizados", "success", null, 2500);
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
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [addToast, user, flush]);

  const withSync = useCallback(async (fn, queueOps = []) => {
    const ops = asQueueOps(queueOps);
    if (!isOnline && ops.length) {
      enqueueMany(ops);
      return false;
    }
    setSyncing(true);
    try {
      await fn();
      return true;
    } catch (err) {
      if (ops.length) enqueueMany(ops);
      else addToast(err.message || "Error de sincronización", "error");
      return false;
    } finally {
      setSyncing(false);
    }
  }, [isOnline, addToast, enqueueMany]);

  useEffect(() => {
    if (materializingRef.current) return;

    const { created, updated } = buildRecurringReconciliation(tasksRef.current, todayStr());
    if (created.length === 0 && updated.length === 0) return;

    const nextState = { ...tasksRef.current };
    updated.forEach(({ date, task }) => {
      nextState[date] = (nextState[date] || []).map(currentTask => (
        currentTask.id === task.id ? task : currentTask
      ));
    });

    const createdUpdates = created.map(({ date, task }) => {
      const savedTask = {
        ...task,
        position: getNextPosition(nextState[date] || []),
      };
      nextState[date] = [...(nextState[date] || []), savedTask];
      return { date, task: savedTask };
    });
    const updates = [...updated, ...createdUpdates];

    materializingRef.current = true;
    setTasks(nextState);

    createdUpdates.forEach(({ date, task }) => scheduleNotification(task, date));

    const persistMissing = async () => {
      if (user && !user.guest && updates.length > 0) {
        await withSync(
          async () => {
            await Promise.all(updates.map(({ date, task }) => upsertTask(user.id, date, task)));
          },
          updates.map(({ date, task }) => upsertQueueOp(date, task))
        );
      }
    };

    void persistMissing().finally(() => {
      materializingRef.current = false;
    });
  }, [tasks, user, setTasks, withSync]);

  const finalizeDelete = useCallback(async (taskId) => {
    if (!user || user.guest) return;
    const synced = await withSync(
      async () => { await deleteTaskDB(taskId); },
      deleteQueueOp(taskId)
    );
    if (!synced && isOnline) addToast("Error al eliminar en el servidor", "error");
  }, [user, withSync, isOnline, addToast]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || !undoRef.current) return;
      const { task, timer } = undoRef.current;
      clearTimeout(timer);
      undoRef.current = null;
      void finalizeDelete(task.id);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [finalizeDelete]);

  const persistTask = useCallback(async (date, task) => {
    const currentTasks = tasksRef.current;
    const dayTasks = currentTasks[date] || [];
    const idx = dayTasks.findIndex(t => t.id === task.id);
    const normalizedTask = normalizeTask({
      ...task,
      seriesId: getTaskSeriesId(task) || task.id,
      scheduledDate: getTaskScheduledDate(task, date),
      rolloverMode: getTaskRolloverMode(task),
      state: getTaskState(task),
    }, date);
    const savedTask = idx >= 0
      ? { ...normalizedTask, position: dayTasks[idx].position ?? 0 }
      : { ...normalizedTask, position: getNextPosition(dayTasks) };
    const newDay = idx >= 0
      ? dayTasks.map(t => t.id === task.id ? savedTask : t)
      : [...dayTasks, savedTask];
    setTasks({ ...currentTasks, [date]: newDay });
    if (user && !user.guest) {
      await withSync(
        async () => {
          await upsertTask(user.id, date, savedTask);
          if (isTaskOpen(savedTask)) scheduleNotification(savedTask, date);
        },
        upsertQueueOp(date, savedTask)
      );
    }
  }, [user, withSync]);

  const handleToggle = useCallback(async (date, id) => {
    const currentTasks = tasksRef.current;
    const dayTasks = currentTasks[date] || [];
    const task = dayTasks.find(t => t.id === id);
    if (!task) return;
    if (isTaskSkipped(task)) return;
    const scheduledDate = getTaskScheduledDate(task, date);
    const seriesId = getTaskSeriesId(task);
    const updatedTask = normalizeTask({
      ...task,
      state: isTaskDone(task) ? "open" : "done",
      seriesId,
      scheduledDate,
    }, date);
    let nextDate;
    let nextTask;
    const latestSeriesEntry = findLatestSeriesEntry(currentTasks, seriesId);
    const isLatestSeriesTask = !latestSeriesEntry || latestSeriesEntry.task.id === task.id;
    if (isTaskDone(updatedTask) && task.recurrence && isLatestSeriesTask) {
      nextDate = nextRecurrenceDate(scheduledDate, task.recurrence);
      if (nextDate && !hasSeriesInstanceOnDate(currentTasks, seriesId, nextDate)) {
        nextTask = createRecurringTaskInstance(
          task,
          nextDate,
          getNextPosition(currentTasks[nextDate] || [])
        );
      }
    }
    const newState = { ...currentTasks, [date]: dayTasks.map(t => t.id === id ? updatedTask : t) };
    if (nextDate && nextTask) {
      newState[nextDate] = [...(newState[nextDate] || []), nextTask];
    }
    setTasks(newState);

    if (user && !user.guest) {
      await withSync(async () => {
        await upsertTask(user.id, date, updatedTask);
        if (nextDate && nextTask) {
          await upsertTask(user.id, nextDate, nextTask);
          if (isTaskOpen(nextTask)) scheduleNotification(nextTask, nextDate);
        }
      }, [
        upsertQueueOp(date, updatedTask),
        nextDate && nextTask ? upsertQueueOp(nextDate, nextTask) : null,
      ]);
    }

    if (isTaskDone(updatedTask) && nextDate && nextTask) {
      addToast(`Siguiente repetición creada para ${formatDateLabel(nextDate).split(",")[0]}`, "success", null, 3000);
    }
  }, [user, setTasks, withSync, addToast]);

  const handleDelete = useCallback((date, id) => {
    const currentTasks = tasksRef.current;
    const task = currentTasks[date]?.find(t => t.id === id);
    if (!task) return;
    setTasks({ ...currentTasks, [date]: (currentTasks[date] || []).filter(t => t.id !== id) });
    if (undoRef.current) clearTimeout(undoRef.current.timer);
    const undoData = { date, task, timer: null };
    undoRef.current = undoData;
    addToast("Tarea eliminada", "info", {
      label: "Deshacer",
      fn: () => {
        if (undoRef.current !== undoData) return;
        clearTimeout(undoData.timer);
        undoRef.current = null;
        setTasks(prevTasks => {
          const restored = [...(prevTasks[date] || []), task].sort(byPosition);
          return { ...prevTasks, [date]: restored };
        });
        addToast("Tarea restaurada", "success", null, TIMINGS.HIGHLIGHT_DURATION);
      }
    }, TIMINGS.UNDO_WINDOW);
    undoData.timer = setTimeout(() => {
      if (undoRef.current !== undoData) return;
      undoRef.current = null;
      void finalizeDelete(id);
    }, TIMINGS.UNDO_WINDOW);
  }, [setTasks, addToast, finalizeDelete]);

  const handleDuplicate = useCallback(async (date, task) => {
    const dayTasks = tasksRef.current[date] || [];
    const id = genId();
    const newTask = {
      ...task,
      id,
      state: "open",
      done: false,
      position: getNextPosition(dayTasks),
      seriesId: id,
      scheduledDate: date,
      rolloverMode: getTaskRolloverMode(task),
      subtasks: (task.subtasks || []).map(s => ({ ...s, id: genId(), done: false })),
    };
    await persistTask(date, newTask);
    addToast("Tarea duplicada", "success", null, TIMINGS.HIGHLIGHT_DURATION);
  }, [persistTask, addToast]);

  const moveTask = useCallback(async (fromDate, toDate, taskId) => {
    if (fromDate === toDate) return;
    const currentTasks = tasksRef.current;
    const task = (currentTasks[fromDate] || []).find(t => t.id === taskId);
    if (!task) return;
    const movedTask = normalizeTask({
      ...task,
      position: getNextPosition(currentTasks[toDate] || []),
      seriesId: getTaskSeriesId(task),
      scheduledDate: toDate,
    }, toDate);
    const fromTasks = (currentTasks[fromDate] || []).filter(t => t.id !== taskId);
    const toTasks = [...(currentTasks[toDate] || []), movedTask];
    setTasks({ ...currentTasks, [fromDate]: fromTasks, [toDate]: toTasks });
    if (isTaskOpen(movedTask)) scheduleNotification(movedTask, toDate);
    if (user && !user.guest) {
      await withSync(
        async () => { await upsertTask(user.id, toDate, movedTask); },
        upsertQueueOp(toDate, movedTask)
      );
    }
  }, [user, setTasks, withSync]);

  const handleReorder = useCallback(async (date, reorderedTasks) => {
    const withPositions = reorderedTasks.map((t, i) => ({ ...t, position: i }));
    setTasks(prevTasks => ({ ...prevTasks, [date]: withPositions }));
    if (user && !user.guest) {
      await withSync(
        async () => { await batchUpsertPositions(user.id, date, withPositions); },
        withPositions.map(task => upsertQueueOp(date, task))
      );
    }
  }, [user, setTasks, withSync]);

  const pendingPastCount = useMemo(() => {
    const td = todayStr();
    let count = 0;
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      if (date < td) count += dayTasks.filter(t => isTaskOpen(t) && getTaskRolloverMode(t) === "carry").length;
    });
    return count;
  }, [tasks]);

  const pendingPastTasks = useMemo(() => {
    const td = todayStr();
    const result = [];
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      if (date < td) {
        const pending = dayTasks.filter(t => isTaskOpen(t) && getTaskRolloverMode(t) === "carry");
        if (pending.length > 0) result.push({ date, tasks: pending });
      }
    });
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [tasks]);

  const _moveTasksToToday = useCallback(async (filterFn, remainFn, extraActions) => {
    const todayDate = todayStr();
    const currentTasks = tasksRef.current;
    const updates = [];
    const newTasks = {};
    const todayTasks = [...(currentTasks[todayDate] || [])];
    let position = getNextPosition(todayTasks) || 0;
    Object.entries(currentTasks).forEach(([date, dayTasks]) => {
      if (date >= todayDate) {
        newTasks[date] = dayTasks;
        return;
      }
      const toMove = dayTasks.filter(filterFn);
      const remaining = dayTasks.filter(remainFn);
      toMove.forEach(task => {
        const movedTask = normalizeTask({
          ...task,
          position: position++,
          seriesId: getTaskSeriesId(task),
          scheduledDate: getTaskScheduledDate(task, date),
          state: "open",
        }, todayDate);
        todayTasks.push(movedTask);
        updates.push({ date: todayDate, task: movedTask });
        if (isTaskOpen(movedTask)) scheduleNotification(movedTask, todayDate);
      });
      newTasks[date] = remaining;
    });
    newTasks[todayDate] = todayTasks;
    setTasks(newTasks);
    setDismissedPendingBanner(true);
    if (extraActions) extraActions();
    if (user && !user.guest && updates.length > 0) {
      await withSync(async () => {
        await Promise.all(updates.map(({ date, task }) => upsertTask(user.id, date, task)));
      }, updates.map(({ date, task }) => upsertQueueOp(date, task)));
    }
    return updates.length;
  }, [user, setTasks, withSync]);

  const moveAllPendingToToday = useCallback(async () => {
    await _moveTasksToToday(
      t => isTaskOpen(t) && getTaskRolloverMode(t) === "carry",
      t => !isTaskOpen(t) || getTaskRolloverMode(t) !== "carry"
    );
  }, [_moveTasksToToday]);

  const moveSelectedPendingToToday = useCallback(async (selectedIds) => {
    const count = await _moveTasksToToday(
      t => selectedIds.has(t.id) && isTaskOpen(t) && getTaskRolloverMode(t) === "carry",
      t => !selectedIds.has(t.id) || !isTaskOpen(t) || getTaskRolloverMode(t) !== "carry",
      () => setShowPendingSelector(false)
    );
    addToast(`${count} tarea${count > 1 ? "s" : ""} movida${count > 1 ? "s" : ""} a hoy`, "success", null, 3000);
  }, [_moveTasksToToday, addToast]);

  const toggleSubtask = useCallback(async (date, taskId, subtaskId) => {
    const currentTasks = tasksRef.current;
    const dayTasks = currentTasks[date] || [];
    const task = dayTasks.find(t => t.id === taskId);
    if (!task) return;
    if (!isTaskOpen(task)) return;
    const updatedTask = normalizeTask({
      ...task,
      subtasks: (task.subtasks || []).map(subtask => (
        subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask
      )),
    }, date);
    setTasks({
      ...currentTasks,
      [date]: dayTasks.map(currentTask => currentTask.id === taskId ? updatedTask : currentTask),
    });
    if (user && !user.guest) {
      await withSync(
        async () => { await upsertTask(user.id, date, updatedTask); },
        upsertQueueOp(date, updatedTask)
      );
    }
  }, [user, setTasks, withSync]);

  return {
    tasks, setTasks, syncing, tasksLoading, isOnline,
    dismissedPendingBanner, setDismissedPendingBanner,
    showPendingSelector, setShowPendingSelector,
    persistTask, handleToggle, handleDelete, handleDuplicate,
    moveTask, handleReorder, toggleSubtask,
    pendingPastCount, pendingPastTasks,
    moveAllPendingToToday, moveSelectedPendingToToday,
  };
}
