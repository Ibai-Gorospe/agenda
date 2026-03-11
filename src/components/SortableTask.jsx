import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { T } from "../theme";
import { getCat, getPriorityColor } from "../constants";
import {
  getRecurrenceLabel,
  getScheduledDateBadge,
  getTaskScheduledDate,
  isTaskDone,
  isTaskOpen,
  isTaskSkipped,
} from "../helpers";
import {
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  GripVertical,
  Paperclip,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
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

export default function SortableTask({
  task,
  date,
  weekend,
  onToggle,
  onEdit,
  onDelete,
  onMoveTask,
  onToggleSubtask,
  onDuplicate,
  highlightedTaskId,
  hideDragHandle,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);
  const isOpen = isTaskOpen(task);
  const isDoneState = isTaskDone(task);
  const isSkippedState = isTaskSkipped(task);
  const canDrag = isOpen && !hideDragHandle;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canDrag,
  });
  const cardRef = useRef(null);
  const isHighlighted = highlightedTaskId === task.id;
  const cat = task.category ? getCat(task.category) : null;
  const priorityColor = getPriorityColor(task.priority);
  const subtasks = task.subtasks || [];
  const subtasksDone = subtasks.filter(s => s.done).length;
  const subtasksTotal = subtasks.length;
  const openSubtasks = subtasks.filter(s => !s.done);
  const doneSubtasks = subtasks.filter(s => s.done);
  const scheduledBadge = getScheduledDateBadge(getTaskScheduledDate(task, date), date);

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

  const handleMainClick = () => {
    if (subtasksTotal > 0) {
      setExpanded(prev => !prev);
      return;
    }
    if (!isSkippedState) onToggle(date, task.id);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        ref={cardRef}
        className={isDragging ? "" : isHighlighted ? "task-card highlight-flash" : "task-card"}
        style={{
          background: isOpen ? T.bgCard : T.doneBg,
          border: `1.5px solid ${isDragging ? T.accent : T.borderGray}`,
          borderLeft: priorityColor ? `3px solid ${priorityColor}` : `1.5px solid ${isDragging ? T.accent : T.borderGray}`,
          borderRadius: T.r4,
          padding: ".85rem 1rem",
          boxShadow: isDragging ? T.shadowFloat : (isOpen ? T.shadowCard : "none"),
          position: "relative",
          opacity: isSkippedState ? 0.8 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: ".7rem" }}>
          {canDrag ? (
            <div {...listeners} style={styles.dragHandle}><GripVertical size={16} /></div>
          ) : (
            <div style={styles.dragSpacer} />
          )}

          <button
            onClick={() => !isSkippedState && onToggle(date, task.id)}
            disabled={isSkippedState}
            aria-label={isDoneState ? "Marcar como pendiente" : isSkippedState ? "Tarea omitida" : "Marcar como completada"}
            style={{
              width: "32px", height: "32px", borderRadius: T.r3, flexShrink: 0,
              border: `2.5px solid ${isDoneState ? T.accent : T.borderGray}`,
              background: isDoneState ? T.accentGrad : "transparent",
              cursor: isSkippedState ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .15s", opacity: isSkippedState ? 0.6 : 1,
            }}
          >
            {isDoneState && <span className="check-pop"><Check size={16} color="#fff" strokeWidth={3} /></span>}
          </button>

          <div style={{ flex: 1, minWidth: 0, cursor: subtasksTotal > 0 || !isSkippedState ? "pointer" : "default" }} onClick={handleMainClick}>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              {cat && (
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                  background: isOpen ? cat.color : T.textMuted,
                }} />
              )}
              <p style={{
                color: isOpen ? T.text : T.textMuted,
                textDecoration: isDoneState ? "line-through" : "none",
                fontSize: ".97rem", lineHeight: 1.4, wordBreak: "break-word",
                margin: 0, flex: 1,
              }}>{task.text}</p>
            </div>

            {subtasksTotal > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(prev => !prev);
                }}
                style={{
                  marginTop: ".35rem", background: "none", border: "none", padding: 0,
                  color: T.textMuted, fontSize: ".76rem", cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: ".35rem",
                }}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {subtasksDone}/{subtasksTotal} subtareas
              </button>
            )}
          </div>
        </div>

        {subtasksTotal > 0 && expanded && (
          <div style={{ paddingLeft: "56px", marginTop: ".55rem" }}>
            {openSubtasks.map(subtask => (
              <button
                key={subtask.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isOpen) onToggleSubtask(date, task.id, subtask.id);
                }}
                disabled={!isOpen}
                style={{
                  width: "100%", background: "transparent", border: "none", cursor: isOpen ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: ".5rem", textAlign: "left",
                  padding: ".22rem 0",
                }}
              >
                <span style={{
                  width: "18px", height: "18px", borderRadius: "6px", flexShrink: 0,
                  border: `1.5px solid ${T.borderGray}`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "transparent",
                }} />
                <span style={{ fontSize: ".82rem", color: T.textSub }}>{subtask.text}</span>
              </button>
            ))}

            {doneSubtasks.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCompletedSubtasks(prev => !prev);
                }}
                style={{
                  background: "none", border: "none", padding: ".25rem 0 0",
                  color: T.textMuted, fontSize: ".74rem", cursor: "pointer",
                }}
              >
                {showCompletedSubtasks ? "Ocultar completadas" : `Mostrar completadas (${doneSubtasks.length})`}
              </button>
            )}

            {showCompletedSubtasks && doneSubtasks.map(subtask => (
              <button
                key={subtask.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isOpen) onToggleSubtask(date, task.id, subtask.id);
                }}
                disabled={!isOpen}
                style={{
                  width: "100%", background: "transparent", border: "none", cursor: isOpen ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: ".5rem", textAlign: "left",
                  padding: ".22rem 0",
                }}
              >
                <span style={{
                  width: "18px", height: "18px", borderRadius: "6px", flexShrink: 0,
                  border: `1.5px solid ${T.accent}`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: T.accentGrad,
                }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </span>
                <span style={{ fontSize: ".82rem", color: T.textMuted, textDecoration: "line-through" }}>{subtask.text}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: ".5rem", paddingLeft: "56px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            {cat && (
              <Badge color={isOpen ? cat.color : T.textMuted} bg={isOpen ? cat.bg : T.doneBg}>
                {cat.label}
              </Badge>
            )}
            {task.recurrence && (
              <Badge color={isOpen ? (weekend ? T.weekend : T.accentDark) : T.textMuted}
                bg={isOpen ? (weekend ? T.weekendLight : T.accentLight) : T.doneBg}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
                  <Repeat size={10} /> {getRecurrenceLabel(task.recurrence)}
                </span>
              </Badge>
            )}
            {isSkippedState && (
              <Badge color={T.textMuted} bg={T.doneBg}>
                Omitida
              </Badge>
            )}
            {scheduledBadge && (
              <Badge color={isOpen ? T.weekend : T.textMuted} bg={isOpen ? T.weekendLight : T.doneBg}>
                {scheduledBadge}
              </Badge>
            )}
            {task.priority && (
              <Badge color={getPriorityColor(task.priority)} bg={getPriorityColor(task.priority) + "18"}>
                {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
              </Badge>
            )}
            {task.notes && <Paperclip size={13} style={{ color: T.textMuted, flexShrink: 0 }} />}
            {task.time && (
              <>
                <Clock size={13} style={{ color: T.textMuted, flexShrink: 0 }} />
                <span style={{
                  color: isOpen ? (weekend ? T.weekend : T.accent) : T.textMuted,
                  fontSize: ".8rem", fontWeight: 600,
                }}>{task.time}</span>
              </>
            )}
            {task.time && task.reminder && task.reminder !== "0" && isOpen && (
              <Badge color={weekend ? T.weekend : T.accentDark}
                bg={weekend ? T.weekendLight : T.accentLight}>
                {task.reminder >= 60 ? `${task.reminder / 60}h antes` : `${task.reminder}min antes`}
              </Badge>
            )}
          </div>

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
