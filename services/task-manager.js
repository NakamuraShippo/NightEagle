export class TaskManager {
    constructor() {
      this.tasks = new Map();
    }
  
    createTask() {
      const taskId = Date.now().toString();
      this.tasks.set(taskId, { status: 'pending', progress: 0 });
      return taskId;
    }
  
    updateTaskStatus(taskId, status, progress, error = null) {
      this.tasks.set(taskId, { status, progress, error });
    }
  
    getTaskStatus(taskId) {
      return this.tasks.get(taskId) || { status: 'unknown', progress: 0 };
    }
  }