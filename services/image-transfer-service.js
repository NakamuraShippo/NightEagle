class ImageTransferService {
  constructor(debug, eagleService, taskManager, localFolderService, promptManager) {
    this.debug = debug;
    this.eagleService = eagleService;
    this.taskManager = taskManager;
    this.localFolderService = localFolderService;
    this.promptManager = promptManager;
  }

  async handleImageTransfer(imageData, imageName, parameters, taskId, tabId) {
    try {
      this.debug.log(`Starting image transfer for task ${taskId}`);
      this.taskManager.updateTaskStatus(taskId, 'fetching', 10);
      const blob = await this.fetchBlob(imageData);

      this.taskManager.updateTaskStatus(taskId, 'converting', 30);
      const base64data = await this.blobToBase64(blob);

      this.taskManager.updateTaskStatus(taskId, 'sending', 50);
      
      const settings = await chrome.storage.sync.get(['eagleFolder', 'localFolder', 'allTags', 'transferTarget']);
      const tags = settings.allTags
        ? settings.allTags.split(',').map(tag => tag.trim())
        : ["NovelAI", "AI Generated"];
      
      if (settings.transferTarget === 'local') {
        await this.localFolderService.saveImageToLocalFolder(base64data, imageName, settings.localFolder);
      } else {
        await this.eagleService.sendImageToEagle(base64data, imageName, parameters, tags, settings.eagleFolder);
      }

      this.taskManager.updateTaskStatus(taskId, 'completed', 100);
      chrome.tabs.sendMessage(tabId, { action: "transferComplete", taskId });
      this.debug.endTimer("imageTransfer");

      // 送信完了時に prompt.yaml にレコードを追加
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];
      this.promptManager.addPrompt({
        date: dateStr,
        time: timeStr,
        positive: parameters.positivePrompt,
        negative: parameters.negativePrompt
      });
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
