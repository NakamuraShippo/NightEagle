console.log("NightEagle: Content script starting");

let imageDetector;
let parameterExtractor;

function initializeExtension() {
  imageDetector = new ImageDetector();
  parameterExtractor = new ParameterExtractor();

  imageDetector.onNewImage(handleNewImage);

  console.log("NightEagle: Content script initialized");
}

// ImageDetector class
class ImageDetector {
  constructor() {
    this.processedImages = new Set();
    this.callbacks = [];
    console.log("NightEagle: ImageDetector constructed");
  }

  onNewImage(callback) {
    this.callbacks.push(callback);
    if (!this.observer) {
      this.startObserving();
    }
  }

  startObserving() {
    console.log("NightEagle: Starting image observation");
    const config = { childList: true, subtree: true, attributes: true };
    this.observer = new MutationObserver(this.checkForNewImages.bind(this));
    this.observer.observe(document.body, config);
  }

  checkForNewImages(mutations) {
    console.log("NightEagle: Checking for new images");
    for (let mutation of mutations) {
      if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'src')) {
        const nodes = mutation.type === 'childList' ? mutation.addedNodes : [mutation.target];
        nodes.forEach(node => {
          if (node.nodeName === 'IMG' && node.src.startsWith('blob:') && !this.processedImages.has(node.src)) {
            console.log("NightEagle: New image found", node.src);
            this.processedImages.add(node.src);
            this.callbacks.forEach(callback => callback(node));
          }
        });
      }
    }
  }
}

// ParameterExtractor class
class ParameterExtractor {
  extractParameters() {
    const positivePrompt = this.getPromptText('positive');
    const negativePrompt = this.getPromptText('negative');
    const steps = document.querySelector('.sc-c87c6dcc-9.fUNIFR input[type="number"]')?.value ?? 'N/A';
    const cfg = document.querySelectorAll('.sc-c87c6dcc-9.fUNIFR input[type="number"]')[1]?.value ?? 'N/A';
    const seedElement = document.querySelector('.sc-d72450af-1.sc-b221f04b-15.kXFbYD.fPwlQS .sc-a2d0901c-54.hCPgld span span:first-child');
    const seed = seedElement ? seedElement.textContent : 'N/A';
    const sampler = document.querySelector('.sc-a2d0901c-15.gfkdYu .css-4t5j3y-singleValue')?.textContent ?? 'N/A';

    return {
      positivePrompt,
      negativePrompt,
      steps,
      cfg,
      seed,
      sampler
    };
  }

  getPromptText(type) {
    const selector = type === 'positive' 
      ? 'textarea[placeholder="プロンプトを入力し、理想の画像を生成しましょう"]'
      : 'textarea[placeholder="除外したい要素を入力してください"]';

    const element = document.querySelector(selector);
    return element ? element.value : '';
  }
}

function handleNewImage(imgNode) {
  try {
    console.log("NightEagle: New image detected", imgNode.src);
    const parameters = parameterExtractor.extractParameters();
    console.log("NightEagle: Extracted parameters", parameters);

    sendMessageToBackground({
      action: "startImageTransfer",
      imageData: imgNode.src,
      imageName: `NovelAI_${new Date().toISOString()}.png`,
      parameters: parameters
    });
  } catch (error) {
    console.error("NightEagle: Error handling new image:", error);
    if (error.message.includes("Extension context invalidated")) {
      reinitializeExtension();
    }
  }
}

function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          console.error("NightEagle: Error sending message to background:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log("NightEagle: Image transfer started", response);
          if (response && response.taskId) {
            pollTaskStatus(response.taskId);
          }
          resolve(response);
        }
      });
    } catch (error) {
      console.error("NightEagle: Error in sendMessageToBackground:", error);
      if (error.message.includes("Extension context invalidated")) {
        reinitializeExtension();
      }
      reject(error);
    }
  });
}

function pollTaskStatus(taskId) {
  const intervalId = setInterval(() => {
    try {
      chrome.runtime.sendMessage({ action: "getTaskStatus", taskId }, response => {
        if (chrome.runtime.lastError) {
          console.error("NightEagle: Error checking task status:", chrome.runtime.lastError);
          clearInterval(intervalId);
        } else {
          console.log(`NightEagle: Task ${taskId} status:`, response);
          if (response.status === 'completed' || response.status === 'error') {
            console.log(`NightEagle: Task ${taskId} finished with status: ${response.status}`);
            clearInterval(intervalId);
          }
        }
      });
    } catch (error) {
      console.error("NightEagle: Error in pollTaskStatus:", error);
      if (error.message.includes("Extension context invalidated")) {
        reinitializeExtension();
      }
      clearInterval(intervalId);
    }
  }, 1000);
}

function reinitializeExtension() {
  console.log("NightEagle: Reinitializing extension");
  initializeExtension();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("NightEagle: Received message in content script", message);
  if (message.action === "transferComplete") {
    console.log(`NightEagle: Image transfer completed for task ${message.taskId}`);
    // Notify user of successful transfer
  } else if (message.action === "transferError") {
    console.error(`NightEagle: Image transfer failed for task ${message.taskId}:`, message.error);
    // Notify user of transfer failure
  }
});

initializeExtension();

console.log("NightEagle: Content script setup complete");