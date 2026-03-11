import {
  genId,
  getTaskDeletedDates,
  getTaskRolloverMode,
  getTaskScheduledDate,
  getTaskSeriesId,
  nextRecurrenceDate,
  normalizeTask,
  resetSubtasks,
} from "./helpers";
import { getNextTaskPosition, replaceTasksForDate } from "./taskOrdering";
import { upsertTaskById } from "./taskCollections";

export const TASK_DELETE_MODES = {
  SINGLE: "single",
  FUTURE: "future",
  ALL: "all",
};

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

const removeTasksByIdSet = (taskMap, taskIds) => Object.fromEntries(
  Object.entries(taskMap).map(([date, dayTasks]) => [
    date,
    dayTasks.filter(task => !taskIds.has(task.id)),
  ])
);

const applyUpsertTasks = (taskMap, upsertTasks) => upsertTasks.reduce(
  (nextState, { date, task }) => replaceTasksForDate(
    nextState,
    date,
    upsertTaskById(nextState[date] || [], task)
  ),
  taskMap
);

const createRecurringSuccessor = (taskMap, task, deletedDate) => {
  const scheduledDate = getTaskScheduledDate(task);
  const nextDate = nextRecurrenceDate(scheduledDate, task.recurrence);
  if (!nextDate) return null;
  return {
    date: nextDate,
    task: normalizeTask({
      ...task,
      id: genId(),
      state: "open",
      done: false,
      position: getNextTaskPosition(taskMap[nextDate] || []),
      subtasks: resetSubtasks(task.subtasks),
      seriesId: getTaskSeriesId(task),
      scheduledDate: nextDate,
      rolloverMode: getTaskRolloverMode(task),
      deletedDates: mergeDeletedDates(getTaskDeletedDates(task), deletedDate),
    }, nextDate),
  };
};

const buildSingleDeletePlan = (taskMap, date, task, seriesEntries) => {
  const removedTasks = [{ date, task }];
  const removedTaskIds = new Set([task.id]);
  const scheduledDate = getTaskScheduledDate(task, date);

  if (!task.recurrence) {
    return {
      mode: TASK_DELETE_MODES.SINGLE,
      targetTask: task,
      removedTasks,
      addedTasks: [],
      upsertTasks: [],
      rollbackUpdates: [],
      nextState: removeTasksByIdSet(taskMap, removedTaskIds),
    };
  }

  const siblingEntries = seriesEntries.filter(entry => entry.task.id !== task.id);
  if (siblingEntries.length === 0) {
    const successor = createRecurringSuccessor(taskMap, task, scheduledDate);
    const upsertTasks = successor ? [successor] : [];
    return {
      mode: TASK_DELETE_MODES.SINGLE,
      targetTask: task,
      removedTasks,
      addedTasks: upsertTasks,
      upsertTasks,
      rollbackUpdates: [],
      nextState: applyUpsertTasks(removeTasksByIdSet(taskMap, removedTaskIds), upsertTasks),
    };
  }

  const nextDeletedDates = mergeDeletedDates(
    ...siblingEntries.map(entry => getTaskDeletedDates(entry.task)),
    scheduledDate
  );
  const rollbackUpdates = siblingEntries.map(entry => ({
    date: entry.displayDate,
    task: entry.task,
  }));
  const upsertTasks = siblingEntries.map(entry => ({
    date: entry.displayDate,
    task: normalizeTask({
      ...entry.task,
      deletedDates: nextDeletedDates,
    }, entry.displayDate),
  }));

  return {
    mode: TASK_DELETE_MODES.SINGLE,
    targetTask: task,
    removedTasks,
    addedTasks: [],
    upsertTasks,
    rollbackUpdates,
    nextState: applyUpsertTasks(removeTasksByIdSet(taskMap, removedTaskIds), upsertTasks),
  };
};

const buildFutureDeletePlan = (taskMap, task, seriesEntries) => {
  const scheduledDate = getTaskScheduledDate(task);
  const removedEntries = seriesEntries.filter(entry => entry.scheduledDate >= scheduledDate);
  const keptEntries = seriesEntries.filter(entry => entry.scheduledDate < scheduledDate);
  const removedTasks = removedEntries.map(entry => ({ date: entry.displayDate, task: entry.task }));
  const removedTaskIds = new Set(removedTasks.map(entry => entry.task.id));

  if (keptEntries.length === 0) {
    return {
      mode: TASK_DELETE_MODES.FUTURE,
      targetTask: task,
      removedTasks,
      addedTasks: [],
      upsertTasks: [],
      rollbackUpdates: [],
      nextState: removeTasksByIdSet(taskMap, removedTaskIds),
    };
  }

  const latestKept = [...keptEntries].sort(compareSeriesEntries).at(-1);
  const updatedLatest = normalizeTask({
    ...latestKept.task,
    recurrence: null,
  }, latestKept.displayDate);
  const upsertTasks = latestKept.task.recurrence
    ? [{ date: latestKept.displayDate, task: updatedLatest }]
    : [];
  const rollbackUpdates = latestKept.task.recurrence
    ? [{ date: latestKept.displayDate, task: latestKept.task }]
    : [];

  return {
    mode: TASK_DELETE_MODES.FUTURE,
    targetTask: task,
    removedTasks,
    addedTasks: [],
    upsertTasks,
    rollbackUpdates,
    nextState: applyUpsertTasks(removeTasksByIdSet(taskMap, removedTaskIds), upsertTasks),
  };
};

const buildAllDeletePlan = (taskMap, task, seriesEntries) => {
  const removedTasks = seriesEntries.map(entry => ({ date: entry.displayDate, task: entry.task }));
  return {
    mode: TASK_DELETE_MODES.ALL,
    targetTask: task,
    removedTasks,
    addedTasks: [],
    upsertTasks: [],
    rollbackUpdates: [],
    nextState: removeTasksByIdSet(taskMap, new Set(removedTasks.map(entry => entry.task.id))),
  };
};

export const buildTaskDeletePlan = (taskMap, date, taskId, mode = TASK_DELETE_MODES.SINGLE) => {
  const task = normalizeTask((taskMap[date] || []).find(entry => entry.id === taskId), date);
  if (!task?.id) return null;

  if (!task.recurrence || mode === TASK_DELETE_MODES.SINGLE) {
    const seriesEntries = task.recurrence
      ? getSeriesEntries(taskMap)
        .filter(entry => entry.seriesId === getTaskSeriesId(task))
        .sort(compareSeriesEntries)
      : [];
    return buildSingleDeletePlan(taskMap, date, task, seriesEntries);
  }

  const seriesEntries = getSeriesEntries(taskMap)
    .filter(entry => entry.seriesId === getTaskSeriesId(task))
    .sort(compareSeriesEntries);

  if (mode === TASK_DELETE_MODES.FUTURE) {
    return buildFutureDeletePlan(taskMap, task, seriesEntries);
  }

  if (mode === TASK_DELETE_MODES.ALL) {
    return buildAllDeletePlan(taskMap, task, seriesEntries);
  }

  return buildSingleDeletePlan(taskMap, date, task, seriesEntries);
};

export const getTaskDeleteToastMessage = (task, mode) => {
  if (!task?.recurrence) return "Tarea eliminada";
  if (mode === TASK_DELETE_MODES.ALL) return "Serie completa eliminada";
  if (mode === TASK_DELETE_MODES.FUTURE) return "Esta y las siguientes eliminadas";
  return "Ocurrencia eliminada";
};
