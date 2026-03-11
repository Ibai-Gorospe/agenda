import { supabase } from "../supabase";

export async function fetchWeightLogs(userId) {
  const { data, error } = await supabase
    .from("weight_logs").select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw new Error("Error al cargar registros de peso");
  return data.map(l => ({ id: l.id, date: l.date, weight_kg: Number(l.weight_kg) }));
}

export async function upsertWeightLog(userId, date, weightKg) {
  const { data, error } = await supabase.from("weight_logs").upsert(
    { user_id: userId, date, weight_kg: weightKg },
    { onConflict: "user_id,date" }
  ).select("id, date, weight_kg").single();
  if (error) throw new Error("Error al guardar peso");
  return { id: data.id, date: data.date, weight_kg: Number(data.weight_kg) };
}

export async function fetchWeightGoal(userId) {
  const { data } = await supabase
    .from("user_settings").select("weight_goal_kg")
    .eq("user_id", userId).single();
  return data?.weight_goal_kg ? Number(data.weight_goal_kg) : null;
}

export async function deleteWeightLog(id) {
  const { error } = await supabase.from("weight_logs").delete().eq("id", id);
  if (error) throw new Error("Error al eliminar registro de peso");
}

export async function upsertWeightGoal(userId, goalKg) {
  const { error } = await supabase.from("user_settings").upsert(
    { user_id: userId, weight_goal_kg: goalKg },
    { onConflict: "user_id" }
  );
  if (error) throw new Error("Error al guardar objetivo");
}
