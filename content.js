console.log("NightEagle: Content script starting");

let imageDetector;
let parameterExtractor;

// let config = null;
// const CONFIG_URL = 'https://raw.githubusercontent.com/NakamuraShippo/nighteagle/main/config.json';

// async function loadConfig() {
//   try {
//     const response = await fetch(CONFIG_URL);
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     config = await response.json();
//     console.log("NightEagle: Configuration loaded", config);
//     initializeAfterConfig();
//   } catch (error) {
//     console.error("NightEagle: Error loading configuration", error);
//   }
// }

// function initializeAfterConfig() {
//   imageDetector = new ImageDetector();
//   parameterExtractor = new ParameterExtractor();
//   imageDetector.onNewImage(handleNewImage);
//   console.log("NightEagle: Components initialized with config");
// }

/* --------------------------------------------------
 *  2) config.json を使わないなら、ハードコーディングorデフォルトの処理
 * -------------------------------------------------- */
function initialize() {
  imageDetector = new ImageDetector();
  parameterExtractor = new ParameterExtractor();
  imageDetector.onNewImage(handleNewImage);
  console.log("NightEagle: Components initialized (no remote config)");
}

/**
 * MutationObserver を使って新しいblob画像を検知する
 */
class ImageDetector {
  constructor() {
    this.processedImages = new Set();
    this.callbacks = [];
    this.startObserving();
  }

  onNewImage(callback) {
    this.callbacks.push(callback);
  }

  startObserving() {
    console.log("NightEagle: Starting image observation");
    // blob画像をsrcに持つ <img> の追加 or src属性変更を監視
    const observerConfig = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"]
    };
    this.observer = new MutationObserver(this.checkForNewImages.bind(this));
    this.observer.observe(document.body, observerConfig);
  }

  checkForNewImages(mutations) {
    for (let mutation of mutations) {
      if (
        mutation.type === "childList" ||
        (mutation.type === "attributes" && mutation.attributeName === "src")
      ) {
        const nodes =
          mutation.type === "childList" ? mutation.addedNodes : [mutation.target];
        nodes.forEach((node) => {
          // img要素かつ srcが "blob:" で始まる
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName === "IMG" &&
            node.src.startsWith("blob:") &&
            !this.processedImages.has(node.src)
          ) {
            console.log("NightEagle: New image found", node.src);
            this.processedImages.add(node.src);
            this.callbacks.forEach((callback) => callback(node));
          }
        });
      }
    }
  }
}

/**
 * パラメータ抽出用クラス
 */
class ParameterExtractor {
  /**
   * 各パラメーターをオブジェクトとして抽出する
   */
  extractParameters() {
    const parameters = {};

    // --- 1) Positive / Negative Prompt ---
    // sc-249c7a4e-45 iNKDqU のなかにある <div class="ProseMirror"><p>...</p></div> を全部取得
    const promptParagraphs = document.querySelectorAll(
      "div.sc-249c7a4e-45.iNKDqU div.ProseMirror p"
    );

    // 先頭を Positive Prompt として取得
    if (promptParagraphs.length > 0) {
      parameters.positivePrompt = promptParagraphs[0].textContent.trim();
    } else {
      parameters.positivePrompt = "N/A";
    }

    // 2番目を Negative Prompt として取得
    if (promptParagraphs.length > 1) {
      parameters.negativePrompt = promptParagraphs[1].textContent.trim();
    } else {
      parameters.negativePrompt = "N/A";
    }

    // --- 2) Steps の抽出 ---
    const stepsElement = document.querySelector(
      "div.sc-b995de7a-9.frBJXL input[step='1']"
    );
    parameters.steps = stepsElement ? stepsElement.value : "N/A";

    // --- 3) CFG の抽出 ---
    const cfgElement = document.querySelector(
      "div.sc-b995de7a-9.frBJXL input[step='0.1']"
    );
    parameters.cfg = cfgElement ? cfgElement.value : "N/A";

    // --- 4) Seed の抽出 ---
    const seedElement = document.querySelector(
      "div.sc-249c7a4e-55.hXTjgY span span:first-child"
    );
    parameters.seed = seedElement ? seedElement.textContent.trim() : "N/A";

    // --- 5) Sampler の抽出 ---
    // aria-label="Select a sampler" を使うなど、構造に合わせて調整してください
    const samplerInput = document.querySelector('input[aria-label="Select a sampler"]');
    if (samplerInput) {
      const samplerContainer = samplerInput.closest('.css-19sbopf-control');
      const samplerEl = samplerContainer?.querySelector('.css-4t5j3y-singleValue');
      parameters.sampler = samplerEl ? samplerEl.textContent.trim() : "N/A";
    } else {
      parameters.sampler = "N/A";
    }

    console.log("NightEagle: Extracted parameters", parameters);
    return parameters;
  }
}


/**
 * 新規画像が見つかったときの処理
 */
function handleNewImage(imgNode) {
  console.log("NightEagle: Handling new image", imgNode.src);
  const parameters = parameterExtractor.extractParameters();
  
  sendMessageToBackground({
    action: "startImageTransfer",
    imageData: imgNode.src,
    imageName: `NovelAI_${new Date().toISOString()}.png`,
    parameters: parameters
  }).catch((error) =>
    console.error("NightEagle: Error in handleNewImage", error)
  );
}

/**
 * Background へメッセージを送るユーティリティ
 */
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    const attemptSend = (retryCount = 0) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Error sending message, retrying:", chrome.runtime.lastError.message);
            if (retryCount < 3) {
              setTimeout(() => attemptSend(retryCount + 1), 1000);
            } else {
              reject(new Error(chrome.runtime.lastError.message));
            }
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        if (retryCount < 3) {
          setTimeout(() => attemptSend(retryCount + 1), 1000);
        } else {
          reject(e);
        }
      }
    };
    attemptSend();
  });
}


// Background → Content のレスポンス受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "transferComplete") {
    console.log(`NightEagle: Image transfer completed for task ${message.taskId}`);
  } else if (message.action === "transferError") {
    console.error(
      `NightEagle: Image transfer failed for task ${message.taskId}`,
      message.error
    );
  }
});

// プロンプトペースト機能
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "pastePrompt") {
    // NovelAIのプロンプト入力欄は、複数のdiv.ProseMirrorとして存在する想定です。
    // 1番目がポジティブプロンプト、2番目がネガティブプロンプトと仮定します。
    const prompters = document.querySelectorAll('div.ProseMirror');
    if (message.promptType === "positive") {
      if (prompters.length > 0) {
        const positiveElement = prompters[0].querySelector('p');
        if (positiveElement) {
          positiveElement.textContent = message.promptText;
          positiveElement.dispatchEvent(new Event('input', { bubbles: true }));
          positiveElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          console.error("Positive prompt <p> element not found.");
        }
      } else {
        console.error("Positive prompt container not found.");
      }
    } else if (message.promptType === "negative") {
      if (prompters.length > 1) {
        const negativeElement = prompters[1].querySelector('p');
        if (negativeElement) {
          negativeElement.textContent = message.promptText;
          negativeElement.dispatchEvent(new Event('input', { bubbles: true }));
          negativeElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          console.error("Negative prompt <p> element not found.");
        }
      } else {
        console.error("Negative prompt container not found.");
      }
    }
  }
});

/* --------------------------------------------------
 * 実行開始
 * -------------------------------------------------- */
// （リモートのconfig.jsonを使わないならこのまま呼び出す）
initialize();

// （リモートのconfig.jsonを使いたい場合は、以下をアンコメント）
// loadConfig();

console.log("NightEagle: Content script setup complete");