class ConfigManager {
  constructor(debug) {
    this.debug = debug;
    this.config = null;
  }

  async loadConfig() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/NakamuraShippo/nighteagle/main/config.json');
      this.config = await response.json();
      this.debug.log('Config loaded', this.config);
      this.scheduleNextUpdate();
    } catch (error) {
      this.debug.error('Error loading config:', error);
    }
  }

  async updateConfig() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/NakamuraShippo/nighteagle/main/config.json');
      const newConfig = await response.json();
      if (newConfig.version !== this.config.version) {
        this.config = newConfig;
        chrome.storage.local.set({ config: this.config });
        this.debug.log('Config updated to version:', this.config.version);
      }
    } catch (error) {
      this.debug.error('Error updating config:', error);
    }
    this.scheduleNextUpdate();
  }

  scheduleNextUpdate() {
    setTimeout(() => this.updateConfig(), this.config.updateInterval);
  }

  getSelector(key) {
    return this.config.selectors[key];
  }
}

self.ConfigManager = ConfigManager;
