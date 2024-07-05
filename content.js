console.log("NightEagle: Content script loaded");

let debugMode = true;

function debugLog(...args) {
  if (debugMode) {
    console.log("NightEagle Debug:", ...args);
  }
}

function getImageParameters() {
  try {
    const positivePrompt = getPromptText('positive');
    const negativePrompt = getPromptText('negative');
    const steps = document.querySelector('.sc-c87c6dcc-9.fUNIFR input[type="number"]')?.value ?? 'N/A';
    const cfg = document.querySelectorAll('.sc-c87c6dcc-9.fUNIFR input[type="number"]')[1]?.value ?? 'N/A';

    const seedElement = document.querySelector('.sc-d72450af-1.sc-b221f04b-15.kXFbYD.fPwlQS .sc-a2d0901c-54.hCPgld span span:first-child');
    const seed = seedElement ? seedElement.textContent : 'N/A';

    const sampler = document.querySelector('.sc-a2d0901c-15.gfkdYu .css-4t5j3y-singleValue')?.textContent ?? 'N/A';

    debugLog("Gathered image parameters", { positivePrompt, negativePrompt, steps, cfg, seed, sampler });

    return {
      positivePrompt,
      negativePrompt,
      steps,
      cfg,
      seed,
      sampler
    };
  } catch (error) {
    console.error("NightEagle: Error in getImageParameters", error);
    return null;
  }
}

function getPromptText(type) {
  debugLog(`Searching for ${type} prompt`);

  if (type === 'positive') {
    const positiveElement = document.querySelector("textarea[placeholder='プロンプトを入力し、理想の画像を生成しましょう']");
    if (positiveElement) {
      debugLog("Positive prompt found:", positiveElement.value);
      return positiveElement.value;
    }
  } else {
    // ネガティブプロンプトの場合、表示されている要素のみを対象とする
    const negativeElements = Array.from(document.querySelectorAll("textarea[placeholder='除外したい要素を入力してください']"));
    const visibleNegativeElement = negativeElements.find(el => el.offsetParent !== null);
    if (visibleNegativeElement) {
      debugLog("Negative prompt found:", visibleNegativeElement.value);
      return visibleNegativeElement.value;
    }
  }

  debugLog(`${type} prompt element not found`);
  debugLog("All textarea elements:", Array.from(document.querySelectorAll('textarea')).map(el => ({
    placeholder: el.placeholder,
    value: el.value,
    isVisible: el.offsetParent !== null
  })));

  return '';
}

function processImage(imgNode) {
  if (!imgNode.src.startsWith('blob:') || processedImages.has(imgNode.src)) return;

  console.log("NightEagle: New image detected", imgNode.src);
  processedImages.add(imgNode.src);

  setTimeout(() => {
    const parameters = getImageParameters();
    console.log("NightEagle: Image parameters", parameters);

    if (parameters) {
      chrome.runtime.sendMessage({
        action: "sendToEagle",
        imageData: imgNode.src,
        imageName: `NovelAI_${new Date().toISOString()}.png`,
        parameters: parameters
      }, response => {
        if (chrome.runtime.lastError) {
          console.error("NightEagle: Error sending message to background:", chrome.runtime.lastError);
        } else {
          console.log("NightEagle: Background script response", response);
        }
      });
    }
  }, 100);
}

function observeNovelAI() {
  console.log("NightEagle: Starting observation");

  const targetNode = document.body;
  const config = { childList: true, subtree: true, attributes: true, characterData: false };

  const callback = function(mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const images = node.querySelectorAll('img');
            images.forEach(processImage);
          }
        });
      } else if (mutation.type === 'attributes' && mutation.target.nodeName === 'IMG') {
        processImage(mutation.target);
      }
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
}
/* 
function processImage(imgNode) {
  if (!imgNode.src.startsWith('blob:') || processedImages.has(imgNode.src)) return;
  
  console.log("NightEagle: New image detected", imgNode.src);
  processedImages.add(imgNode.src);

  setTimeout(() => {
    const parameters = getImageParameters();
    console.log("NightEagle: Image parameters", parameters);

    if (parameters) {
      chrome.runtime.sendMessage({
        action: "sendToEagle",
        imageData: imgNode.src,
        imageName: `NovelAI_${new Date().toISOString()}.png`,
        parameters: parameters
      }, response => {
        if (chrome.runtime.lastError) {
          console.error("NightEagle: Error sending message to background:", chrome.runtime.lastError);
        } else {
          console.log("NightEagle: Background script response", response);
        }
      });
    }
  }, 100);
}
 */
let processedImages = new Set();

// Clear processed images every 5 minutes to prevent memory issues
setInterval(() => {
  processedImages.clear();
}, 5 * 60 * 1000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("NightEagle: Message received in content script", request);
  if (request.action === "toggleDebug") {
    toggleDebugMode();
    sendResponse({debugMode: debugMode});
  } else if (request.action === "getDebugInfo") {
    sendResponse(gatherDebugInfo());
  }
  return true;
});

function gatherDebugInfo() {
  const info = {
    browserInfo: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    NovelAIVersion: document.querySelector('meta[name="version"]')?.content ?? 'Unknown',
    promptElements: Array.from(document.querySelectorAll('textarea')).map(el => ({
      placeholder: el.placeholder,
      className: el.className,
      value: el.value
    })),
    imageParameters: getImageParameters()
  };
  
  console.log("NightEagle Debug Info:", JSON.stringify(info, null, 2));
  return info;
}

observeNovelAI();
console.log("NightEagle: Observation started");