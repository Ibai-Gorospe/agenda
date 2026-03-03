import { useState, useEffect, lazy, Suspense } from "react";
import { T, GLOBAL_CSS } from "./theme";
import { MONTHS_ES, TIMINGS } from "./constants";
import { Sun, Moon, BarChart3, Search, ChevronLeft, ChevronRight, WifiOff, AlertTriangle } from "lucide-react";
import { todayStr, dateAdd } from "./helpers";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./hooks/useAuth";
import { useNavigation } from "./hooks/useNavigation";
import { useTaskManager } from "./hooks/useTaskManager";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import ToastContainer from "./components/ToastContainer";
import LoginScreen from "./components/LoginScreen";
import FloatingAddButton from "./components/FloatingAddButton";
import ErrorBoundary from "./components/ErrorBoundary";

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

const styles = {
  headerIconBtn: {
    background: T.bg, border: "none", borderRadius: T.r2,
    color: T.textSub, padding: ".4rem", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  navArrowBtn: {
    background: T.bg, border: "none", borderRadius: T.r2,
    color: T.text, cursor: "pointer",
    width: "34px", height: "34px", display: "flex",
    alignItems: "center", justifyContent: "center",
  },
};

export default function App() {
  const { user, setUser, signOut, isGuest } = useAuth();
  const {
    today, activeView, setActiveView, selectedDate, setSelectedDate,
    calMonth, setCalMonth, calYear, weekStart, setWeekStart,
    prevMonth, nextMonth, prevWeek, nextWeek,
    goToThisWeek, isThisWeek,
    swipeHandlers, navItems,
    formatWeekRange: weekRangeLabel,
  } = useNavigation();
  const { toasts, addToast, dismissToast } = useToast();
  const { darkMode, toggleDarkMode } = useTheme();
  const {
    tasks, setTasks, syncing, tasksLoading, isOnline,
    dismissedPendingBanner, setDismissedPendingBanner,
    showPendingSelector, setShowPendingSelector,
    persistTask, handleToggle, handleDelete, handleDuplicate,
    moveTask, handleReorder,
    pendingPastCount, pendingPastTasks,
    moveAllPendingToToday, moveSelectedPendingToToday,
  } = useTaskManager(user, addToast);
  const [modal, setModal] = useState(null);
  const [movePicker, setMovePicker] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  // Inject global CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useKeyboardShortcuts({
    onSearch: () => setSearchOpen(true),
    onNewTask: () => setModal({ date: selectedDate }),
  });

  // Clear highlight after a delay
  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => setHighlightedTaskId(null), TIMINGS.HIGHLIGHT_DURATION);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

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
          <button onClick={toggleDarkMode} aria-label={darkMode ? "Modo claro" : "Modo oscuro"} style={styles.headerIconBtn}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button onClick={() => setStatsOpen(true)} aria-label="Estadísticas" style={styles.headerIconBtn}>
            <BarChart3 size={16} /></button>
          <button onClick={() => setSearchOpen(true)} aria-label="Buscar tareas" style={styles.headerIconBtn}>
            <Search size={16} /></button>
          {isGuest && (
            <button onClick={() => { setUser(null); setTasks({}); }} style={{
              background: T.accentLight, border: "none", borderRadius: "8px",
              color: T.accentDark, padding: ".35rem .7rem", cursor: "pointer",
              fontSize: ".78rem", fontWeight: 600,
            }}>Crear cuenta</button>
          )}
          <button onClick={async () => {
            await signOut(); setTasks({});
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
          <button onClick={prevMonth} aria-label="Mes anterior" style={styles.navArrowBtn}>
            <ChevronLeft size={18} /></button>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: T.text }}>
            {activeView === "year" ? calYear : `${MONTHS_ES[calMonth]} ${calYear}`}
          </span>
          <button onClick={nextMonth} aria-label="Mes siguiente" style={styles.navArrowBtn}>
            <ChevronRight size={18} /></button>
        </div>
      )}

      {/* Week nav bar */}
      {activeView === "week" && (
        <div style={{
          padding: ".5rem 1rem",
          background: T.bgCard, borderBottom: `1px solid ${T.borderGray}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={prevWeek} aria-label="Semana anterior" style={styles.navArrowBtn}>
            <ChevronLeft size={18} /></button>

          <button onClick={goToThisWeek} style={{
            background: isThisWeek ? T.accentLight : T.bg,
            border: "none", borderRadius: "8px",
            color: isThisWeek ? T.accentDark : T.textSub,
            fontSize: ".82rem", fontWeight: 700, padding: ".35rem .8rem",
            cursor: "pointer",
          }}>{weekRangeLabel()}</button>

          <button onClick={nextWeek} aria-label="Semana siguiente" style={styles.navArrowBtn}>
            <ChevronRight size={18} /></button>
        </div>
      )}

      {/* Day nav */}
      {activeView === "day" && (
        <div style={{
          padding: ".5rem 1rem",
          background: T.bgCard, borderBottom: `1px solid ${T.borderGray}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => setSelectedDate(prev => dateAdd(prev, -1))} aria-label="Día anterior" style={styles.navArrowBtn}>
            <ChevronLeft size={18} /></button>

          <button onClick={() => setSelectedDate(today)} style={{
            background: selectedDate === today ? T.accentLight : T.bg,
            border: "none", borderRadius: "8px",
            color: selectedDate === today ? T.accentDark : T.textSub,
            fontSize: ".78rem", fontWeight: 700, padding: ".35rem .8rem",
            cursor: "pointer", letterSpacing: ".06em",
          }}>HOY</button>

          <button onClick={() => setSelectedDate(prev => dateAdd(prev, 1))} aria-label="Día siguiente" style={styles.navArrowBtn}>
            <ChevronRight size={18} /></button>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto" }}
        {...(activeView === "day" ? swipeHandlers : {})}>
        <ErrorBoundary>
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
        </ErrorBoundary>
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
      <ErrorBoundary>
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
      </ErrorBoundary>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
