class ImageTransferService {
  constructor(debug, eagleService, taskManager) {
    this.debug = debug;
    this.eagleService = eagleService;
    this.taskManager = taskManager;
  }

  async handleImageTransfer(imageData, imageName, parameters, taskId, tabId) {
    try {
      this.debug.log(`Starting image transfer for task ${taskId}`);
      this.taskManager.updateTaskStatus(taskId, 'fetching', 10);
      const blob = await this.fetchBlob(imageData);

      this.taskManager.updateTaskStatus(taskId, 'converting', 30);
      const base64data = await this.blobToBase64(blob);

      this.taskManager.updateTaskStatus(taskId, 'sending', 50);
      
      const settings = await chrome.storage.sync.get(['eagleFolder', 'allTags']);
      const tags = settings.allTags ? settings.allTags.split(',').map(tag => tag.trim()) : ["NovelAI", "AI Generated"];
      
      await this.eagleService.sendImageToEagle(base64data, imageName, parameters, tags, settings.eagleFolder);

      this.taskManager.updateTaskStatus(taskId, 'completed', 100);
      chrome.tabs.sendMessage(tabId, { action: "transferComplete", taskId });
      this.debug.endTimer("imageTransfer");
    } catch (error) {
      this.debug.error(`Image transfer failed for task ${taskId}`, error);
      this.taskManager.updateTaskStatus(taskId, 'error', 0, error.message);
      chrome.tabs.sendMessage(tabId, { action: "transferError", taskId, error: error.message });
    }
  }

  async fetchBlob(imageData) {
    this.debug.startTimer("fetchBlob");
    try {
      const response = await fetch(imageData);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.debug.endTimer("fetchBlob");
      return await response.blob();
    } catch (error) {
      this.debug.error("Error fetching blob", error);
      throw error;
    }
  }

  blobToBase64(blob) {
    this.debug.startTimer("blobToBase64");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.debug.endTimer("blobToBase64");
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

self.ImageTransferService = ImageTransferService;