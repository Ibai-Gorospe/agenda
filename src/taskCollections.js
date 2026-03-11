export const replaceTaskById = (tasks = [], nextTask) => (
  tasks.map(task => (task.id === nextTask.id ? nextTask : task))
);

export const upsertTaskById = (tasks = [], nextTask) => (
  tasks.some(task => task.id === nextTask.id)
    ? replaceTaskById(tasks, nextTask)
    : [...tasks, nextTask]
);
