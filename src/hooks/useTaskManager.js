import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  todayStr,
  nextRecurrenceDate,
  genId,
  formatDateLabel,
  normalizeTask,
  getTaskDeletedDates,
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
import { replaceTaskById, upsertTaskById } from "../taskCollections";
import { buildTaskDeletePlan, getTaskDeleteToastMessage, TASK_DELETE_MODES } from "../taskDeletion";
import { assignOrderedTaskPositions, getNextTaskPosition, replaceTasksForDate } from "../taskOrdering";
import { withToggledSubtask } from "../taskSubtasks";

const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);
const asQueueOps = (ops) => (Array.isArray(ops) ? ops : [ops]).filter(Boolean);
const upsertQueueOp = (date, task) => ({ type: "upsert", date, task });
const deleteQueueOp = (id) => ({ type: "delete", id });

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

const mergeDeletedDates = (...deletedDateLists) => (
  [...new Set(deletedDateLists.flat().filter(Boolean))].sort()
);

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

const getSeriesDeletedDates = (taskMap, seriesId) => {
  const deletedDates = new Set();
  getSeriesEntries(taskMap).forEach(entry => {
    if (entry.seriesId !== seriesId) return;
    getTaskDeletedDates(entry.task).forEach(deletedDate => {
      if (deletedDate) deletedDates.add(deletedDate);
    });
  });
  return deletedDates;
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
  )) || getSeriesDeletedDates(taskMap, seriesId).has(scheduledDate)
);

const createRecurringTaskInstance = (task, scheduledDate, position, deletedDates = getTaskDeletedDates(task)) => ({
  ...task,
  id: genId(),
  state: "open",
  done: false,
  position,
  subtasks: resetSubtasks(task.subtasks),
  seriesId: getTaskSeriesId(task),
  scheduledDate,
  rolloverMode: getTaskRolloverMode(task),
  deletedDates: mergeDeletedDates(deletedDates),
});

const buildRecurringReconciliation = (taskMap, untilDate, stateUntilDate = untilDate) => {
  const entriesBySeries = new Map();

  getSeriesEntries(taskMap).forEach(entry => {
    if (!entriesBySeries.has(entry.seriesId)) {
      entriesBySeries.set(entry.seriesId, { entries: [], deletedDates: new Set() });
    }
    const seriesData = entriesBySeries.get(entry.seriesId);
    seriesData.entries.push(entry);
    getTaskDeletedDates(entry.task).forEach(deletedDate => {
      if (deletedDate) seriesData.deletedDates.add(deletedDate);
    });
  });

  const created = [];
  const updated = [];

  entriesBySeries.forEach(({ entries: seriesEntries, deletedDates }) => {
    seriesEntries.sort(compareSeriesEntries);
    let latestEntry = seriesEntries[seriesEntries.length - 1];
    if (!latestEntry) return;

    if (latestEntry.task.recurrence) {
      let cursorDate = latestEntry.scheduledDate;
      let templateTask = latestEntry.task;
      let nextDate = nextRecurrenceDate(cursorDate, templateTask.recurrence);

      while (nextDate && nextDate <= untilDate) {
        const existing = seriesEntries.find(entry => entry.scheduledDate === nextDate);
        if (existing) {
          latestEntry = existing;
          templateTask = existing.task;
          cursorDate = existing.scheduledDate;
          nextDate = nextRecurrenceDate(cursorDate, templateTask.recurrence);
          continue;
        }

        if (deletedDates.has(nextDate)) {
          cursorDate = nextDate;
          nextDate = nextRecurrenceDate(cursorDate, templateTask.recurrence);
          continue;
        }

        const nextTask = createRecurringTaskInstance(
          templateTask,
          nextDate,
          0,
          Array.from(deletedDates)
        );
        const nextEntry = {
          task: nextTask,
          displayDate: nextDate,
          seriesId: latestEntry.seriesId,
          scheduledDate: nextDate,
        };

        seriesEntries.push(nextEntry);
        seriesEntries.sort(compareSeriesEntries);
        latestEntry = nextEntry;
        templateTask = nextTask;
        cursorDate = nextDate;
        created.push({ date: nextDate, task: nextTask });
        nextDate = nextRecurrenceDate(cursorDate, templateTask.recurrence);
      }
    }

    const latestRelevantEntry = [...seriesEntries]
      .filter(entry => entry.scheduledDate <= stateUntilDate)
      .sort(compareSeriesEntries)
      .at(-1);

    if (latestRelevantEntry?.scheduledDate) {
      seriesEntries.forEach(entry => {
        if (entry.scheduledDate >= latestRelevantEntry.scheduledDate) return;
        if (getTaskRolloverMode(entry.task) !== "anchor") return;
        if (!isTaskOpen(entry.task)) return;
        updated.push({
          date: entry.displayDate,
          task: {
            ...entry.task,
            state: "skipped",
            done: false,
            deletedDates: mergeDeletedDates(getTaskDeletedDates(entry.task), Array.from(deletedDates)),
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

export function useTaskManager(user, addToast, materializeUntilDate = null) {
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
      if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
        console.error("[useTaskManager] sync error", {
          message: err?.message,
          queueOps: ops,
          isOnline,
        });
      }
      if (ops.length) enqueueMany(ops);
      if (isOnline) addToast(err.message || "Error de sincronizacion", "error");
      return false;
    } finally {
      setSyncing(false);
    }
  }, [isOnline, addToast, enqueueMany]);

  useEffect(() => {
    if (materializingRef.current) return;

    const todayDate = todayStr();
    const horizonEnd = materializeUntilDate && materializeUntilDate > todayDate
      ? materializeUntilDate
      : todayDate;
    const { created, updated } = buildRecurringReconciliation(tasksRef.current, horizonEnd, todayDate);
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
        position: getNextTaskPosition(nextState[date] || []),
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
  }, [tasks, user, setTasks, withSync, materializeUntilDate]);

  const finalizeDelete = useCallback(async (removedTasks = [], upsertTasks = []) => {
    if (!user || user.guest || (removedTasks.length === 0 && upsertTasks.length === 0)) return;
    const synced = await withSync(
      async () => {
        if (upsertTasks.length > 0) {
          await Promise.all(upsertTasks.map(({ date, task }) => upsertTask(user.id, date, task)));
        }
        if (removedTasks.length > 0) {
          await Promise.all(removedTasks.map(({ task }) => deleteTaskDB(task.id)));
        }
      },
      [
        ...upsertTasks.map(({ date, task }) => upsertQueueOp(date, task)),
        ...removedTasks.map(({ task }) => deleteQueueOp(task.id)),
      ]
    );
    if (!synced && isOnline) addToast("Error al eliminar en el servidor", "error");
  }, [user, withSync, isOnline, addToast]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || !undoRef.current) return;
      const { timer, removedTasks = [], upsertTasks = [] } = undoRef.current;
      clearTimeout(timer);
      undoRef.current = null;
      void finalizeDelete(removedTasks, upsertTasks);
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
      : { ...normalizedTask, position: getNextTaskPosition(dayTasks) };
    const newDay = upsertTaskById(dayTasks, savedTask);
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
    const seriesDeletedDates = Array.from(getSeriesDeletedDates(currentTasks, seriesId));
    if (isTaskDone(updatedTask) && task.recurrence && isLatestSeriesTask) {
      nextDate = nextRecurrenceDate(scheduledDate, task.recurrence);
      if (nextDate && !hasSeriesInstanceOnDate(currentTasks, seriesId, nextDate)) {
        nextTask = createRecurringTaskInstance(
          task,
          nextDate,
          getNextTaskPosition(currentTasks[nextDate] || []),
          seriesDeletedDates
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

  const handleDelete = useCallback((date, id, mode = TASK_DELETE_MODES.SINGLE) => {
    const currentTasks = tasksRef.current;
    const deletePlan = buildTaskDeletePlan(currentTasks, date, id, mode);
    if (!deletePlan) return;

    setTasks(deletePlan.nextState);
    deletePlan.addedTasks.forEach(({ date: targetDate, task }) => {
      if (isTaskOpen(task)) scheduleNotification(task, targetDate);
    });

    if (undoRef.current) {
      const { timer, removedTasks: pendingRemovedTasks = [], upsertTasks: pendingUpsertTasks = [] } = undoRef.current;
      clearTimeout(timer);
      undoRef.current = null;
      void finalizeDelete(pendingRemovedTasks, pendingUpsertTasks);
    }
    const undoData = {
      removedTasks: deletePlan.removedTasks,
      addedTasks: deletePlan.addedTasks,
      rollbackUpdates: deletePlan.rollbackUpdates,
      upsertTasks: deletePlan.upsertTasks,
      timer: null,
    };
    undoRef.current = undoData;
    addToast(getTaskDeleteToastMessage(deletePlan.targetTask, deletePlan.mode), "info", {
      label: "Deshacer",
      fn: () => {
        if (undoRef.current !== undoData) return;
        clearTimeout(undoData.timer);
        undoRef.current = null;
        setTasks(prevTasks => {
          let restoredState = prevTasks;

          if (undoData.addedTasks.length > 0) {
            const addedTaskIds = new Set(undoData.addedTasks.map(({ task }) => task.id));
            restoredState = Object.fromEntries(
              Object.entries(restoredState).map(([entryDate, dayTasks]) => [
                entryDate,
                dayTasks.filter(currentTask => !addedTaskIds.has(currentTask.id)),
              ])
            );
          }

          if (undoData.rollbackUpdates.length > 0) {
            restoredState = undoData.rollbackUpdates.reduce((nextState, { date: entryDate, task }) => (
              replaceTasksForDate(
                nextState,
                entryDate,
                replaceTaskById(nextState[entryDate] || [], normalizeTask(task, entryDate))
              )
            ), restoredState);
          }

          return undoData.removedTasks.reduce((nextState, { date: entryDate, task }) => (
            replaceTasksForDate(
              nextState,
              entryDate,
              [...(nextState[entryDate] || []), task].sort(byPosition)
            )
          ), restoredState);
        });
        addToast(
          undoData.removedTasks.length > 1 || undoData.addedTasks.length > 0 || undoData.rollbackUpdates.length > 0
            ? "Cambios restaurados"
            : "Tarea restaurada",
          "success",
          null,
          TIMINGS.HIGHLIGHT_DURATION
        );
      }
    }, TIMINGS.UNDO_WINDOW);
    undoData.timer = setTimeout(() => {
      if (undoRef.current !== undoData) return;
      undoRef.current = null;
      void finalizeDelete(deletePlan.removedTasks, deletePlan.upsertTasks);
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
      position: getNextTaskPosition(dayTasks),
      seriesId: id,
      scheduledDate: date,
      rolloverMode: getTaskRolloverMode(task),
      deletedDates: [],
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
      position: getNextTaskPosition(currentTasks[toDate] || []),
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
    const withPositions = assignOrderedTaskPositions(reorderedTasks);
    setTasks(prevTasks => replaceTasksForDate(prevTasks, date, withPositions));
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
    let position = getNextTaskPosition(todayTasks) || 0;
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
    const updatedTask = normalizeTask(withToggledSubtask(task, subtaskId), date);
    setTasks({
      ...currentTasks,
      [date]: replaceTaskById(dayTasks, updatedTask),
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
