import { useState, useEffect, useRef, memo } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { T } from "../theme";
import { getCat, CATEGORIES, getPriorityColor, GYM_ID } from "../constants";
import { todayStr, formatDateLabel, isWeekend, getRecurrenceLabel } from "../helpers";
import { GripVertical, Check, Copy, CalendarPlus, Pencil, Trash2, Dumbbell, Plus, Sparkles, Sun, SearchX, Repeat, Paperclip, Clock } from "lucide-react";
import Badge from "./Badge";

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/* ━━━ Regular Task Card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SortableTask({ task, date, weekend, onToggle, onEdit, onDelete, onMoveTask, onDuplicate, highlightedTaskId, hideDragHandle }) {
  const canDrag = !task.done && !hideDragHandle;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canDrag,
  });
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
          borderRadius: T.r4, padding: ".85rem 1rem",
          boxShadow: isDragging ? T.shadowFloat : (task.done ? "none" : T.shadowCard),
          position: "relative",
        }}>
        {/* Top row: drag handle + checkbox + text */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: ".7rem" }}>
          {/* Drag handle or spacer */}
          {canDrag ? (
            <div {...listeners} style={{
              width: "24px", minHeight: "36px", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "grab", touchAction: "none", color: T.textMuted,
              userSelect: "none",
            }}><GripVertical size={16} /></div>
          ) : (
            <div style={{ width: "24px", minHeight: "36px", flexShrink: 0 }} />
          )}

          {/* Checkbox */}
          <button onClick={() => onToggle(date, task.id)} aria-label={task.done ? "Marcar como pendiente" : "Marcar como completada"} style={{
            width: "32px", height: "32px", borderRadius: T.r3, flexShrink: 0,
            border: `2.5px solid ${task.done ? T.accent : T.borderGray}`,
            background: task.done ? T.accentGrad : "transparent",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", transition: "all .15s",
          }}>
            {task.done && <span className="check-pop"><Check size={16} color="#fff" strokeWidth={3} /></span>}
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
                    background: subtasksDone === subtasksTotal ? T.success : T.accent,
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
                  <Repeat size={10} /> {getRecurrenceLabel(task.recurrence)}
                </span>
              </Badge>
            )}
            {task.priority && (
              <Badge color={getPriorityColor(task.priority)} bg={getPriorityColor(task.priority) + "18"}>
                {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
              </Badge>
            )}
            {task.notes && <Paperclip size={13} style={{ color: T.textMuted, flexShrink: 0 }} />}
            {task.time && (<>
              <Clock size={13} style={{ color: T.textMuted, flexShrink: 0 }} />
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
              borderRadius: T.r2, color: T.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Copy size={14} /></button>
            <button onClick={() => onMoveTask(date, task)} aria-label="Mover tarea" style={{
              width: "30px", height: "30px", background: T.bg, border: "none",
              borderRadius: T.r2, color: T.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><CalendarPlus size={14} /></button>
            <button onClick={() => onEdit(date, task)} aria-label="Editar tarea" style={{
              width: "30px", height: "30px", background: T.bg, border: "none",
              borderRadius: T.r2, color: T.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Pencil size={14} /></button>
            <button onClick={() => onDelete(date, task.id)} aria-label="Eliminar tarea" style={{
              width: "30px", height: "30px", background: T.bg, border: "none",
              borderRadius: T.r2, color: T.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ━━━ Workout Card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SortableWorkoutTask({ task, date, onToggle, onEdit, onDelete, onMoveTask, onDuplicate, highlightedTaskId, hideDragHandle }) {
  const canDrag = !task.done && !hideDragHandle;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canDrag,
  });
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
          borderRadius: T.r4, padding: ".85rem 1rem",
          boxShadow: isDragging ? T.shadowFloat : (task.done ? "none" : T.gymShadow),
          position: "relative",
        }}>
        {/* Top row: drag handle + checkbox + text */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: ".7rem" }}>
          {/* Drag handle or spacer */}
          {canDrag ? (
            <div {...listeners} style={{
              width: "24px", minHeight: "36px", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "grab", touchAction: "none", color: T.textMuted,
              userSelect: "none",
            }}><GripVertical size={16} /></div>
          ) : (
            <div style={{ width: "24px", minHeight: "36px", flexShrink: 0 }} />
          )}

          {/* Purple checkbox */}
          <button onClick={() => onToggle(date, task.id)} aria-label={task.done ? "Marcar como pendiente" : "Marcar como completado"} style={{
            width: "32px", height: "32px", borderRadius: T.r3, flexShrink: 0,
            border: `2.5px solid ${task.done ? T.gym : T.gymBorder}`,
            background: task.done ? T.gymGrad : "transparent",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", transition: "all .15s",
          }}>
            {task.done && <span className="check-pop"><Check size={16} color="#fff" strokeWidth={3} /></span>}
          </button>

          {/* Text + exercise progress */}
          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            onClick={() => onToggle(date, task.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <Dumbbell size={15} style={{ color: task.done ? T.textMuted : T.gym, flexShrink: 0 }} />
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
                  flex: 1, height: "4px", background: T.gymBorder, borderRadius: "2px", maxWidth: "120px",
                }}>
                  <div style={{
                    height: "100%", borderRadius: "2px",
                    width: `${(exercisesDone / exercisesTotal) * 100}%`,
                    background: exercisesDone === exercisesTotal ? T.success : T.gym,
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
                  width: "14px", height: "14px", borderRadius: T.r1, flexShrink: 0,
                  border: `1.5px solid ${ex.done ? T.gym : T.gymBorder}`,
                  background: ex.done ? T.gymGrad : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {ex.done && <Check size={8} color="#fff" strokeWidth={3} />}
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
              <Badge color={task.done ? T.textMuted : T.gymDark} bg={task.done ? T.doneBg : T.gymBorder}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
                  <Repeat size={10} /> {getRecurrenceLabel(task.recurrence)}
                </span>
              </Badge>
            )}
            {task.priority && (
              <Badge color={getPriorityColor(task.priority)} bg={getPriorityColor(task.priority) + "18"}>
                {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
              </Badge>
            )}
            {task.notes && <Paperclip size={13} style={{ color: T.textMuted, flexShrink: 0 }} />}
            {task.time && (<>
              <Clock size={13} style={{ color: T.textMuted, flexShrink: 0 }} />
              <span style={{
                color: task.done ? T.textMuted : T.gym,
                fontSize: ".8rem", fontWeight: 600,
              }}>{task.time}</span>
            </>)}
            {task.time && task.reminder && task.reminder !== "0" && (
              <Badge color={T.gymDark} bg={T.gymBorder}>
                {task.reminder >= 60 ? `${task.reminder / 60}h antes` : `${task.reminder}min antes`}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: ".15rem", flexShrink: 0 }}>
            <button onClick={() => onDuplicate(date, task)} aria-label="Duplicar" style={{
              width: "30px", height: "30px", background: T.gymLight, border: "none",
              borderRadius: T.r2, color: T.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Copy size={14} /></button>
            <button onClick={() => onMoveTask(date, task)} aria-label="Mover" style={{
              width: "30px", height: "30px", background: T.gymLight, border: "none",
              borderRadius: T.r2, color: T.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><CalendarPlus size={14} /></button>
            <button onClick={() => onEdit(date, task)} aria-label="Editar" style={{
              width: "30px", height: "30px", background: T.gymLight, border: "none",
              borderRadius: T.r2, color: T.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Pencil size={14} /></button>
            <button onClick={() => onDelete(date, task.id)} aria-label="Eliminar" style={{
              width: "30px", height: "30px", background: T.gymLight, border: "none",
              borderRadius: T.r2, color: T.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ━━━ Completed divider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function CompletedDivider({ count }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: ".5rem",
      margin: ".85rem 0 .5rem", padding: "0 .25rem",
    }}>
      <div style={{ flex: 1, height: "1px", background: T.borderGray }} />
      <span style={{
        fontSize: ".7rem", fontWeight: 600, color: T.textMuted,
        letterSpacing: ".05em", textTransform: "uppercase",
      }}>
        Completadas ({count})
      </span>
      <div style={{ flex: 1, height: "1px", background: T.borderGray }} />
    </div>
  );
}

/* ━━━ Day View ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function DayView({ date, tasks, onAddTask, onAddWorkout, onToggle, onEdit, onDelete, onMoveTask, onReorder, onDuplicate,
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
  const pendingWorkout = workoutTasks.filter(t => !t.done);
  const doneWorkout = workoutTasks.filter(t => t.done);
  const pendingRegular = regularTasks.filter(t => !t.done);
  const doneRegular = regularTasks.filter(t => t.done);

  // Apply category filter
  const displayWorkout = activeCategory
    ? (activeCategory === GYM_ID ? workoutTasks : [])
    : workoutTasks;
  const displayRegular = activeCategory
    ? (activeCategory === GYM_ID ? [] : regularTasks.filter(t => t.category === activeCategory))
    : regularTasks;

  // Split filtered into pending/done (for display)
  const displayPendingWorkout = displayWorkout.filter(t => !t.done);
  const displayDoneWorkout = displayWorkout.filter(t => t.done);
  const displayPendingRegular = displayRegular.filter(t => !t.done);
  const displayDoneRegular = displayRegular.filter(t => t.done);

  // Apply priority sorting when enabled
  const sortByPriorityFn = (a, b) => {
    const pa = PRIORITY_RANK[a.priority] ?? 3;
    const pb = PRIORITY_RANK[b.priority] ?? 3;
    return pa !== pb ? pa - pb : (a.position ?? 0) - (b.position ?? 0);
  };
  const sortedPendingWorkout = sortByPriority
    ? [...displayPendingWorkout].sort(sortByPriorityFn)
    : displayPendingWorkout;
  const sortedPendingRegular = sortByPriority
    ? [...displayPendingRegular].sort(sortByPriorityFn)
    : displayPendingRegular;

  // Combined arrays for SortableContext (pending first, done last)
  const allDisplayWorkout = [...sortedPendingWorkout, ...displayDoneWorkout];
  const allDisplayRegular = [...sortedPendingRegular, ...displayDoneRegular];

  const isToday = date === todayStr();
  const weekend = isWeekend(date);
  const pendingCount = allDayTasks.filter(t => !t.done).length;
  const doneCount = allDayTasks.filter(t => t.done).length;

  const uniqueCategories = [...new Set(allDayTasks.map(t => t.category).filter(Boolean))];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleWorkoutDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = pendingWorkout.findIndex(t => t.id === active.id);
    const newIdx = pendingWorkout.findIndex(t => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(date, [...arrayMove(pendingWorkout, oldIdx, newIdx), ...doneWorkout, ...pendingRegular, ...doneRegular]);
  };

  const handleRegularDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = pendingRegular.findIndex(t => t.id === active.id);
    const newIdx = pendingRegular.findIndex(t => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(date, [...pendingWorkout, ...doneWorkout, ...arrayMove(pendingRegular, oldIdx, newIdx), ...doneRegular]);
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
                {sortedPendingWorkout.map(task => (
                  <SortableWorkoutTask key={task.id} task={task} date={date}
                    onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
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
          <div style={{ display: "flex", flexDirection: "column", gap: ".65rem", marginBottom: displayDoneRegular.length > 0 ? "0" : "1rem" }}>
            {sortedPendingRegular.map(task => (
              <SortableTask key={task.id} task={task} date={date} weekend={weekend}
                onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
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
