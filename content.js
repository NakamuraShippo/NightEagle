console.log("NightEagle: Content script starting");

let imageDetector;
let parameterExtractor;
let config = null;
const CONFIG_URL = 'https://raw.githubusercontent.com/NakamuraShippo/nighteagle/main/config.json';

async function loadConfig() {
  try {
    const response = await fetch(CONFIG_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    config = await response.json();
    console.log("NightEagle: Configuration loaded", config);
    initializeAfterConfig();
  } catch (error) {
    console.error("NightEagle: Error loading configuration", error);
  }
}

function initializeAfterConfig() {
  imageDetector = new ImageDetector();
  parameterExtractor = new ParameterExtractor();
  imageDetector.onNewImage(handleNewImage);
  console.log("NightEagle: Components initialized with config");
}

class ImageDetector {
  constructor() {
    this.processedImages = new Set();
    this.callbacks = [];
  }

  onNewImage(callback) {
    this.callbacks.push(callback);
    if (!this.observer) {
      this.startObserving();
    }
  }

  startObserving() {
    console.log("NightEagle: Starting image observation");
    this.observer = new MutationObserver(this.checkForNewImages.bind(this));
    this.observer.observe(document.body, config.observerConfig);
  }

  checkForNewImages(mutations) {
    for (let mutation of mutations) {
      if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === config.imageDetection.attribute)) {
        const nodes = mutation.type === 'childList' ? mutation.addedNodes : [mutation.target];
        nodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && node.matches(config.selectors.imageContainer)) {
            const imageUrl = node.getAttribute(config.imageDetection.attribute);
            if (imageUrl && imageUrl.startsWith(config.imageDetection.valueStartsWith) && !this.processedImages.has(imageUrl)) {
              console.log("NightEagle: New image found", imageUrl);
              this.processedImages.add(imageUrl);
              this.callbacks.forEach(callback => callback(node));
            }
          }
        });
      }
    }
  }
}

class ParameterExtractor {
  extractParameters() {
    if (!config) {
      console.error("NightEagle: Configuration not loaded");
      return {};
    }

    const parameters = {};
    for (const [key, selector] of Object.entries(config.selectors)) {
      if (key !== 'imageContainer') {
        const element = document.querySelector(selector);
        parameters[key] = element ? element.value || element.textContent : config.defaultValues[key];
      }
    }

    console.log("NightEagle: Extracted parameters", parameters);
    return parameters;
  }
}

function handleNewImage(imgNode) {
  console.log("NightEagle: Handling new image", imgNode.src);
  const parameters = parameterExtractor.extractParameters();
  sendMessageToBackground({
    action: "startImageTransfer",
    imageData: imgNode.src,
    imageName: `NovelAI_${new Date().toISOString()}.png`,
    parameters: parameters
  }).catch(error => console.error("NightEagle: Error in handleNewImage", error));
}

function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    const sendMessageWithRetry = (retryCount = 0) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          console.warn("NightEagle: Error sending message to background", chrome.runtime.lastError);
          if (retryCount < 3) {
            setTimeout(() => sendMessageWithRetry(retryCount + 1), 1000);
          } else {
            reject(chrome.runtime.lastError);
          }
        } else {
          console.log("NightEagle: Received response from background", response);
          resolve(response);
        }
      });
    };
    sendMessageWithRetry();
  });
}

// メッセージリスナーを追加
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "transferComplete") {
    console.log(`NightEagle: Image transfer completed for task ${message.taskId}`);
  } else if (message.action === "transferError") {
    console.error(`NightEagle: Image transfer failed for task ${message.taskId}`, message.error);
  }
});

loadConfig();

console.log("NightEagle: Content script setup complete");