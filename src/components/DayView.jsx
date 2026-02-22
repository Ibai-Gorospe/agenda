import { useState, useEffect, useRef, memo } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { T } from "../theme";
import { getCat, RECURRENCE_LABELS, CATEGORIES, getPriorityColor } from "../constants";
import { todayStr, formatDateLabel, isWeekend } from "../helpers";
import Badge from "./Badge";

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
          display: "flex", alignItems: "flex-start", gap: ".7rem",
          boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,.15)" : (task.done ? "none" : T.shadowCard),
          position: "relative",
        }}>
        {/* Drag handle */}
        <div {...listeners} style={{
          width: "28px", minHeight: "36px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "grab", touchAction: "none", color: T.textMuted,
          fontSize: "1rem", userSelect: "none",
        }}>⋮⋮</div>

        {/* Checkbox */}
        <button onClick={() => onToggle(date, task.id)} aria-label={task.done ? "Marcar como pendiente" : "Marcar como completada"} style={{
          width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
          border: `2.5px solid ${task.done ? T.accent : T.borderGray}`,
          background: task.done ? T.accentGrad : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", transition: "all .15s",
        }}>
          {task.done && <span className="check-pop" style={{ color: "#fff", fontSize: ".85rem", fontWeight: 800 }}>✓</span>}
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
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".35rem", flexWrap: "wrap" }}>
            {cat && (
              <Badge color={task.done ? T.textMuted : cat.color} bg={task.done ? T.doneBg : cat.bg}>
                {cat.label}
              </Badge>
            )}
            {task.recurrence && (
              <Badge color={task.done ? T.textMuted : (weekend ? T.weekend : T.accentDark)}
                bg={task.done ? T.doneBg : (weekend ? T.weekendLight : T.accentLight)}>
                {"🔄 "}{RECURRENCE_LABELS[task.recurrence] || task.recurrence}
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
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: ".2rem", flexShrink: 0, alignItems: "flex-start" }}>
          <button onClick={() => onDuplicate(date, task)} aria-label="Duplicar tarea" style={{
            width: "36px", height: "36px", background: T.bg, border: "none",
            borderRadius: "10px", color: T.textMuted, cursor: "pointer",
            fontSize: ".95rem", display: "flex", alignItems: "center", justifyContent: "center",
          }}>📋</button>
          <button onClick={() => onMoveTask(date, task)} aria-label="Mover tarea" style={{
            width: "36px", height: "36px", background: T.bg, border: "none",
            borderRadius: "10px", color: T.textMuted, cursor: "pointer",
            fontSize: "1.05rem", display: "flex", alignItems: "center", justifyContent: "center",
          }}>📅</button>
          <button onClick={() => onEdit(date, task)} aria-label="Editar tarea" style={{
            width: "36px", height: "36px", background: T.bg, border: "none",
            borderRadius: "10px", color: T.textMuted, cursor: "pointer",
            fontSize: "1.05rem", display: "flex", alignItems: "center", justifyContent: "center",
          }}>✏️</button>
          <button onClick={() => onDelete(date, task.id)} aria-label="Eliminar tarea" style={{
            width: "36px", height: "36px", background: T.bg, border: "none",
            borderRadius: "10px", color: T.textMuted, cursor: "pointer",
            fontSize: "1.05rem", display: "flex", alignItems: "center", justifyContent: "center",
          }}>🗑</button>
        </div>
      </div>
    </div>
  );
}

function DayView({ date, tasks, onAddTask, onToggle, onEdit, onDelete, onMoveTask, onReorder, onDuplicate,
                   pendingPastCount, onMovePendingToToday, onDismissPending, showPendingBanner,
                   activeCategory, onSetActiveCategory, highlightedTaskId }) {
  const allDayTasks = [...(tasks[date] || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const dayTasks = activeCategory ? allDayTasks.filter(t => t.category === activeCategory) : allDayTasks;
  const isToday = date === todayStr();
  const weekend = isWeekend(date);
  const pending = allDayTasks.filter(t => !t.done).length;
  const done = allDayTasks.filter(t => t.done).length;

  // Count unique categories for filter visibility
  const uniqueCategories = [...new Set(allDayTasks.map(t => t.category).filter(Boolean))];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = allDayTasks.findIndex(t => t.id === active.id);
    const newIdx = allDayTasks.findIndex(t => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(date, arrayMove(allDayTasks, oldIdx, newIdx));
  };

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
            }}>{c.label}</button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {dayTasks.length === 0 && (
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

      {/* Task list with dnd-kit */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: ".65rem", marginBottom: "1rem" }}>
            {dayTasks.map(task => (
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
