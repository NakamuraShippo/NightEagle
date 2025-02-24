class LocalFolderService {
  constructor(debug) {
    this.debug = debug;
  }

  // サニタイズ用のヘルパー関数
  sanitizeFilename(name) {
    // 英数字、アンダースコア、ハイフン、ピリオド、スペース以外を削除する例
    return name.replace(/[^a-zA-Z0-9_\-\. ]/g, '');
  }

  async saveImageToLocalFolder(imageData, imageName, folderName) {
    this.debug.log("Saving image to local folder", { imageName, folderName });
    try {
      // サニタイズ処理を適用
      const safeFolder = folderName ? this.sanitizeFilename(folderName) : "";
      const safeImageName = this.sanitizeFilename(imageName);
      
      // "NightEagle" フォルダー以下に保存するようにパスを指定
      const finalFilename = safeFolder 
        ? `NightEagle/${safeFolder}/${safeImageName}`
        : `NightEagle/${safeImageName}`;
      
      const options = {
        url: imageData,
        filename: finalFilename,
        conflictAction: 'uniquify'
      };
      
      chrome.downloads.download(options, (downloadId) => {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }
        this.debug.log("Image download started with ID", downloadId);
      });
    } catch (error) {
      this.debug.error("Error saving image to local folder", error);
      throw error;
    }
  }
}

self.LocalFolderService = LocalFolderService;
