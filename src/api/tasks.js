import { supabase } from "../supabase";
import { getTaskRolloverMode, getTaskState, isTaskDone } from "../helpers";

const TASK_SYNC_DEBUG = import.meta.env.DEV && import.meta.env.MODE !== "test";

const mapTaskRow = (t) => ({
  id: t.id, text: t.text, time: t.time, reminder: t.reminder,
  done: t.state ? t.state === "done" : t.done,
  state: t.state || (t.done ? "done" : "open"),
  position: t.position ?? 0,
  category: t.category || null, recurrence: t.recurrence || null,
  priority: t.priority || null, notes: t.notes || null,
  subtasks: t.subtasks || [],
  seriesId: t.series_id || t.id,
  scheduledDate: t.scheduled_date || t.date,
  rolloverMode: t.rollover_mode || (t.category === "gym" ? "anchor" : "carry"),
  deletedDates: t.deleted_dates || [],
});

const buildTaskRow = (userId, date, task, includeDeletedDates = true) => {
  const row = {
    id: task.id,
    user_id: userId,
    date,
    text: task.text,
    time: task.time || null,
    reminder: task.reminder || "0",
    done: isTaskDone(task),
    state: getTaskState(task),
    position: task.position ?? 0,
    category: task.category || null,
    recurrence: task.recurrence || null,
    priority: task.priority || null,
    notes: task.notes || null,
    subtasks: task.subtasks || [],
    series_id: task.seriesId || task.id,
    scheduled_date: task.scheduledDate || date,
    rollover_mode: getTaskRolloverMode(task),
  };
  if (includeDeletedDates) row.deleted_dates = task.deletedDates || [];
  return row;
};

const isMissingDeletedDatesColumn = (error) => (
  error?.code === "PGRST204" && /deleted_dates/i.test(error.message || "")
);

const formatSupabaseError = (action, error) => {
  if (!error) return `Error al ${action} tarea`;
  const detail = [error.message, error.details, error.hint].filter(Boolean).join(" | ");
  return detail ? `Error al ${action} tarea: ${detail}` : `Error al ${action} tarea`;
};

const logTaskWrite = (phase, payload) => {
  if (!TASK_SYNC_DEBUG) return;
  console.info(`[tasks] ${phase}`, payload);
};

const logTaskWriteError = (phase, payload) => {
  if (!TASK_SYNC_DEBUG) return;
  console.error(`[tasks] ${phase}`, payload);
};

export async function fetchTasks(userId) {
  const PAGE = 1000;
  let from = 0, allRows = [];
  while (true) {
    const { data, error } = await supabase
      .from("tasks").select("*").eq("user_id", userId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error("Error al cargar tareas");
    allRows = allRows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const map = {};
  for (const t of allRows) {
    if (!map[t.date]) map[t.date] = [];
    map[t.date].push(mapTaskRow(t));
  }
  Object.values(map).forEach(dayTasks => dayTasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
  return map;
}

export async function upsertTask(userId, date, task) {
  const fullRow = buildTaskRow(userId, date, task, true);
  logTaskWrite("upsert:start", { date, taskId: task.id, row: fullRow });

  let { error } = await supabase.from("tasks").upsert(fullRow);
  if (isMissingDeletedDatesColumn(error)) {
    const legacyRow = buildTaskRow(userId, date, task, false);
    logTaskWriteError("upsert:missing-deleted-dates-column", {
      date,
      taskId: task.id,
      error,
      fallbackRow: legacyRow,
    });
    ({ error } = await supabase.from("tasks").upsert(legacyRow));
  }

  if (error) {
    logTaskWriteError("upsert:error", { date, taskId: task.id, error, row: fullRow });
    throw new Error(formatSupabaseError("guardar", error));
  }

  logTaskWrite("upsert:success", { date, taskId: task.id });
}

export async function deleteTaskDB(taskId) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error("Error al eliminar tarea");
}

export async function batchUpsertPositions(userId, date, tasks) {
  const rows = tasks.map(task => buildTaskRow(userId, date, task, true));
  logTaskWrite("batch-upsert:start", { date, count: rows.length, taskIds: tasks.map(task => task.id) });

  let { error } = await supabase.from("tasks").upsert(rows);
  if (isMissingDeletedDatesColumn(error)) {
    const legacyRows = tasks.map(task => buildTaskRow(userId, date, task, false));
    logTaskWriteError("batch-upsert:missing-deleted-dates-column", {
      date,
      count: legacyRows.length,
      error,
      taskIds: tasks.map(task => task.id),
    });
    ({ error } = await supabase.from("tasks").upsert(legacyRows));
  }

  if (error) {
    logTaskWriteError("batch-upsert:error", {
      date,
      count: rows.length,
      error,
      taskIds: tasks.map(task => task.id),
    });
    throw new Error(formatSupabaseError("reordenar", error));
  }

  logTaskWrite("batch-upsert:success", { date, count: rows.length, taskIds: tasks.map(task => task.id) });
}
