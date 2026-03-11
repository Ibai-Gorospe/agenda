import { useState, useEffect, memo } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { T } from "../theme";
import { CATEGORIES, GYM_ID } from "../constants";
import { todayStr, formatDateLabel, isWeekend, isTaskDone, isTaskOpen, isTaskSkipped } from "../helpers";
import { Dumbbell, Plus, Sparkles, Sun, SearchX } from "lucide-react";
import SortableTask from "./SortableTask";
import SortableWorkoutTask from "./SortableWorkoutTask";
import CompletedDivider from "./CompletedDivider";

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function DayView({ date, tasks, onAddTask, onAddWorkout, onToggle, onEdit, onDelete, onMoveTask, onReorder, onToggleSubtask, onDuplicate,
                   pendingPastCount, onMovePendingToToday, onDismissPending, onSelectPending, showPendingBanner,
                   activeCategory, onSetActiveCategory, highlightedTaskId }) {

  // Sort preference (persisted)
  const [sortByPriority, setSortByPriority] = useState(() =>
    localStorage.getItem("agenda-sortByPriority") === "true"
  );
  useEffect(() => {
    localStorage.setItem("agenda-sortByPriority", String(sortByPriority));
  }, [sortByPriority]);

  const allDayTasks = [...(tasks[date] || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // Separate workout and regular tasks
  const workoutTasks = allDayTasks.filter(t => t.category === GYM_ID);
  const regularTasks = allDayTasks.filter(t => t.category !== GYM_ID);

  // Split into pending/done (unfiltered — used by DnD handlers)
  const openWorkout = workoutTasks.filter(isTaskOpen);
  const doneWorkout = workoutTasks.filter(isTaskDone);
  const skippedWorkout = workoutTasks.filter(isTaskSkipped);
  const openRegular = regularTasks.filter(isTaskOpen);
  const doneRegular = regularTasks.filter(isTaskDone);
  const skippedRegular = regularTasks.filter(isTaskSkipped);

  // Apply category filter
  const displayWorkout = activeCategory
    ? (activeCategory === GYM_ID ? workoutTasks : [])
    : workoutTasks;
  const displayRegular = activeCategory
    ? (activeCategory === GYM_ID ? [] : regularTasks.filter(t => t.category === activeCategory))
    : regularTasks;

  // Split filtered into pending/done (for display)
  const displayOpenWorkout = displayWorkout.filter(isTaskOpen);
  const displayDoneWorkout = displayWorkout.filter(isTaskDone);
  const displaySkippedWorkout = displayWorkout.filter(isTaskSkipped);
  const displayOpenRegular = displayRegular.filter(isTaskOpen);
  const displayDoneRegular = displayRegular.filter(isTaskDone);
  const displaySkippedRegular = displayRegular.filter(isTaskSkipped);

  // Apply priority sorting when enabled
  const sortByPriorityFn = (a, b) => {
    const pa = PRIORITY_RANK[a.priority] ?? 3;
    const pb = PRIORITY_RANK[b.priority] ?? 3;
    return pa !== pb ? pa - pb : (a.position ?? 0) - (b.position ?? 0);
  };
  const sortedOpenWorkout = sortByPriority
    ? [...displayOpenWorkout].sort(sortByPriorityFn)
    : displayOpenWorkout;
  const sortedOpenRegular = sortByPriority
    ? [...displayOpenRegular].sort(sortByPriorityFn)
    : displayOpenRegular;

  // Combined arrays for SortableContext (pending first, done last)
  const allDisplayWorkout = [...sortedOpenWorkout, ...displayDoneWorkout, ...displaySkippedWorkout];
  const allDisplayRegular = [...sortedOpenRegular, ...displayDoneRegular, ...displaySkippedRegular];

  const isToday = date === todayStr();
  const weekend = isWeekend(date);
  const pendingCount = allDayTasks.filter(isTaskOpen).length;
  const doneCount = allDayTasks.filter(isTaskDone).length;
  const skippedCount = allDayTasks.filter(isTaskSkipped).length;

  const uniqueCategories = [...new Set(allDayTasks.map(t => t.category).filter(Boolean))];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleWorkoutDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = openWorkout.findIndex(t => t.id === active.id);
    const newIdx = openWorkout.findIndex(t => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(date, [...arrayMove(openWorkout, oldIdx, newIdx), ...doneWorkout, ...skippedWorkout, ...openRegular, ...doneRegular, ...skippedRegular]);
  };

  const handleRegularDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = openRegular.findIndex(t => t.id === active.id);
    const newIdx = openRegular.findIndex(t => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(date, [...openWorkout, ...doneWorkout, ...skippedWorkout, ...arrayMove(openRegular, oldIdx, newIdx), ...doneRegular, ...skippedRegular]);
  };

  // Workout section stats
  const workoutExercisesTotal = displayWorkout.reduce((sum, t) => sum + (t.subtasks || []).length, 0);
  const workoutExercisesDone = displayWorkout.reduce((sum, t) => sum + (t.subtasks || []).filter(s => s.done).length, 0);
  const workoutsDone = displayWorkout.filter(isTaskDone).length;

  return (
    <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
      {/* Day header card */}
      <div style={{
        background: weekend
          ? "var(--weekend-grad)"
          : T.accentGrad,
        borderRadius: T.r5, padding: "1.25rem 1.5rem",
        marginBottom: "1.25rem",
        boxShadow: `0 4px 20px var(--accent-shadow)`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {isToday && (
              <span style={{
                display: "inline-block", background: "rgba(255,255,255,.3)",
                color: T.textOnAccent, fontSize: ".72rem", fontWeight: 700,
                padding: "2px 10px", borderRadius: T.r5, marginBottom: ".4rem",
                letterSpacing: ".06em",
              }}>HOY</span>
            )}
            {weekend && !isToday && (
              <span style={{
                display: "inline-block", background: "rgba(255,255,255,.25)",
                color: T.textOnAccent, fontSize: ".72rem", fontWeight: 700,
                padding: "2px 10px", borderRadius: T.r5, marginBottom: ".4rem",
                letterSpacing: ".06em",
              }}>FIN DE SEMANA</span>
            )}
            <h2 style={{
              color: T.textOnAccent, fontSize: "1.35rem", fontWeight: 700,
              textTransform: "capitalize", lineHeight: 1.2,
              margin: 0,
            }}>{formatDateLabel(date)}</h2>
          </div>
          {allDayTasks.length > 0 && (
            <div style={{ textAlign: "right" }}>
              {pendingCount > 0 && <div style={{ color: "rgba(255,255,255,.9)", fontSize: ".82rem", fontWeight: 600 }}>{pendingCount} pendiente{pendingCount > 1 ? "s" : ""}</div>}
              {doneCount > 0 && <div style={{ color: "rgba(255,255,255,.65)", fontSize: ".78rem" }}>{doneCount} completada{doneCount > 1 ? "s" : ""}</div>}
              {skippedCount > 0 && <div style={{ color: "rgba(255,255,255,.58)", fontSize: ".76rem" }}>{skippedCount} omitida{skippedCount > 1 ? "s" : ""}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Pending tasks from past days banner */}
      {showPendingBanner && pendingPastCount > 0 && (
        <div className="task-card" style={{
          background: T.accentLight,
          border: `1.5px solid ${T.border}`,
          borderRadius: T.r3,
          padding: ".85rem 1rem",
          marginBottom: "1rem",
        }}>
          <p style={{ color: T.textSub, fontSize: ".88rem", margin: "0 0 .6rem", lineHeight: 1.4 }}>
            Tienes <strong style={{ color: T.accentDark }}>{pendingPastCount}</strong> tarea{pendingPastCount > 1 ? "s" : ""} pendiente{pendingPastCount > 1 ? "s" : ""} de días anteriores
          </p>
          <div style={{ display: "flex", gap: ".4rem" }}>
            <button onClick={onMovePendingToToday} style={{
              flex: 1, padding: ".55rem .6rem", background: T.accentGrad,
              border: "none", borderRadius: T.r3, color: T.textOnAccent,
              fontWeight: 600, fontSize: ".8rem", cursor: "pointer",
              boxShadow: `0 2px 8px var(--accent-shadow)`,
            }}>Mover todas</button>
            <button onClick={onSelectPending} style={{
              flex: 1, padding: ".55rem .6rem", background: T.bgCard,
              border: `1.5px solid ${T.border}`, borderRadius: T.r3,
              color: T.accentDark, fontWeight: 600, fontSize: ".8rem", cursor: "pointer",
            }}>Seleccionar</button>
            <button onClick={onDismissPending} style={{
              padding: ".55rem .6rem", background: T.bg,
              border: `1.5px solid ${T.borderGray}`, borderRadius: T.r3,
              color: T.textMuted, fontWeight: 600, fontSize: ".8rem", cursor: "pointer",
            }}>Ignorar</button>
          </div>
        </div>
      )}

      {/* Filter & sort bar */}
      {allDayTasks.length > 0 && (
        <div style={{
          display: "flex", gap: ".35rem", marginBottom: "1rem",
          overflowX: "auto", paddingBottom: ".2rem", alignItems: "center",
        }}>
          {/* Priority sort toggle */}
          <button onClick={() => setSortByPriority(p => !p)} style={{
            padding: ".3rem .7rem", borderRadius: "20px", fontSize: ".75rem", fontWeight: 600,
            cursor: "pointer", flexShrink: 0,
            background: sortByPriority ? T.accent : "transparent",
            border: `1.5px solid ${sortByPriority ? T.accent : T.borderGray}`,
            color: sortByPriority ? T.textOnAccent : T.textMuted,
            display: "flex", alignItems: "center", gap: ".25rem",
          }}>
            <span style={{ fontSize: ".7rem" }}>↕</span> Prioridad
          </button>

          {/* Separator + category chips */}
          {uniqueCategories.length >= 2 && (
            <>
              <div style={{ width: "1px", height: "20px", background: T.borderGray, flexShrink: 0, margin: "0 .1rem" }} />
              <button onClick={() => onSetActiveCategory(null)} style={{
                padding: ".3rem .7rem", borderRadius: "20px", fontSize: ".75rem", fontWeight: 600,
                cursor: "pointer", flexShrink: 0,
                background: !activeCategory ? T.accent : "transparent",
                border: `1.5px solid ${!activeCategory ? T.accent : T.borderGray}`,
                color: !activeCategory ? T.textOnAccent : T.textMuted,
              }}>Todas</button>
              {CATEGORIES.filter(c => uniqueCategories.includes(c.id)).map(c => (
                <button key={c.id} onClick={() => onSetActiveCategory(activeCategory === c.id ? null : c.id)} style={{
                  padding: ".3rem .7rem", borderRadius: "20px", fontSize: ".75rem", fontWeight: 600,
                  cursor: "pointer", flexShrink: 0,
                  background: activeCategory === c.id ? c.color : "transparent",
                  border: `1.5px solid ${activeCategory === c.id ? c.color : T.borderGray}`,
                  color: activeCategory === c.id ? T.textOnAccent : T.textMuted,
                }}>{c.label}</button>
              ))}
            </>
          )}
        </div>
      )}

      {/* ━━━ WORKOUT SECTION ━━━ */}
      {allDisplayWorkout.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          {/* Workout section header */}
          <div style={{
            background: T.gymGrad,
            borderRadius: T.r4, padding: "1rem 1.2rem",
            marginBottom: ".65rem",
            boxShadow: T.gymShadow,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
              <Dumbbell size={20} color="#fff" />
              <div>
                <span style={{ color: T.textOnAccent, fontWeight: 700, fontSize: ".92rem", display: "block" }}>Entrenamiento</span>
                {workoutExercisesTotal > 0 && (
                  <span style={{ color: "rgba(255,255,255,.7)", fontSize: ".72rem" }}>
                    {workoutExercisesDone}/{workoutExercisesTotal} ejercicios
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <span style={{ color: "rgba(255,255,255,.8)", fontSize: ".75rem", fontWeight: 600 }}>
                {workoutsDone}/{displayWorkout.length}
              </span>
              <button onClick={onAddWorkout} aria-label="Añadir entrenamiento" style={{
                width: "28px", height: "28px", borderRadius: T.r2,
                background: "rgba(255,255,255,.2)", border: "none",
                color: T.textOnAccent, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><Plus size={16} /></button>
            </div>
          </div>

          {/* Workout cards */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWorkoutDragEnd}>
            <SortableContext items={allDisplayWorkout.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
                {sortedOpenWorkout.map(task => (
                  <SortableWorkoutTask key={task.id} task={task} date={date}
                    onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
                    onToggleSubtask={onToggleSubtask}
                    onMoveTask={onMoveTask} onDuplicate={onDuplicate}
                    highlightedTaskId={highlightedTaskId}
                    hideDragHandle={sortByPriority} />
                ))}
              </div>
              {displayDoneWorkout.length > 0 && (
                <>
                  <CompletedDivider count={displayDoneWorkout.length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
                    {displayDoneWorkout.map(task => (
                      <SortableWorkoutTask key={task.id} task={task} date={date}
                        onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
                        onToggleSubtask={onToggleSubtask}
                        onMoveTask={onMoveTask} onDuplicate={onDuplicate}
                        highlightedTaskId={highlightedTaskId} />
                    ))}
                  </div>
                </>
              )}
              {displaySkippedWorkout.length > 0 && (
                <>
                  <CompletedDivider count={displaySkippedWorkout.length} label="Omitidas" />
                  <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
                    {displaySkippedWorkout.map(task => (
                      <SortableWorkoutTask key={task.id} task={task} date={date}
                        onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
                        onToggleSubtask={onToggleSubtask}
                        onMoveTask={onMoveTask} onDuplicate={onDuplicate}
                        highlightedTaskId={highlightedTaskId} />
                    ))}
                  </div>
                </>
              )}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* ━━━ REGULAR TASKS SECTION ━━━ */}

      {/* Empty state (only if both sections empty) */}
      {allDisplayRegular.length === 0 && allDisplayWorkout.length === 0 && (
        <div style={{
          textAlign: "center", padding: "3rem 1rem",
          background: T.bgCard, borderRadius: T.r4,
          boxShadow: T.shadowCard, marginBottom: "1rem",
        }}>
          <div style={{ marginBottom: ".6rem", display: "flex", justifyContent: "center" }}>
            {activeCategory
              ? <SearchX size={40} style={{ color: T.textMuted }} />
              : weekend
                ? <Sun size={40} style={{ color: T.weekend }} />
                : <Sparkles size={40} style={{ color: T.accent }} />}
          </div>
          <p style={{ color: T.textMuted, fontSize: ".9rem" }}>
            {activeCategory ? "Sin tareas en esta categoría" : weekend ? "Día libre, sin tareas" : "Sin tareas para este día"}
          </p>
        </div>
      )}

      {/* Regular task list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRegularDragEnd}>
        <SortableContext items={allDisplayRegular.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: ".65rem", marginBottom: (displayDoneRegular.length > 0 || displaySkippedRegular.length > 0) ? "0" : "1rem" }}>
            {sortedOpenRegular.map(task => (
              <SortableTask key={task.id} task={task} date={date} weekend={weekend}
                onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
                onToggleSubtask={onToggleSubtask}
                onMoveTask={onMoveTask} onDuplicate={onDuplicate}
                highlightedTaskId={highlightedTaskId}
                hideDragHandle={sortByPriority} />
            ))}
          </div>
          {displayDoneRegular.length > 0 && (
            <>
              <CompletedDivider count={displayDoneRegular.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: ".65rem", marginBottom: "1rem" }}>
                {displayDoneRegular.map(task => (
                  <SortableTask key={task.id} task={task} date={date} weekend={weekend}
                    onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
                    onToggleSubtask={onToggleSubtask}
                    onMoveTask={onMoveTask} onDuplicate={onDuplicate}
                    highlightedTaskId={highlightedTaskId} />
                ))}
              </div>
            </>
          )}
          {displaySkippedRegular.length > 0 && (
            <>
              <CompletedDivider count={displaySkippedRegular.length} label="Omitidas" />
              <div style={{ display: "flex", flexDirection: "column", gap: ".65rem", marginBottom: "1rem" }}>
                {displaySkippedRegular.map(task => (
                  <SortableTask key={task.id} task={task} date={date} weekend={weekend}
                    onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
                    onToggleSubtask={onToggleSubtask}
                    onMoveTask={onMoveTask} onDuplicate={onDuplicate}
                    highlightedTaskId={highlightedTaskId} />
                ))}
              </div>
            </>
          )}
        </SortableContext>
      </DndContext>

      {/* Add button */}
      <button onClick={onAddTask} style={{
        width: "100%", padding: "1rem",
        background: T.bgCard,
        border: `2px dashed ${weekend ? T.weekendBorder : T.border}`,
        borderRadius: T.r4,
        color: weekend ? T.weekend : T.accent,
        fontWeight: 600, fontSize: ".95rem", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
      }}>
        <Plus size={18} /> Añadir tarea
      </button>
    </div>
  );
}

export default memo(DayView);
