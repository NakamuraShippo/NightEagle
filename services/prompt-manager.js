class PromptManager {
    constructor(debug) {
      this.debug = debug;
      this.storageKey = 'promptYaml';
      this.prompts = [];
      this.loadPrompts();
    }
  
    loadPrompts() {
      chrome.storage.local.get([this.storageKey], (result) => {
        if (result[this.storageKey]) {
          try {
            this.prompts = this.parseYaml(result[this.storageKey]);
          } catch (e) {
            this.debug.error("Error parsing promptYaml", e);
            this.prompts = [];
          }
        } else {
          this.prompts = [];
        }
      });
    }
  
    savePrompts() {
      const yamlStr = this.convertToYaml(this.prompts);
      chrome.storage.local.set({ [this.storageKey]: yamlStr }, () => {
        this.debug.log("promptYaml saved", yamlStr);
      });
    }
  
    addPrompt(record) {
      this.prompts.push(record);
      this.savePrompts();
    }
  
    getPrompts() {
      return this.prompts;
    }
  
    // 簡易 YAML 変換（各レコードは date, time, positive, negative）
    convertToYaml(promptsArray) {
      let yaml = "";
      promptsArray.forEach(record => {
        yaml += `- date: ${record.date}\n  time: ${record.time}\n  positive: "${record.positive.replace(/"/g, '\\"')}"\n  negative: "${record.negative.replace(/"/g, '\\"')}"\n`;
      });
      return yaml;
    }
  
    parseYaml(yamlStr) {
      const lines = yamlStr.split('\n');
      const records = [];
      let current = null;
      lines.forEach(line => {
        if (line.startsWith('-')) {
          if (current) records.push(current);
          current = {};
        } else if (current && line.trim()) {
          const parts = line.trim().split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim().replace(/^"|"$/g, '');
            current[key] = value;
          }
        }
      });
      if (current) records.push(current);
      return records;
    }
  }
  
  self.PromptManager = PromptManager;
  