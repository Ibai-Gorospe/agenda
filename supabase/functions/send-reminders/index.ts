import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Helpers de timezone ──────────────────────────────────────

function nowInMadrid(): Date {
  const now = new Date();
  const madridStr = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
  return new Date(madridStr);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── Lógica de recurrencia (replica src/helpers.js) ───────────

function taskOccursOn(
  taskDate: string,
  recurrence: string | null,
  targetDateStr: string
): boolean {
  if (!recurrence) return taskDate === targetDateStr;
  if (taskDate > targetDateStr) return false;

  const target = new Date(targetDateStr + "T12:00:00");
  const original = new Date(taskDate + "T12:00:00");
  const dayOfWeek = target.getDay(); // 0=Dom, 1=Lun, ...

  if (recurrence === "daily") return true;
  if (recurrence === "weekdays") return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (recurrence === "weekly") return original.getDay() === dayOfWeek;
  if (recurrence === "monthly") return original.getDate() === target.getDate();
  if (recurrence.startsWith("days:")) {
    const days = new Set(recurrence.slice(5).split(",").map(Number));
    return days.has(dayOfWeek);
  }
  return taskDate === targetDateStr;
}

function getSeriesId(task: any): string {
  return task.series_id ?? task.id;
}

function getScheduledDate(task: any): string {
  return task.scheduled_date ?? task.date;
}

function selectTasksForDate(tasks: any[], targetDateStr: string) {
  const bySeries = new Map<string, any[]>();

  for (const task of tasks) {
    const seriesId = getSeriesId(task);
    if (!bySeries.has(seriesId)) bySeries.set(seriesId, []);
    bySeries.get(seriesId)!.push(task);
  }

  const selected: any[] = [];

  bySeries.forEach((seriesTasks) => {
    seriesTasks.sort((a, b) => getScheduledDate(a).localeCompare(getScheduledDate(b)));

    const concreteInstance = seriesTasks.find((task) => getScheduledDate(task) === targetDateStr);
    if (concreteInstance) {
      selected.push(concreteInstance);
      return;
    }

    const fallback = seriesTasks
      .filter((task) =>
        getScheduledDate(task) < targetDateStr &&
        taskOccursOn(getScheduledDate(task), task.recurrence, targetDateStr)
      )
      .pop();

    if (fallback) selected.push(fallback);
  });

  return selected;
}

// ── Envío de email via Resend ────────────────────────────────

async function sendEmail(
  to: string,
  taskText: string,
  taskTime: string,
  reminderMin: string,
  taskDate: string
) {
  const mins = Number(reminderMin);
  const reminderLabel =
    mins >= 1440
      ? `${mins / 1440} día(s) antes`
      : mins >= 60
        ? `${mins / 60} hora(s) antes`
        : `${mins} minutos antes`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Agenda <onboarding@resend.dev>",
      to: [to],
      subject: `⏰ Recordatorio: ${taskText}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:20px 24px;margin-bottom:20px">
            <h2 style="color:#fff;margin:0;font-size:18px">⏰ ${taskText}</h2>
          </div>
          <p style="color:#374151;font-size:15px;line-height:1.6">
            Tienes una tarea programada para hoy a las <strong>${taskTime}</strong>.
          </p>
          <p style="color:#6b7280;font-size:13px">
            📅 ${taskDate} &nbsp;·&nbsp; 🔔 Aviso ${reminderLabel}
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
          <p style="color:#9ca3af;font-size:12px">Agenda — Tu tiempo, tu orden</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${res.status} ${err}`);
  }
}

// ── Handler principal ────────────────────────────────────────

serve(async (req) => {
  // Seguridad: verificar token compartido
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const madrid = nowInMadrid();
    const todayStr = toDateStr(madrid);
    const currentH = madrid.getHours();
    const currentM = madrid.getMinutes();

    // Obtener todas las tareas con aviso configurado y no completadas
    const { data: tasks, error: tasksErr } = await supabase
      .from("tasks")
      .select("id, user_id, date, text, time, reminder, recurrence, series_id, scheduled_date, state")
      .eq("done", false)
      .neq("reminder", "0")
      .not("time", "is", null);

    if (tasksErr) throw tasksErr;
    const openTasks = (tasks || []).filter((task) => !task.state || task.state === "open");
    if (openTasks.length === 0) {
      return jsonResponse({ sent: 0, checked: 0, today: todayStr });
    }

    const toNotify: Array<{ task: typeof tasks[0]; effectiveDate: string }> = [];

    // ── Tareas de hoy ──
    const todayTasks = selectTasksForDate(openTasks, todayStr);

    for (const task of todayTasks) {
      const [taskH, taskM] = task.time.split(":").map(Number);
      const reminderMin = parseInt(task.reminder, 10);
      const notifMinutes = taskH * 60 + taskM - reminderMin;

      if (notifMinutes < 0) continue; // aviso cruza al día anterior → ver bloque de mañana

      const notifH = Math.floor(notifMinutes / 60);
      const notifM = notifMinutes % 60;

      if (notifH === currentH && notifM === currentM) {
        toNotify.push({ task, effectiveDate: todayStr });
      }
    }

    // ── Tareas de mañana con reminder=1440 (1 día antes) ──
    const tomorrow = new Date(madrid);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateStr(tomorrow);

    const tomorrowTasks = selectTasksForDate(openTasks, tomorrowStr);

    for (const task of tomorrowTasks) {
      if (parseInt(task.reminder, 10) !== 1440) continue;
      const [taskH, taskM] = task.time.split(":").map(Number);
      if (taskH === currentH && taskM === currentM) {
        toNotify.push({ task, effectiveDate: tomorrowStr });
      }
    }

    // ── Enviar emails pendientes ──
    let sentCount = 0;

    for (const { task, effectiveDate } of toNotify) {
      // Comprobar si ya se envió
      const { data: existing } = await supabase
        .from("email_notification_log")
        .select("id")
        .eq("task_id", task.id)
        .eq("notified_date", effectiveDate)
        .maybeSingle();

      if (existing) continue;

      // Obtener email del usuario
      const { data: userData, error: userErr } =
        await supabase.auth.admin.getUserById(task.user_id);
      if (userErr || !userData?.user?.email) continue;

      try {
        await sendEmail(
          userData.user.email,
          task.text,
          task.time,
          task.reminder,
          effectiveDate
        );

        await supabase.from("email_notification_log").insert({
          task_id: task.id,
          notified_date: effectiveDate,
        });

        sentCount++;
      } catch (emailErr) {
        console.error(`Error enviando email para tarea ${task.id}:`, emailErr);
      }
    }

    // ── Limpieza mensual de logs antiguos (ejecutar a las 3:00) ──
    if (currentH === 3 && currentM === 0) {
      await supabase
        .from("email_notification_log")
        .delete()
        .lt("sent_at", new Date(Date.now() - 30 * 86400000).toISOString());
    }

    return jsonResponse({ sent: sentCount, checked: toNotify.length, today: todayStr });
  } catch (err) {
    console.error("send-reminders error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
