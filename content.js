console.log("NightEagle: Content script starting");

let imageDetector;
let parameterExtractor;

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
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName === "IMG" &&
            node.src.startsWith("blob:") &&
            !this.processedImages.has(node.src)
          ) {
            console.log("NightEagle: New image found", node.src);
            this.processedImages.add(node.src);
            
            // 画像が見つかったら、パラメーターが揃うまで少し待つ
            setTimeout(() => {
              this.callbacks.forEach((callback) => callback(node));
            }, 1000);
          }
        });
      }
    }
  }
}

/**
 * パラメータ抽出用クラス - セレクターIDに依存しない方法で取得
 */
class ParameterExtractor {
  constructor() {
    // シード値が表示されるのを監視
    this.observeSeedValue();
  }

  observeSeedValue() {
    const observer = new MutationObserver(() => {
      // シード値の要素を探す
      const seedElements = document.querySelectorAll('span');
      seedElements.forEach(el => {
        const text = el.textContent.trim();
        // 10桁の数字のみの場合、シード値の可能性が高い
        if (/^\d{10}$/.test(text) && el.style.visibility !== 'hidden') {
          this.lastSeedValue = text;
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /**
   * 各パラメーターをオブジェクトとして抽出する
   */
  extractParameters() {
    const parameters = {};

    try {
      // --- 1) Positive / Negative Prompt ---
      // ProseMirrorクラスを持つ要素を探す（より安定した方法）
      const proseMirrorElements = document.querySelectorAll('.ProseMirror');
      const promptTexts = [];
      
      proseMirrorElements.forEach(el => {
        const text = el.textContent.trim();
        if (text && text.length > 0) {
          promptTexts.push(text);
        }
      });

      // 通常、最初のProseMirrorがPositive Prompt、2番目がNegative Prompt
      parameters.positivePrompt = promptTexts[0] || this.extractPromptAlternative('positive') || "N/A";
      parameters.negativePrompt = promptTexts[1] || this.extractPromptAlternative('negative') || "N/A";

      // --- 2) Steps の抽出 ---
      parameters.steps = this.extractSteps() || "N/A";

      // --- 3) CFG の抽出 ---
      parameters.cfg = this.extractCFG() || "N/A";

      // --- 4) Seed の抽出 ---
      parameters.seed = this.extractSeed() || "N/A";

      // --- 5) Sampler の抽出 ---
      parameters.sampler = this.extractSampler() || "N/A";

    } catch (error) {
      console.error("NightEagle: Error extracting parameters", error);
    }

    console.log("NightEagle: Extracted parameters", parameters);
    return parameters;
  }

  // 代替のプロンプト取得方法
  extractPromptAlternative(type) {
    try {
      // contenteditable="true" を持つdivを探す
      const editableElements = document.querySelectorAll('div[contenteditable="true"]');
      const prompts = [];
      
      editableElements.forEach(el => {
        const proseMirror = el.querySelector('.ProseMirror');
        if (proseMirror) {
          const text = proseMirror.textContent.trim();
          if (text) prompts.push(text);
        }
      });

      if (type === 'positive' && prompts[0]) return prompts[0];
      if (type === 'negative' && prompts[1]) return prompts[1];
    } catch (error) {
      console.error("NightEagle: Error in extractPromptAlternative", error);
    }
    return null;
  }

  // Steps の抽出
  extractSteps() {
    try {
      // step="1" を持つinput要素を探す
      const stepsInput = document.querySelector('input[step="1"][type="number"]');
      if (stepsInput) return stepsInput.value;

      // 代替方法: ステップというテキストの近くにあるinput要素
      const allSpans = document.querySelectorAll('span');
      for (let span of allSpans) {
        if (span.textContent === 'ステップ') {
          const container = span.closest('div');
          if (container) {
            const input = container.querySelector('input[type="number"]');
            if (input) return input.value;
          }
        }
      }
    } catch (error) {
      console.error("NightEagle: Error extracting steps", error);
    }
    return null;
  }

  // CFG の抽出
  extractCFG() {
    try {
      // step="0.1" を持つinput要素を探す
      const cfgInput = document.querySelector('input[step="0.1"][type="number"]');
      if (cfgInput) return cfgInput.value;

      // 代替方法: 正確度というテキストの近くにあるinput要素
      const allSpans = document.querySelectorAll('span');
      for (let span of allSpans) {
        if (span.textContent === '正確度') {
          const container = span.closest('div');
          if (container) {
            const input = container.querySelector('input[type="number"]');
            if (input) return input.value;
          }
        }
      }
    } catch (error) {
      console.error("NightEagle: Error extracting CFG", error);
    }
    return null;
  }

  // Seed の抽出
  extractSeed() {
    try {
      // 最後に観測されたシード値を使用
      if (this.lastSeedValue) return this.lastSeedValue;

      // 10桁の数字のみを含むspan要素を探す
      const allSpans = document.querySelectorAll('span');
      for (let span of allSpans) {
        const text = span.textContent.trim();
        if (/^\d{10}$/.test(text) && span.style.visibility !== 'hidden') {
          return text;
        }
      }

      // 代替方法: シード値というテキストの近くにある数字
      for (let span of allSpans) {
        if (span.textContent === 'シード値') {
          const container = span.closest('div');
          if (container) {
            const nextDiv = container.nextElementSibling;
            if (nextDiv) {
              const seedSpan = nextDiv.querySelector('span');
              if (seedSpan && /^\d+$/.test(seedSpan.textContent.trim())) {
                return seedSpan.textContent.trim();
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("NightEagle: Error extracting seed", error);
    }
    return null;
  }

  // Sampler の抽出
  extractSampler() {
    try {
      // サンプラーというテキストの近くにあるボタンのテキスト
      const allSpans = document.querySelectorAll('span');
      for (let span of allSpans) {
        if (span.textContent === 'サンプラー') {
          const container = span.closest('div');
          if (container) {
            const button = container.querySelector('button span');
            if (button) return button.textContent.trim();
          }
        }
      }

      // 代替方法: Select a samplerというaria-labelを持つinput要素の近くを探す
      const samplerInput = document.querySelector('input[aria-label="Select a sampler"]');
      if (samplerInput) {
        const container = samplerInput.closest('div[class*="control"]');
        if (container) {
          const valueEl = container.querySelector('div[class*="singleValue"]');
          if (valueEl) return valueEl.textContent.trim();
        }
      }

      // さらに代替: Euler Ancestralなどのサンプラー名を直接探す
      const samplerNames = ['Euler Ancestral', 'Euler', 'DPM++ 2M', 'DPM++ SDE', 'DPM++ 2M SDE'];
      for (let button of document.querySelectorAll('button span')) {
        const text = button.textContent.trim();
        if (samplerNames.includes(text)) {
          return text;
        }
      }
    } catch (error) {
      console.error("NightEagle: Error extracting sampler", error);
    }
    return null;
  }
}

/**
 * 新規画像が見つかったときの処理
 */
function handleNewImage(imgNode) {
  console.log("NightEagle: Handling new image", imgNode.src);
  
  // パラメーター抽出を複数回試行（シード値などが遅れて表示される場合があるため）
  let attempts = 0;
  const maxAttempts = 5;
  
  const tryExtractAndSend = () => {
    attempts++;
    const parameters = parameterExtractor.extractParameters();
    
    // 重要なパラメーターが取得できているか確認
    const hasEssentialParams = parameters.positivePrompt !== "N/A" || parameters.seed !== "N/A";
    
    if (!hasEssentialParams && attempts < maxAttempts) {
      // まだ重要なパラメーターが取得できていない場合は再試行
      setTimeout(tryExtractAndSend, 1000);
      return;
    }
    
    // 画像をBase64に変換してから送信
    fetch(imgNode.src)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          sendMessageToBackground({
            action: "startImageTransfer",
            imageData: reader.result,
            imageName: `NovelAI_${new Date().toISOString()}.png`,
            parameters: parameters
          }).catch((error) =>
            console.error("NightEagle: Error in handleNewImage", error)
          );
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => console.error("NightEagle: Error converting blob to base64", error));
  };
  
  tryExtractAndSend();
}

/**
 * Background へメッセージを送るユーティリティ
 */
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    const sendMessageWithRetry = (retryCount = 0) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "NightEagle: Error sending message to background",
            chrome.runtime.lastError
          );
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

// 実行開始
initialize();

console.log("NightEagle: Content script setup complete");