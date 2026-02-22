export const supportsNotif = typeof window !== "undefined" && "Notification" in window;

export function scheduleNotification(task, dateStr) {
  if (!task.time || !task.reminder || task.reminder === "0" || !supportsNotif) return;
  if (Notification.permission !== "granted") return;
  const [h, m] = task.time.split(":").map(Number);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const delay = new Date(y, mo - 1, d, h, m).getTime() - task.reminder * 60000 - Date.now();
  if (delay > 0) setTimeout(() => new Notification(`⏰ ${task.text}`, { body: `Hoy a las ${task.time}` }), delay);
}
