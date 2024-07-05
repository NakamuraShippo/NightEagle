console.log("NovelAI to Eagle: Content script loaded");

let processedImages = new Set();

function observeNovelAI() {
  console.log("NovelAI to Eagle: Starting observation");

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

function getImageParameters() {
  const positivePrompt = document.querySelector('textarea[placeholder="プロンプトを入力し、理想の画像を生成しましょう"]').value;
  const negativePrompt = document.querySelector('textarea[placeholder="除外したい要素を入力してください"]').value;
  const steps = document.querySelector('.sc-c87c6dcc-9.fUNIFR input[type="number"]').value;
  const cfg = document.querySelectorAll('.sc-c87c6dcc-9.fUNIFR input[type="number"]')[1].value;
  const seed = document.querySelector('.sc-a2d0901c-15.fZXwKX button').textContent;
  const sampler = document.querySelector('.sc-a2d0901c-15.gfkdYu .css-4t5j3y-singleValue').textContent;

  return {
    positivePrompt,
    negativePrompt,
    steps,
    cfg,
    seed,
    sampler
  };
}

function processImage(imgNode) {
  if (!imgNode.src.startsWith('blob:') || processedImages.has(imgNode.src)) return;

  console.log("NovelAI to Eagle: New image detected", imgNode.src);
  processedImages.add(imgNode.src);

  // Wait for a short time to ensure all parameters are updated
  setTimeout(() => {
    const parameters = getImageParameters();
    console.log("NovelAI to Eagle: Image parameters", parameters);

    fetch(imgNode.src)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = function() {
          const base64data = reader.result;
          sendMessageToBackground({
            action: "sendToEagle",
            imageData: base64data,
            imageName: `NovelAI_${new Date().toISOString()}.png`,
            parameters: parameters
          }).catch(error => {
            console.error("Error sending message to background:", error);
            showNotification("Error", "Failed to send image to Eagle. Please try again.");
          });
        }
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error("Error processing image:", error);
        showNotification("Error", "Failed to process image. Please try again.");
      });
  }, 100);  // 100ms delay to ensure parameters are updated
}

function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Message sending timed out"));
    }, 30000);  // 30秒のタイムアウト

    chrome.runtime.sendMessage(message, response => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        console.warn("NovelAI to Eagle: Error in sendMessage", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log("NovelAI to Eagle: Background script response", response);
        resolve(response);
      }
    });
  });
}

function showNotification(title, message) {
  if (Notification.permission === "granted") {
    new Notification(title, { body: message });
  } else {
    console.log(`${title}: ${message}`);
  }
}

// Clear processed images every 5 minutes to prevent memory issues
setInterval(() => {
  processedImages.clear();
}, 5 * 60 * 1000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("NovelAI to Eagle: Message received in content script", request);
  if (request.action === "checkStatus") {
    sendResponse({status: "Active on NovelAI page"});
    return true;  // 非同期レスポンスを示す
  } else if (request.action === "notifySuccess" || request.action === "notifyError") {
    console.log(request.message);
    showNotification(request.action === "notifySuccess" ? "Success" : "Error", request.message);
  }
});

observeNovelAI();
console.log("NovelAI to Eagle: Observation started");