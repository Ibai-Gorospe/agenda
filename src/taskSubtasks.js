export const toggleSubtaskById = (subtasks = [], subtaskId) => (
  subtasks.map(subtask => (
    subtask.id === subtaskId
      ? { ...subtask, done: !subtask.done }
      : subtask
  ))
);

export const withToggledSubtask = (task, subtaskId) => ({
  ...task,
  subtasks: toggleSubtaskById(task.subtasks || [], subtaskId),
});
