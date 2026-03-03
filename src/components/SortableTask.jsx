import { useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { T } from "../theme";
import { getCat, getPriorityColor } from "../constants";
import { getRecurrenceLabel } from "../helpers";
import { GripVertical, Check, Copy, CalendarPlus, Pencil, Trash2, Repeat, Paperclip, Clock } from "lucide-react";
import Badge from "./Badge";

const styles = {
  actionBtn: {
    width: "30px", height: "30px", background: T.bg, border: "none",
    borderRadius: T.r2, color: T.textMuted, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  dragHandle: {
    width: "24px", minHeight: "36px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "grab", touchAction: "none", color: T.textMuted, userSelect: "none",
  },
  dragSpacer: { width: "24px", minHeight: "36px", flexShrink: 0 },
};

export default function SortableTask({ task, date, weekend, onToggle, onEdit, onDelete, onMoveTask, onDuplicate, highlightedTaskId, hideDragHandle }) {
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
          {canDrag ? (
            <div {...listeners} style={styles.dragHandle}><GripVertical size={16} /></div>
          ) : (
            <div style={styles.dragSpacer} />
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
            <button onClick={() => onDuplicate(date, task)} aria-label="Duplicar tarea" style={styles.actionBtn}><Copy size={14} /></button>
            <button onClick={() => onMoveTask(date, task)} aria-label="Mover tarea" style={styles.actionBtn}><CalendarPlus size={14} /></button>
            <button onClick={() => onEdit(date, task)} aria-label="Editar tarea" style={styles.actionBtn}><Pencil size={14} /></button>
            <button onClick={() => onDelete(date, task.id)} aria-label="Eliminar tarea" style={styles.actionBtn}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
