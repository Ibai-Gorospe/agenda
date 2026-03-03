import { useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { T } from "../theme";
import { getPriorityColor, UI } from "../constants";
import { getRecurrenceLabel } from "../helpers";
import { GripVertical, Check, Copy, CalendarPlus, Pencil, Trash2, Dumbbell, Repeat, Paperclip, Clock } from "lucide-react";
import Badge from "./Badge";

const styles = {
  actionBtn: {
    width: "30px", height: "30px", background: T.gymLight, border: "none",
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

export default function SortableWorkoutTask({ task, date, onToggle, onEdit, onDelete, onMoveTask, onDuplicate, highlightedTaskId, hideDragHandle }) {
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
          {canDrag ? (
            <div {...listeners} style={styles.dragHandle}><GripVertical size={16} /></div>
          ) : (
            <div style={styles.dragSpacer} />
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
            {exercises.slice(0, UI.WORKOUT_EXERCISES_VISIBLE).map(ex => (
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
            {exercises.length > UI.WORKOUT_EXERCISES_VISIBLE && (
              <span style={{ fontSize: ".72rem", color: T.textMuted, paddingLeft: "18px" }}>
                +{exercises.length - UI.WORKOUT_EXERCISES_VISIBLE} más
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
            <button onClick={() => onDuplicate(date, task)} aria-label="Duplicar" style={styles.actionBtn}><Copy size={14} /></button>
            <button onClick={() => onMoveTask(date, task)} aria-label="Mover" style={styles.actionBtn}><CalendarPlus size={14} /></button>
            <button onClick={() => onEdit(date, task)} aria-label="Editar" style={styles.actionBtn}><Pencil size={14} /></button>
            <button onClick={() => onDelete(date, task.id)} aria-label="Eliminar" style={styles.actionBtn}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
