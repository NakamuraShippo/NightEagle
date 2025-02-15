class LocalFolderService {
    constructor(debug) {
      this.debug = debug;
    }
  
    async saveImageToLocalFolder(imageData, imageName, folderPath) {
      this.debug.log("Saving image to local folder", { imageName, folderPath });
      try {
        const options = {
          url: imageData,
          // folderPath が設定されていれば「folderPath/imagename」、なければ imagename のみ
          filename: folderPath ? `${folderPath}/${imageName}` : imageName,
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