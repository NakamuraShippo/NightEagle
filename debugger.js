class NightEagleDebugger {
  constructor(isEnabled = true) {
    this.isEnabled = isEnabled;
    this.logs = [];
    this.errors = [];
    this.timers = {};
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  log(message, data = null) {
    if (this.isEnabled) {
      const logEntry = { timestamp: new Date(), message, data };
      this.logs.push(logEntry);
      console.log(`NightEagle Debug: ${message}`, data);
    }
  }

  error(message, error = null) {
    if (this.isEnabled) {
      const errorEntry = { timestamp: new Date(), message, error };
      this.errors.push(errorEntry);
      console.error(`NightEagle Error: ${message}`, error);
    }
  }

  startTimer(label) {
    if (this.isEnabled) {
      this.timers[label] = performance.now();
    }
  }

  endTimer(label) {
    if (this.isEnabled && this.timers[label]) {
      const duration = performance.now() - this.timers[label];
      this.log(`Timer "${label}" ended`, `${duration.toFixed(2)}ms`);
      delete this.timers[label];
    }
  }

  getLogs() {
    return this.logs;
  }

  getErrors() {
    return this.errors;
  }

  clearLogs() {
    this.logs = [];
  }

  clearErrors() {
    this.errors = [];
  }
}

self.NightEagleDebugger = NightEagleDebugger;