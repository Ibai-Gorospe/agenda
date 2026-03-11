import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { T } from "../theme";
import { getPriorityColor } from "../constants";
import { getChecklistMeta } from "../checklist";
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
  Dumbbell,
  GripVertical,
  Paperclip,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
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

export default function SortableWorkoutTask({
  task,
  date,
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
  const exercisesMeta = getChecklistMeta(task.subtasks);
  const exercisesDone = exercisesMeta.completed;
  const exercisesTotal = exercisesMeta.total;
  const openExercises = exercisesMeta.pendingItems;
  const doneExercises = exercisesMeta.completedItems;
  const scheduledBadge = getScheduledDateBadge(getTaskScheduledDate(task, date), date);
  const exercisesPreviewLabel = exercisesMeta.pending > 0 ? "Siguiente" : "Rutina";
  const exercisesPreviewSuffix = exercisesMeta.remainingPreviewCount > 0
    ? ` +${exercisesMeta.remainingPreviewCount}`
    : "";

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
    if (exercisesTotal > 0) {
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
          background: isOpen ? T.gymBg : T.doneBg,
          border: `1.5px solid ${isDragging ? T.gym : T.gymBorder}`,
          borderLeft: `4px solid ${isOpen ? T.gym : T.textMuted}`,
          borderRadius: T.r4,
          padding: ".85rem 1rem",
          boxShadow: isDragging ? T.shadowFloat : (isOpen ? T.gymShadow : "none"),
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
            aria-label={isDoneState ? "Marcar como pendiente" : isSkippedState ? "Entrenamiento omitido" : "Marcar como completado"}
            style={{
              width: "32px", height: "32px", borderRadius: T.r3, flexShrink: 0,
              border: `2.5px solid ${isDoneState ? T.gym : T.gymBorder}`,
              background: isDoneState ? T.gymGrad : "transparent",
              cursor: isSkippedState ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .15s", opacity: isSkippedState ? 0.6 : 1,
            }}
          >
            {isDoneState && <span className="check-pop"><Check size={16} color="#fff" strokeWidth={3} /></span>}
          </button>

          <div style={{ flex: 1, minWidth: 0, cursor: exercisesTotal > 0 || !isSkippedState ? "pointer" : "default" }} onClick={handleMainClick}>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <Dumbbell size={15} style={{ color: isOpen ? T.gym : T.textMuted, flexShrink: 0 }} />
              <p style={{
                color: isOpen ? T.text : T.textMuted,
                textDecoration: isDoneState ? "line-through" : "none",
                fontSize: ".97rem", lineHeight: 1.4, wordBreak: "break-word",
                margin: 0, flex: 1, fontWeight: 600,
              }}>{task.text}</p>
            </div>

            {exercisesTotal > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(prev => !prev);
                }}
                style={{
                  marginTop: ".45rem",
                  background: isOpen ? T.gymLight : T.doneBg,
                  border: `1px solid ${isOpen ? T.gymBorder : T.borderGray}`,
                  borderRadius: "999px",
                  padding: ".22rem .55rem",
                  color: isOpen ? T.gymDark : T.textMuted,
                  fontSize: ".76rem", cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: ".35rem",
                }}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {exercisesDone}/{exercisesTotal} ejercicios
              </button>
            )}

            {exercisesTotal > 0 && !expanded && exercisesMeta.previewText && (
              <div style={{
                marginTop: ".4rem",
                display: "flex",
                alignItems: "center",
                gap: ".45rem",
                minWidth: 0,
              }}>
                <span style={{
                  flexShrink: 0,
                  fontSize: ".68rem",
                  fontWeight: 700,
                  color: isOpen ? T.gymDark : T.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}>
                  {exercisesPreviewLabel}
                </span>
                <span style={{
                  minWidth: 0,
                  fontSize: ".76rem",
                  color: T.textMuted,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {exercisesMeta.previewText}
                  {exercisesPreviewSuffix}
                </span>
              </div>
            )}
          </div>
        </div>

        {exercisesTotal > 0 && expanded && (
          <div style={{ paddingLeft: "56px", marginTop: ".55rem" }}>
            {openExercises.map(exercise => (
              <button
                key={exercise.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isOpen) onToggleSubtask(date, task.id, exercise.id);
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
                  border: `1.5px solid ${T.gymBorder}`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "transparent",
                }} />
                <span style={{ fontSize: ".82rem", color: T.textSub }}>{exercise.text}</span>
              </button>
            ))}

            {doneExercises.length > 0 && (
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
                {showCompletedSubtasks ? "Ocultar completados" : `Mostrar completados (${doneExercises.length})`}
              </button>
            )}

            {showCompletedSubtasks && doneExercises.map(exercise => (
              <button
                key={exercise.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isOpen) onToggleSubtask(date, task.id, exercise.id);
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
                  border: `1.5px solid ${T.gym}`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: T.gymGrad,
                }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </span>
                <span style={{ fontSize: ".82rem", color: T.textMuted, textDecoration: "line-through" }}>{exercise.text}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: ".5rem", paddingLeft: "56px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            {task.recurrence && (
              <Badge color={isOpen ? T.gymDark : T.textMuted} bg={isOpen ? T.gymBorder : T.doneBg}>
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
                  color: isOpen ? T.gym : T.textMuted,
                  fontSize: ".8rem", fontWeight: 600,
                }}>{task.time}</span>
              </>
            )}
            {task.time && task.reminder && task.reminder !== "0" && isOpen && (
              <Badge color={T.gymDark} bg={T.gymBorder}>
                {task.reminder >= 60 ? `${task.reminder / 60}h antes` : `${task.reminder}min antes`}
              </Badge>
            )}
          </div>

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
