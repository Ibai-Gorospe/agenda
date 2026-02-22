import { supabase } from "../supabase";

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
    map[t.date].push({
      id: t.id, text: t.text, time: t.time, reminder: t.reminder,
      done: t.done, position: t.position ?? 0,
      category: t.category || null, recurrence: t.recurrence || null,
      priority: t.priority || null, notes: t.notes || null,
      subtasks: t.subtasks || [],
    });
  }
  return map;
}

export async function upsertTask(userId, date, task) {
  const { error } = await supabase.from("tasks").upsert({
    id: task.id, user_id: userId, date,
    text: task.text, time: task.time || null,
    reminder: task.reminder || "0", done: task.done,
    position: task.position ?? 0,
    category: task.category || null,
    recurrence: task.recurrence || null,
    priority: task.priority || null,
    notes: task.notes || null,
    subtasks: task.subtasks || [],
  });
  if (error) throw new Error("Error al guardar tarea");
}

export async function deleteTaskDB(taskId) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error("Error al eliminar tarea");
}

export async function batchUpsertPositions(userId, date, tasks) {
  const rows = tasks.map(t => ({
    id: t.id, user_id: userId, date,
    text: t.text, time: t.time || null,
    reminder: t.reminder || "0", done: t.done,
    position: t.position ?? 0,
    category: t.category || null,
    recurrence: t.recurrence || null,
    priority: t.priority || null,
    notes: t.notes || null,
    subtasks: t.subtasks || [],
  }));
  const { error } = await supabase.from("tasks").upsert(rows);
  if (error) throw new Error("Error al reordenar tareas");
}
