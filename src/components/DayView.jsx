import { useEffect, useRef, memo } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { T } from "../theme";
import { getCat, CATEGORIES, getPriorityColor, GYM_ID } from "../constants";
import { todayStr, formatDateLabel, isWeekend, getRecurrenceLabel } from "../helpers";
import Badge from "./Badge";

/* ━━━ Regular Task Card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SortableTask({ task, date, weekend, onToggle, onEdit, onDelete, onMoveTask, onDuplicate, highlightedTaskId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const cardRef = useRef(null);
  const isHighlighted = highlightedTaskId === task.id;

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "all .2s",
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  const cat = task.category ? getCat(task.category) : null;
  const priorityColor = getPriorityColor(task.priority);
  const subtasksDone = (task.subtasks || []).filter(s => s.done).length;
  const subtasksTotal = (task.subtasks || []).length;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div ref={cardRef}
        className={isDragging ? "" : isHighlighted ? "task-card highlight-flash" : "task-card"}
        style={{
          background: task.done ? T.doneBg : T.bgCard,
          border: `1.5px solid ${isDragging ? T.accent : T.borderGray}`,
          borderLeft: priorityColor ? `3px solid ${priorityColor}` : `1.5px solid ${isDragging ? T.accent : T.borderGray}`,
          borderRadius: "16px", padding: ".85rem 1rem",
          boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,.15)" : (task.done ? "none" : T.shadowCard),
          position: "relative",
        }}>
        {/* Top row: drag handle + checkbox + text */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: ".7rem" }}>
          {/* Drag handle */}
          <div {...listeners} style={{
            width: "24px", minHeight: "36px", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "grab", touchAction: "none", color: T.textMuted,
            fontSize: "1rem", userSelect: "none",
          }}>⋮⋮</div>

          {/* Checkbox */}
          <button onClick={() => onToggle(date, task.id)} aria-label={task.done ? "Marcar como pendiente" : "Marcar como completada"} style={{
            width: "32px", height: "32px", borderRadius: "10px", flexShrink: 0,
            border: `2.5px solid ${task.done ? T.accent : T.borderGray}`,
            background: task.done ? T.accentGrad : "transparent",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", transition: "all .15s",
          }}>
            {task.done && <span className="check-pop" style={{ color: "#fff", fontSize: ".8rem", fontWeight: 800 }}>✓</span>}
          </button>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            onClick={() => onToggle(date, task.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              {cat && (
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                  background: task.done ? T.textMuted : cat.color,
                }} />
              )}
              <p style={{
                color: task.done ? T.textMuted : T.text,
                textDecoration: task.done ? "line-through" : "none",
                fontSize: ".97rem", lineHeight: 1.4, wordBreak: "break-word",
                margin: 0, flex: 1,
              }}>{task.text}</p>
            </div>
            {/* Subtasks progress */}
            {subtasksTotal > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".3rem" }}>
                <div style={{
                  flex: 1, height: "4px", background: T.bgPage, borderRadius: "2px", maxWidth: "120px",
                }}>
                  <div style={{
                    height: "100%", borderRadius: "2px",
                    width: `${(subtasksDone / subtasksTotal) * 100}%`,
                    background: subtasksDone === subtasksTotal ? "#4aba6a" : T.accent,
                    transition: "width .2s",
                  }} />
                </div>
                <span style={{ fontSize: ".72rem", color: T.textMuted }}>{subtasksDone}/{subtasksTotal}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: badges + action buttons */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: ".5rem", paddingLeft: "56px",
        }}>
          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            {cat && (
              <Badge color={task.done ? T.textMuted : cat.color} bg={task.done ? T.doneBg : cat.bg}>
                {cat.label}
              </Badge>
            )}
            {task.recurrence && (
              <Badge color={task.done ? T.textMuted : (weekend ? T.weekend : T.accentDark)}
                bg={task.done ? T.doneBg : (weekend ? T.weekendLight : T.accentLight)}>
                {"🔄 "}{getRecurrenceLabel(task.recurrence)}
              </Badge>
            )}
            {task.priority && (
              <Badge color={getPriorityColor(task.priority)} bg={getPriorityColor(task.priority) + "18"}>
                {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
              </Badge>
            )}
            {task.notes && <span style={{ fontSize: ".75rem" }} title="Tiene notas">📎</span>}
            {task.time && (<>
              <span style={{ fontSize: ".75rem" }}>🕐</span>
              <span style={{
                color: task.done ? T.textMuted : (weekend ? T.weekend : T.accent),
                fontSize: ".8rem", fontWeight: 600,
              }}>{task.time}</span>
            </>)}
            {task.time && task.reminder && task.reminder !== "0" && (
              <Badge color={weekend ? T.weekend : T.accentDark}
                bg={weekend ? T.weekendLight : T.accentLight}>
                {task.reminder >= 60 ? `${task.reminder / 60}h antes` : `${task.reminder}min antes`}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: ".15rem", flexShrink: 0 }}>
            <button onClick={() => onDuplicate(date, task)} aria-label="Duplicar tarea" style={{
              width: "30px", height: "30px", background: T.bg, border: "none",
              borderRadius: "8px", color: T.textMuted, cursor: "pointer",
              fontSize: ".85rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>📋</button>
            <button onClick={() => onMoveTask(date, task)} aria-label="Mover tarea" style={{
              width: "30px", height: "30px", background: T.bg, border: "none",
              borderRadius: "8px", color: T.textMuted, cursor: "pointer",
              fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>📅</button>
            <button onClick={() => onEdit(date, task)} aria-label="Editar tarea" style={{
              width: "30px", height: "30px", background: T.bg, border: "none",
              borderRadius: "8px", color: T.textMuted, cursor: "pointer",
              fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>✏️</button>
            <button onClick={() => onDelete(date, task.id)} aria-label="Eliminar tarea" style={{
              width: "30px", height: "30px", background: T.bg, border: "none",
              borderRadius: "8px", color: T.textMuted, cursor: "pointer",
              fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>🗑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ━━━ Workout Card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SortableWorkoutTask({ task, date, onToggle, onEdit, onDelete, onMoveTask, onDuplicate, highlightedTaskId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const cardRef = useRef(null);
  const isHighlighted = highlightedTaskId === task.id;

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "all .2s",
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  const exercises = task.subtasks || [];
  const exercisesDone = exercises.filter(s => s.done).length;
  const exercisesTotal = exercises.length;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div ref={cardRef}
        className={isDragging ? "" : isHighlighted ? "task-card highlight-flash" : "task-card"}
        style={{
          background: task.done ? T.doneBg : T.gymBg,
          border: `1.5px solid ${isDragging ? T.gym : T.gymBorder}`,
          borderLeft: `4px solid ${task.done ? T.textMuted : T.gym}`,
          borderRadius: "16px", padding: ".85rem 1rem",
          boxShadow: isDragging ? "0 8px 24px rgba(139,92,246,.2)" : (task.done ? "none" : T.gymShadow),
          position: "relative",
        }}>
        {/* Top row: drag handle + checkbox + text */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: ".7rem" }}>
          {/* Drag handle */}
          <div {...listeners} style={{
            width: "24px", minHeight: "36px", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "grab", touchAction: "none", color: T.textMuted,
            fontSize: "1rem", userSelect: "none",
          }}>⋮⋮</div>

          {/* Purple checkbox */}
          <button onClick={() => onToggle(date, task.id)} aria-label={task.done ? "Marcar como pendiente" : "Marcar como completado"} style={{
            width: "32px", height: "32px", borderRadius: "10px", flexShrink: 0,
            border: `2.5px solid ${task.done ? T.gym : T.gymBorder}`,
            background: task.done ? T.gymGrad : "transparent",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", transition: "all .15s",
          }}>
            {task.done && <span className="check-pop" style={{ color: "#fff", fontSize: ".8rem", fontWeight: 800 }}>✓</span>}
          </button>

          {/* Text + exercise progress */}
          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            onClick={() => onToggle(date, task.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <span style={{ fontSize: ".85rem", flexShrink: 0 }}>💪</span>
              <p style={{
                color: task.done ? T.textMuted : T.text,
                textDecoration: task.done ? "line-through" : "none",
                fontSize: ".97rem", lineHeight: 1.4, wordBreak: "break-word",
                margin: 0, flex: 1, fontWeight: 600,
              }}>{task.text}</p>
            </div>
            {/* Exercise progress bar */}
            {exercisesTotal > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".3rem" }}>
                <div style={{
                  flex: 1, height: "4px", background: "rgba(139,92,246,.1)", borderRadius: "2px", maxWidth: "120px",
                }}>
                  <div style={{
                    height: "100%", borderRadius: "2px",
                    width: `${(exercisesDone / exercisesTotal) * 100}%`,
                    background: exercisesDone === exercisesTotal ? "#4aba6a" : T.gym,
                    transition: "width .2s",
                  }} />
                </div>
                <span style={{ fontSize: ".72rem", color: T.textMuted }}>{exercisesDone}/{exercisesTotal}</span>
              </div>
            )}
          </div>
        </div>

        {/* Inline exercises list */}
        {exercisesTotal > 0 && (
          <div style={{ paddingLeft: "56px", marginTop: ".4rem" }}>
            {exercises.slice(0, 6).map(ex => (
              <div key={ex.id} style={{
                display: "flex", alignItems: "center", gap: ".4rem", padding: ".12rem 0",
              }}>
                <span style={{
                  width: "14px", height: "14px", borderRadius: "4px", flexShrink: 0,
                  border: `1.5px solid ${ex.done ? T.gym : "rgba(139,92,246,.25)"}`,
                  background: ex.done ? T.gymGrad : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {ex.done && <span style={{ color: "#fff", fontSize: ".45rem", fontWeight: 800 }}>✓</span>}
                </span>
                <span style={{
                  fontSize: ".78rem",
                  color: ex.done ? T.textMuted : T.textSub,
                  textDecoration: ex.done ? "line-through" : "none",
                }}>{ex.text}</span>
              </div>
            ))}
            {exercises.length > 6 && (
              <span style={{ fontSize: ".72rem", color: T.textMuted, paddingLeft: "18px" }}>
                +{exercises.length - 6} más
              </span>
            )}
          </div>
        )}

        {/* Bottom row: badges + actions */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: ".5rem", paddingLeft: "56px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            {task.recurrence && (
              <Badge color={task.done ? T.textMuted : T.gymDark} bg={task.done ? T.doneBg : "rgba(139,92,246,.08)"}>
                {"🔄 "}{getRecurrenceLabel(task.recurrence)}
              </Badge>
            )}
            {task.priority && (
              <Badge color={getPriorityColor(task.priority)} bg={getPriorityColor(task.priority) + "18"}>
                {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
              </Badge>
            )}
            {task.notes && <span style={{ fontSize: ".75rem" }} title="Tiene notas">📎</span>}
            {task.time && (<>
              <span style={{ fontSize: ".75rem" }}>🕐</span>
              <span style={{
                color: task.done ? T.textMuted : T.gym,
                fontSize: ".8rem", fontWeight: 600,
              }}>{task.time}</span>
            </>)}
            {task.time && task.reminder && task.reminder !== "0" && (
              <Badge color={T.gymDark} bg="rgba(139,92,246,.08)">
                {task.reminder >= 60 ? `${task.reminder / 60}h antes` : `${task.reminder}min antes`}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: ".15rem", flexShrink: 0 }}>
            <button onClick={() => onDuplicate(date, task)} aria-label="Duplicar" style={{
              width: "30px", height: "30px", background: "rgba(139,92,246,.06)", border: "none",
              borderRadius: "8px", color: T.textMuted, cursor: "pointer",
              fontSize: ".85rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>📋</button>
            <button onClick={() => onMoveTask(date, task)} aria-label="Mover" style={{
              width: "30px", height: "30px", background: "rgba(139,92,246,.06)", border: "none",
              borderRadius: "8px", color: T.textMuted, cursor: "pointer",
              fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>📅</button>
            <button onClick={() => onEdit(date, task)} aria-label="Editar" style={{
              width: "30px", height: "30px", background: "rgba(139,92,246,.06)", border: "none",
              borderRadius: "8px", color: T.textMuted, cursor: "pointer",
              fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>✏️</button>
            <button onClick={() => onDelete(date, task.id)} aria-label="Eliminar" style={{
              width: "30px", height: "30px", background: "rgba(139,92,246,.06)", border: "none",
              borderRadius: "8px", color: T.textMuted, cursor: "pointer",
              fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>🗑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ━━━ Day View ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function DayView({ date, tasks, onAddTask, onAddWorkout, onToggle, onEdit, onDelete, onMoveTask, onReorder, onDuplicate,
                   pendingPastCount, onMovePendingToToday, onDismissPending, showPendingBanner,
                   activeCategory, onSetActiveCategory, highlightedTaskId }) {
  const allDayTasks = [...(tasks[date] || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // Separate workout and regular tasks
  const workoutTasks = allDayTasks.filter(t => t.category === GYM_ID);
  const regularTasks = allDayTasks.filter(t => t.category !== GYM_ID);

  // Apply category filter
  const displayWorkout = activeCategory
    ? (activeCategory === GYM_ID ? workoutTasks : [])
    : workoutTasks;
  const displayRegular = activeCategory
    ? (activeCategory === GYM_ID ? [] : regularTasks.filter(t => t.category === activeCategory))
    : regularTasks;

  const isToday = date === todayStr();
  const weekend = isWeekend(date);
  const pending = allDayTasks.filter(t => !t.done).length;
  const done = allDayTasks.filter(t => t.done).length;

  const uniqueCategories = [...new Set(allDayTasks.map(t => t.category).filter(Boolean))];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleWorkoutDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = workoutTasks.findIndex(t => t.id === active.id);
    const newIdx = workoutTasks.findIndex(t => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(date, [...arrayMove(workoutTasks, oldIdx, newIdx), ...regularTasks]);
  };

  const handleRegularDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = regularTasks.findIndex(t => t.id === active.id);
    const newIdx = regularTasks.findIndex(t => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(date, [...workoutTasks, ...arrayMove(regularTasks, oldIdx, newIdx)]);
  };

  // Workout section stats
  const workoutExercisesTotal = displayWorkout.reduce((sum, t) => sum + (t.subtasks || []).length, 0);
  const workoutExercisesDone = displayWorkout.reduce((sum, t) => sum + (t.subtasks || []).filter(s => s.done).length, 0);
  const workoutsDone = displayWorkout.filter(t => t.done).length;

  return (
    <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
      {/* Day header card */}
      <div style={{
        background: weekend
          ? `linear-gradient(135deg, ${T.weekend} 0%, #f09060 100%)`
          : T.accentGrad,
        borderRadius: "20px", padding: "1.25rem 1.5rem",
        marginBottom: "1.25rem",
        boxShadow: weekend
          ? "0 4px 20px rgba(224,123,84,.3)"
          : "0 4px 20px rgba(240,180,41,.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {isToday && (
              <span style={{
                display: "inline-block", background: "rgba(255,255,255,.3)",
                color: "#fff", fontSize: ".72rem", fontWeight: 700,
                padding: "2px 10px", borderRadius: "20px", marginBottom: ".4rem",
                letterSpacing: ".06em",
              }}>HOY</span>
            )}
            {weekend && !isToday && (
              <span style={{
                display: "inline-block", background: "rgba(255,255,255,.25)",
                color: "#fff", fontSize: ".72rem", fontWeight: 700,
                padding: "2px 10px", borderRadius: "20px", marginBottom: ".4rem",
                letterSpacing: ".06em",
              }}>FIN DE SEMANA</span>
            )}
            <h2 style={{
              color: "#fff", fontSize: "1.35rem", fontWeight: 700,
              textTransform: "capitalize", lineHeight: 1.2,
              fontFamily: T.font, margin: 0,
            }}>{formatDateLabel(date)}</h2>
          </div>
          {allDayTasks.length > 0 && (
            <div style={{ textAlign: "right" }}>
              {pending > 0 && <div style={{ color: "rgba(255,255,255,.9)", fontSize: ".82rem", fontWeight: 600 }}>{pending} pendiente{pending > 1 ? "s" : ""}</div>}
              {done > 0 && <div style={{ color: "rgba(255,255,255,.65)", fontSize: ".78rem" }}>{done} completada{done > 1 ? "s" : ""}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Pending tasks from past days banner */}
      {showPendingBanner && pendingPastCount > 0 && (
        <div className="task-card" style={{
          background: T.accentLight,
          border: `1.5px solid ${T.border}`,
          borderRadius: "14px",
          padding: ".85rem 1rem",
          marginBottom: "1rem",
        }}>
          <p style={{ color: T.textSub, fontSize: ".88rem", margin: "0 0 .6rem", lineHeight: 1.4 }}>
            Tienes <strong style={{ color: T.accentDark }}>{pendingPastCount}</strong> tarea{pendingPastCount > 1 ? "s" : ""} pendiente{pendingPastCount > 1 ? "s" : ""} de días anteriores
          </p>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <button onClick={onMovePendingToToday} style={{
              flex: 1, padding: ".55rem .8rem", background: T.accentGrad,
              border: "none", borderRadius: "10px", color: T.textOnAccent,
              fontWeight: 600, fontSize: ".82rem", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(240,180,41,.3)",
            }}>Mover a hoy</button>
            <button onClick={onDismissPending} style={{
              flex: 1, padding: ".55rem .8rem", background: T.bg,
              border: `1.5px solid ${T.borderGray}`, borderRadius: "10px",
              color: T.textSub, fontWeight: 600, fontSize: ".82rem", cursor: "pointer",
            }}>Ignorar</button>
          </div>
        </div>
      )}

      {/* Category filter */}
      {uniqueCategories.length >= 2 && (
        <div style={{
          display: "flex", gap: ".35rem", marginBottom: "1rem",
          overflowX: "auto", paddingBottom: ".2rem",
        }}>
          <button onClick={() => onSetActiveCategory(null)} style={{
            padding: ".3rem .7rem", borderRadius: "20px", fontSize: ".75rem", fontWeight: 600,
            cursor: "pointer", flexShrink: 0,
            background: !activeCategory ? T.accent : "transparent",
            border: `1.5px solid ${!activeCategory ? T.accent : T.borderGray}`,
            color: !activeCategory ? "#fff" : T.textMuted,
          }}>Todas</button>
          {CATEGORIES.filter(c => uniqueCategories.includes(c.id)).map(c => (
            <button key={c.id} onClick={() => onSetActiveCategory(activeCategory === c.id ? null : c.id)} style={{
              padding: ".3rem .7rem", borderRadius: "20px", fontSize: ".75rem", fontWeight: 600,
              cursor: "pointer", flexShrink: 0,
              background: activeCategory === c.id ? c.color : "transparent",
              border: `1.5px solid ${activeCategory === c.id ? c.color : T.borderGray}`,
              color: activeCategory === c.id ? "#fff" : T.textMuted,
            }}>{c.id === GYM_ID ? "💪 " + c.label : c.label}</button>
          ))}
        </div>
      )}

      {/* ━━━ WORKOUT SECTION ━━━ */}
      {displayWorkout.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          {/* Workout section header */}
          <div style={{
            background: T.gymGrad,
            borderRadius: "16px", padding: "1rem 1.2rem",
            marginBottom: ".65rem",
            boxShadow: "0 4px 16px rgba(139,92,246,.25)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
              <span style={{ fontSize: "1.2rem" }}>💪</span>
              <div>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: ".92rem", display: "block" }}>Entrenamiento</span>
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
                width: "28px", height: "28px", borderRadius: "8px",
                background: "rgba(255,255,255,.2)", border: "none",
                color: "#fff", fontSize: "1rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>+</button>
            </div>
          </div>

          {/* Workout cards */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWorkoutDragEnd}>
            <SortableContext items={displayWorkout.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
                {displayWorkout.map(task => (
                  <SortableWorkoutTask key={task.id} task={task} date={date}
                    onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
                    onMoveTask={onMoveTask} onDuplicate={onDuplicate}
                    highlightedTaskId={highlightedTaskId} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* ━━━ REGULAR TASKS SECTION ━━━ */}

      {/* Empty state (only if both sections empty) */}
      {displayRegular.length === 0 && displayWorkout.length === 0 && (
        <div style={{
          textAlign: "center", padding: "3rem 1rem",
          background: T.bgCard, borderRadius: "16px",
          boxShadow: T.shadowCard, marginBottom: "1rem",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: ".6rem" }}>
            {activeCategory ? "🔍" : weekend ? "☀️" : "✨"}
          </div>
          <p style={{ color: T.textMuted, fontSize: ".9rem" }}>
            {activeCategory ? "Sin tareas en esta categoría" : weekend ? "Día libre, sin tareas" : "Sin tareas para este día"}
          </p>
        </div>
      )}

      {/* Regular task list with dnd-kit */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRegularDragEnd}>
        <SortableContext items={displayRegular.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: ".65rem", marginBottom: "1rem" }}>
            {displayRegular.map(task => (
              <SortableTask key={task.id} task={task} date={date} weekend={weekend}
                onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
                onMoveTask={onMoveTask} onDuplicate={onDuplicate}
                highlightedTaskId={highlightedTaskId} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add button */}
      <button onClick={onAddTask} style={{
        width: "100%", padding: "1rem",
        background: T.bgCard,
        border: `2px dashed ${weekend ? T.weekendBorder : T.border}`,
        borderRadius: "16px",
        color: weekend ? T.weekend : T.accent,
        fontWeight: 600, fontSize: ".95rem", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
      }}>
        <span style={{ fontSize: "1.1rem" }}>+</span> Añadir tarea
      </button>
    </div>
  );
}

export default memo(DayView);
