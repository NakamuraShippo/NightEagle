class TaskManager {
  constructor(debug) {
    this.debug = debug;
    this.tasks = new Map();
  }

  createTask() {
    const taskId = Date.now().toString();
    this.tasks.set(taskId, { status: 'pending', progress: 0 });
    this.debug.log(`Task created: ${taskId}`);
    return taskId;
  }

  updateTaskStatus(taskId, status, progress, error = null) {
    if (this.tasks.has(taskId)) {
      this.tasks.set(taskId, { status, progress, error });
      this.debug.log(`Task ${taskId} updated`, { status, progress, error });
    } else {
      this.debug.error(`Task ${taskId} not found`);
    }
  }

  getTaskStatus(taskId) {
    if (this.tasks.has(taskId)) {
      return this.tasks.get(taskId);
    } else {
      this.debug.error(`Task ${taskId} not found`);
      return null;
    }
  }
}

self.TaskManager = TaskManager;