import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { supabase } from "./supabase";
import { T, GLOBAL_CSS } from "./theme";
import { MONTHS_ES } from "./constants";
import { Sun, Moon, BarChart3, Search, CalendarDays, CalendarRange, Calendar, LayoutGrid, Scale, ChevronLeft, ChevronRight, WifiOff, AlertTriangle, LogOut } from "lucide-react";
import { todayStr, pad, getWeekStart, formatWeekRange, nextRecurrenceDate, genId, formatDateLabel, dateAdd } from "./helpers";
import { fetchTasks, upsertTask, deleteTaskDB, batchUpsertPositions } from "./api/tasks";
import { supportsNotif, scheduleNotification } from "./api/notifications";
import { useOfflineQueue } from "./hooks/useOfflineQueue";
import { useSwipeNav } from "./hooks/useSwipeNav";

import ToastContainer from "./components/ToastContainer";
import LoginScreen from "./components/LoginScreen";
import FloatingAddButton from "./components/FloatingAddButton";

const DayView = lazy(() => import("./components/DayView"));
const WeekView = lazy(() => import("./components/WeekView"));
const MonthView = lazy(() => import("./components/MonthView"));
const YearView = lazy(() => import("./components/YearView"));
const WeightView = lazy(() => import("./components/WeightView"));
const SearchModal = lazy(() => import("./components/SearchModal"));
const TaskModal = lazy(() => import("./components/TaskModal"));
const MoveTaskPicker = lazy(() => import("./components/MoveTaskPicker"));
const StatsView = lazy(() => import("./components/StatsView"));
const PendingTasksSelector = lazy(() => import("./components/PendingTasksSelector"));

export default function App() {
  const [user, setUser] = useState(undefined);
  const [tasks, setTasks] = useState({});
  const [activeView, setActiveView] = useState(() => localStorage.getItem("agenda-activeView") || "day");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayStr()));
  const [modal, setModal] = useState(null);
  const [movePicker, setMovePicker] = useState(null);
  const [dismissedPendingBanner, setDismissedPendingBanner] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchOpen, setSearchOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showPendingSelector, setShowPendingSelector] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("agenda-dark");
    if (saved !== null) return saved === "true";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  const undoRef = useRef(null);
  const today = todayStr();
  const { enqueue, flush } = useOfflineQueue();

  // ── Toast system ──
  const addToast = useCallback((message, type = "info", action = null, duration = 4000) => {
    const id = genId();
    setToasts(prev => [...prev.slice(-4), { id, message, type, action, exiting: false }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250);
      }, duration);
    }
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250);
  }, []);

  // Persist active view
  useEffect(() => { localStorage.setItem("agenda-activeView", activeView); }, [activeView]);

  // Dark mode: apply to document + persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("agenda-dark", darkMode);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", darkMode ? "#080A10" : "#F1F3F9");
  }, [darkMode]);

  // Inject global CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load tasks
  useEffect(() => {
    if (user === undefined) return;
    if (!user || user.guest) { setTasks({}); return; }
    setTasksLoading(true);
    fetchTasks(user.id)
      .then(setTasks)
      .catch(() => addToast("No se pudieron cargar las tareas. Revisa tu conexión.", "error"))
      .finally(() => setTasksLoading(false));
  }, [user, addToast]);

  // Notifications
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && !modal) { e.preventDefault(); setModal({ date: selectedDate }); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal, selectedDate]);

  // Bug fix #2: flush pending deletes when page is hidden
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

  // Clear highlight after a delay
  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => setHighlightedTaskId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

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

  // Bug fix #3: compute savedTask inside setTasks updater to avoid stale closure
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
          addToast("Tarea restaurada", "success", null, 2000);
        }
      }
    }, 5000);
    undoData.timer = setTimeout(async () => {
      if (undoRef.current === undoData) {
        undoRef.current = null;
        if (user && !user.guest) {
          try { await deleteTaskDB(id); }
          catch { addToast("Error al eliminar en el servidor", "error"); }
        }
      }
    }, 5000);
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
    addToast("Tarea duplicada", "success", null, 2000);
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

  const pendingPastCount = useMemo(() => {
    if (selectedDate !== today) return 0;
    let count = 0;
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      if (date < today) count += dayTasks.filter(t => !t.done).length;
    });
    return count;
  }, [tasks, selectedDate, today]);

  const moveAllPendingToToday = useCallback(async () => {
    const todayDate = todayStr();
    const updates = [];
    setTasks(prev => {
      const newTasks = {};
      let todayTasks = [...(prev[todayDate] || [])];
      let position = todayTasks.length;
      Object.entries(prev).forEach(([date, dayTasks]) => {
        if (date >= todayDate) { newTasks[date] = dayTasks; return; }
        const pending = dayTasks.filter(t => !t.done);
        const remaining = dayTasks.filter(t => t.done);
        pending.forEach(task => {
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
    if (user && !user.guest) {
      await withSync(async () => {
        await Promise.all(
          updates.map(u => supabase.from("tasks").update({ date: u.date, position: u.position }).eq("id", u.id))
        );
      });
    }
  }, [user, withSync]);

  // Pending past tasks grouped by date (for selector modal)
  const pendingPastTasks = useMemo(() => {
    if (selectedDate !== today) return [];
    const result = [];
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      if (date < today) {
        const pending = dayTasks.filter(t => !t.done);
        if (pending.length > 0) result.push({ date, tasks: pending });
      }
    });
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [tasks, selectedDate, today]);

  const moveSelectedPendingToToday = useCallback(async (selectedIds) => {
    const todayDate = todayStr();
    const updates = [];
    setTasks(prev => {
      const newTasks = {};
      let todayTasks = [...(prev[todayDate] || [])];
      let position = todayTasks.length;
      Object.entries(prev).forEach(([date, dayTasks]) => {
        if (date >= todayDate) { newTasks[date] = dayTasks; return; }
        const toMove = dayTasks.filter(t => selectedIds.has(t.id));
        const remaining = dayTasks.filter(t => !selectedIds.has(t.id));
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
    setShowPendingSelector(false);
    if (user && !user.guest) {
      await withSync(async () => {
        await Promise.all(
          updates.map(u => supabase.from("tasks").update({ date: u.date, position: u.position }).eq("id", u.id))
        );
      });
    }
    addToast(`${selectedIds.size} tarea${selectedIds.size > 1 ? "s" : ""} movida${selectedIds.size > 1 ? "s" : ""} a hoy`, "success", null, 3000);
  }, [user, withSync, addToast]);

  // Swipe navigation for day view
  const swipeHandlers = useSwipeNav({
    onSwipeLeft: () => activeView === "day" && setSelectedDate(prev => dateAdd(prev, 1)),
    onSwipeRight: () => activeView === "day" && setSelectedDate(prev => dateAdd(prev, -1)),
  });

  // PWA shortcut: ?action=new-task
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new-task" && user) {
      setModal({ date: todayStr() });
      window.history.replaceState({}, "", "/");
    }
  }, [user]);

  // Loading screen
  if (user === undefined) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", background: T.bgPage, gap: "1rem" }}>
      <img src="/icon-192.png" alt="Agenda" style={{
        width: "48px", height: "48px", borderRadius: "14px",
        boxShadow: `0 4px 16px var(--accent-shadow)` }} />
      <div style={{ width: "24px", height: "24px", border: `3px solid ${T.borderGray}`,
        borderTopColor: T.accent, borderRadius: "50%", animation: "spin .6s linear infinite" }} />
    </div>
  );

  if (!user) return <LoginScreen onLogin={setUser} />;

  const isGuest = user?.guest;
  const prevMonth = () => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1);
  const nextMonth = () => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1);

  const navItems = [
    { key: "day", icon: CalendarDays, label: "Hoy" },
    { key: "week", icon: CalendarRange, label: "Semana" },
    { key: "month", icon: Calendar, label: "Mes" },
    { key: "year", icon: LayoutGrid, label: "Año" },
    { key: "weight", icon: Scale, label: "Peso" },
  ];

  const activeIdx = navItems.findIndex(n => n.key === activeView);

  return (
    <div style={{
      minHeight: "100dvh", background: T.bgPage,
      display: "flex", flexDirection: "column",
      maxWidth: "600px", margin: "0 auto",
    }}>
      {/* Header */}
      <header style={{
        padding: "env(safe-area-inset-top, .75rem) 1.25rem .75rem",
        paddingTop: "max(env(safe-area-inset-top), .75rem)",
        background: T.bgCard,
        borderBottom: `1px solid ${T.borderGray}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 20,
        boxShadow: T.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <img src="/icon-192.png" alt="Agenda" style={{
            width: "36px", height: "36px", borderRadius: T.r3,
            boxShadow: `0 2px 8px var(--accent-shadow)`,
          }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <span style={{ fontWeight: 700, fontSize: ".95rem", color: T.text }}>Agenda</span>
              {syncing && (
                <div style={{ width: "12px", height: "12px", border: `2px solid ${T.borderGray}`,
                  borderTopColor: T.accent, borderRadius: "50%", animation: "spin .6s linear infinite" }} />
              )}
            </div>
            <div style={{ fontSize: ".72rem", color: T.textMuted }}>
              {isGuest ? "Modo invitado" : user.email}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: ".4rem" }}>
          <button onClick={() => setDarkMode(d => !d)} aria-label={darkMode ? "Modo claro" : "Modo oscuro"} style={{
            background: T.bg, border: "none", borderRadius: T.r2,
            color: T.textSub, padding: ".4rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button onClick={() => setStatsOpen(true)} aria-label="Estadísticas" style={{
            background: T.bg, border: "none", borderRadius: T.r2,
            color: T.textSub, padding: ".4rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><BarChart3 size={16} /></button>
          <button onClick={() => setSearchOpen(true)} aria-label="Buscar tareas" style={{
            background: T.bg, border: "none", borderRadius: T.r2,
            color: T.textSub, padding: ".4rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><Search size={16} /></button>
          {isGuest && (
            <button onClick={() => { setUser(null); setTasks({}); }} style={{
              background: T.accentLight, border: "none", borderRadius: "8px",
              color: T.accentDark, padding: ".35rem .7rem", cursor: "pointer",
              fontSize: ".78rem", fontWeight: 600,
            }}>Crear cuenta</button>
          )}
          <button onClick={async () => {
            if (!isGuest) await supabase.auth.signOut();
            setUser(null); setTasks({});
          }} aria-label="Cerrar sesión" style={{
            background: T.bg, border: `1px solid ${T.borderGray}`,
            borderRadius: "8px", color: T.textSub,
            padding: ".35rem .7rem", cursor: "pointer", fontSize: ".78rem",
          }}>Salir</button>
        </div>
      </header>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{
          background: T.dangerBg, borderBottom: `1px solid ${T.danger}20`,
          padding: ".55rem 1.25rem", display: "flex", alignItems: "center", gap: ".5rem",
        }}>
          <WifiOff size={14} style={{ color: T.dangerText, flexShrink: 0 }} />
          <p style={{ color: T.dangerText, fontSize: ".78rem", margin: 0 }}>
            Sin conexión — los cambios se guardarán automáticamente cuando vuelvas a tener red.
          </p>
        </div>
      )}

      {/* Guest banner */}
      {isGuest && (
        <div style={{
          background: T.accentLight, borderBottom: `1px solid ${T.border}`,
          padding: ".55rem 1.25rem", display: "flex", alignItems: "center", gap: ".5rem",
        }}>
          <AlertTriangle size={14} style={{ color: T.accentDark, flexShrink: 0 }} />
          <p style={{ color: T.accentDark, fontSize: ".78rem", margin: 0 }}>
            Sin cuenta — las tareas no se guardarán.{" "}
            <button onClick={() => { setUser(null); setTasks({}); }} style={{
              background: "none", border: "none", color: T.accentDark,
              cursor: "pointer", fontSize: ".78rem", fontWeight: 700,
              textDecoration: "underline", padding: 0,
            }}>Registrarse</button>
          </p>
        </div>
      )}

      {/* Calendar nav bar — month / year */}
      {(activeView === "month" || activeView === "year") && (
        <div style={{
          padding: ".65rem 1.25rem",
          background: T.bgCard, borderBottom: `1px solid ${T.borderGray}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={prevMonth} aria-label="Mes anterior" style={{
            background: T.bg, border: "none", borderRadius: T.r2,
            color: T.text, cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}><ChevronLeft size={18} /></button>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: T.text }}>
            {activeView === "year" ? calYear : `${MONTHS_ES[calMonth]} ${calYear}`}
          </span>
          <button onClick={nextMonth} aria-label="Mes siguiente" style={{
            background: T.bg, border: "none", borderRadius: T.r2,
            color: T.text, cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}><ChevronRight size={18} /></button>
        </div>
      )}

      {/* Week nav bar */}
      {activeView === "week" && (
        <div style={{
          padding: ".5rem 1rem",
          background: T.bgCard, borderBottom: `1px solid ${T.borderGray}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => {
            const d = new Date(weekStart + "T12:00:00"); d.setDate(d.getDate() - 7);
            setWeekStart(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          }} aria-label="Semana anterior" style={{
            background: T.bg, border: "none", borderRadius: T.r2,
            color: T.text, cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}><ChevronLeft size={18} /></button>

          <button onClick={() => setWeekStart(getWeekStart(todayStr()))} style={{
            background: weekStart === getWeekStart(todayStr()) ? T.accentLight : T.bg,
            border: "none", borderRadius: "8px",
            color: weekStart === getWeekStart(todayStr()) ? T.accentDark : T.textSub,
            fontSize: ".82rem", fontWeight: 700, padding: ".35rem .8rem",
            cursor: "pointer",
          }}>{formatWeekRange(weekStart)}</button>

          <button onClick={() => {
            const d = new Date(weekStart + "T12:00:00"); d.setDate(d.getDate() + 7);
            setWeekStart(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          }} aria-label="Semana siguiente" style={{
            background: T.bg, border: "none", borderRadius: T.r2,
            color: T.text, cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}><ChevronRight size={18} /></button>
        </div>
      )}

      {/* Day nav */}
      {activeView === "day" && (
        <div style={{
          padding: ".5rem 1rem",
          background: T.bgCard, borderBottom: `1px solid ${T.borderGray}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => setSelectedDate(prev => dateAdd(prev, -1))} aria-label="Día anterior" style={{
            background: T.bg, border: "none", borderRadius: T.r2,
            color: T.text, cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}><ChevronLeft size={18} /></button>

          <button onClick={() => setSelectedDate(today)} style={{
            background: selectedDate === today ? T.accentLight : T.bg,
            border: "none", borderRadius: "8px",
            color: selectedDate === today ? T.accentDark : T.textSub,
            fontSize: ".78rem", fontWeight: 700, padding: ".35rem .8rem",
            cursor: "pointer", letterSpacing: ".06em",
          }}>HOY</button>

          <button onClick={() => setSelectedDate(prev => dateAdd(prev, 1))} aria-label="Día siguiente" style={{
            background: T.bg, border: "none", borderRadius: T.r2,
            color: T.text, cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}><ChevronRight size={18} /></button>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto" }}
        {...(activeView === "day" ? swipeHandlers : {})}>
        <Suspense fallback={
          <div style={{ padding: "1.25rem 1rem", maxWidth: "600px", margin: "0 auto" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: T.bgCard, borderRadius: "16px", padding: "1.1rem 1rem",
                marginBottom: ".65rem", boxShadow: T.shadowCard,
              }}>
                <div style={{ height: "14px", width: `${55 + i * 12}%`, background: T.bgPage,
                  borderRadius: "6px", animation: "pulse 1.2s infinite" }} />
                <div style={{ height: "10px", width: "35%", background: T.bgPage,
                  borderRadius: "4px", marginTop: ".6rem", animation: "pulse 1.2s infinite" }} />
              </div>
            ))}
          </div>
        }>
          {tasksLoading && activeView === "day" && (
            <div style={{ padding: "1.25rem 1rem", maxWidth: "600px", margin: "0 auto" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  background: T.bgCard, borderRadius: "16px", padding: "1.1rem 1rem",
                  marginBottom: ".65rem", boxShadow: T.shadowCard,
                }}>
                  <div style={{ height: "14px", width: `${55 + i * 12}%`, background: T.bgPage,
                    borderRadius: "6px", animation: "pulse 1.2s infinite" }} />
                  <div style={{ height: "10px", width: "35%", background: T.bgPage,
                    borderRadius: "4px", marginTop: ".6rem", animation: "pulse 1.2s infinite" }} />
                </div>
              ))}
            </div>
          )}

          {!tasksLoading && activeView === "day" && (
            <DayView date={selectedDate} tasks={tasks}
              onAddTask={() => setModal({ date: selectedDate })}
              onAddWorkout={() => setModal({ date: selectedDate, task: { category: "gym" } })}
              onToggle={handleToggle}
              onEdit={(date, task) => setModal({ date, task })}
              onDelete={handleDelete}
              onMoveTask={(date, task) => setMovePicker({ date, task })}
              onReorder={handleReorder}
              onDuplicate={handleDuplicate}
              pendingPastCount={pendingPastCount}
              onMovePendingToToday={moveAllPendingToToday}
              onDismissPending={() => setDismissedPendingBanner(true)}
              onSelectPending={() => setShowPendingSelector(true)}
              showPendingBanner={selectedDate === today && !dismissedPendingBanner}
              activeCategory={activeCategory}
              onSetActiveCategory={setActiveCategory}
              highlightedTaskId={highlightedTaskId} />
          )}
          {activeView === "week" && (
            <WeekView startDate={weekStart}
              tasks={tasks}
              onSelectDay={d => { setSelectedDate(d); setActiveView("day"); }}
              today={today} />
          )}
          {activeView === "month" && (
            <MonthView year={calYear} month={calMonth} tasks={tasks}
              onSelectDay={d => { setSelectedDate(d); setActiveView("day"); }}
              today={today} />
          )}
          {activeView === "year" && (
            <YearView year={calYear} tasks={tasks}
              onSelectMonth={m => { setCalMonth(m); setActiveView("month"); }}
              today={today} />
          )}
          {activeView === "weight" && (
            <WeightView user={user} today={today}
              onCreateAccount={() => { setUser(null); setTasks({}); }} />
          )}
        </Suspense>
      </div>

      {/* Floating add button (visible on non-day views) */}
      {activeView !== "day" && activeView !== "weight" && (
        <FloatingAddButton onClick={() => setModal({ date: selectedDate })} />
      )}

      {/* Bottom nav */}
      <nav style={{
        display: "flex",
        background: T.bgCard,
        borderTop: `1px solid ${T.borderGray}`,
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        position: "sticky", bottom: 0, zIndex: 20,
        boxShadow: T.shadow,
      }} role="tablist" aria-label="Navegación principal">
        {/* Sliding indicator */}
        <div style={{
          position: "absolute", top: 0, height: "3px",
          width: `${100 / navItems.length}%`,
          background: T.accentGrad, borderRadius: `0 0 ${T.r1} ${T.r1}`,
          transform: `translateX(${activeIdx * 100}%)`,
          transition: "transform .25s cubic-bezier(.32,1,.23,1)",
          left: 0,
        }} />
        {navItems.map(({ key, icon: Icon, label }) => {
          const active = activeView === key;
          return (
            <button key={key} onClick={() => setActiveView(key)}
              role="tab" aria-selected={active} aria-label={label}
              style={{
                flex: 1, padding: ".7rem .5rem .6rem", background: "none", border: "none",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", gap: ".2rem", position: "relative",
              }}>
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8}
                style={{ color: active ? T.accentDark : T.textMuted }} />
              <span style={{
                fontSize: ".65rem", fontWeight: active ? 600 : 400,
                color: active ? T.accentDark : T.textMuted,
                letterSpacing: ".04em",
              }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      <Suspense fallback={null}>
        {modal && (
          <TaskModal date={modal.date} task={modal.task}
            onSave={(task) => persistTask(modal.date, task)}
            onClose={() => setModal(null)} />
        )}
        {movePicker && (
          <MoveTaskPicker
            currentDate={movePicker.date}
            onMove={(toDate) => moveTask(movePicker.date, toDate, movePicker.task.id)}
            onClose={() => setMovePicker(null)} />
        )}
        {searchOpen && (
          <SearchModal
            tasks={tasks}
            onSelectTask={(date, taskId) => {
              setSelectedDate(date);
              setActiveView("day");
              if (taskId) setHighlightedTaskId(taskId);
            }}
            onClose={() => setSearchOpen(false)} />
        )}
        {statsOpen && (
          <StatsView tasks={tasks} today={today} onClose={() => setStatsOpen(false)} />
        )}
        {showPendingSelector && pendingPastTasks.length > 0 && (
          <PendingTasksSelector
            pendingGroups={pendingPastTasks}
            onMove={moveSelectedPendingToToday}
            onClose={() => setShowPendingSelector(false)} />
        )}
      </Suspense>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
