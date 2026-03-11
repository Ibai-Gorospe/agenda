export const getNextTaskPosition = (tasks = []) => {
  if (!tasks.length) return 0;
  return Math.max(...tasks.map(task => task.position ?? 0)) + 1;
};

export const assignOrderedTaskPositions = (tasks = []) => (
  tasks.map((task, position) => ({ ...task, position }))
);

export const replaceTasksForDate = (taskMap, date, tasks = []) => ({
  ...taskMap,
  [date]: tasks,
});
