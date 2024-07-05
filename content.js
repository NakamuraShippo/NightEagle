console.log("NightEagle: Content script loaded");

let processedImages = new Set();

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

function getImageParameters() {
  const positivePrompt = getPromptText('positive');
  const negativePrompt = getPromptText('negative');
  const steps = document.querySelector('.sc-c87c6dcc-9.fUNIFR input[type="number"]').value;
  const cfg = document.querySelectorAll('.sc-c87c6dcc-9.fUNIFR input[type="number"]')[1].value;
  
  const seedElement = document.querySelector('.sc-d72450af-1.sc-b221f04b-15.kXFbYD.fPwlQS .sc-a2d0901c-54.hCPgld span span:first-child');
  const seed = seedElement ? seedElement.textContent : 'N/A';
  
  const sampler = document.querySelector('.sc-a2d0901c-15.gfkdYu .css-4t5j3y-singleValue').textContent;

  console.log("NightEagle: Gathered image parameters", { positivePrompt, negativePrompt, steps, cfg, seed, sampler });

  return {
    positivePrompt,
    negativePrompt,
    steps,
    cfg,
    seed,
    sampler
  };
}

function getPromptText(type) {
  const selectors = [
    `textarea[placeholder="${type === 'positive' ? 'プロンプトを入力し、理想の画像を生成しましょう' : '除外したい要素を入力してください'}"]`,
    `textarea[placeholder="${type === 'positive' ? 'Enter your prompt here' : 'Enter symbols to exclude'}"]`
  ];

  let promptElement;
  for (const selector of selectors) {
    promptElement = document.querySelector(selector);
    if (promptElement) {
      debugLog(`Found ${type} prompt element with selector: ${selector}`, promptElement);
      break;
    }
  }

  if (promptElement) {
    return promptElement.value;
  }

  debugLog(`${type} prompt element not found`);
  debugLog("Available textarea elements:", document.querySelectorAll('textarea'));
  return '';
}

function processImage(imgNode) {
  if (!imgNode.src.startsWith('blob:') || processedImages.has(imgNode.src)) return;

  console.log("NightEagle: New image detected", imgNode.src);
  processedImages.add(imgNode.src);

  setTimeout(() => {
    const parameters = getImageParameters();
    console.log("NightEagle: Image parameters", parameters);

    fetch(imgNode.src)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = function() {
          const base64data = reader.result;
          chrome.runtime.sendMessage({
            action: "sendToEagle",
            imageData: base64data,
            imageName: `NovelAI_${new Date().toISOString()}.png`,
            parameters: parameters
          }, response => {
            if (chrome.runtime.lastError) {
              console.error("NightEagle: Error sending message to background:", chrome.runtime.lastError);
              showNotification("Error", "Failed to communicate with the extension. Please try reloading the page.");
            } else if (response.success) {
              console.log("NightEagle: Image successfully sent to Eagle");
              showNotification("Success", "Image sent to Eagle successfully!");
            } else {
              console.error("NightEagle: Error sending image to Eagle:", response.error);
              showNotification("Error", response.error || "Failed to send image to Eagle. Please check the extension settings.");
            }
          });
        }
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error("NightEagle: Error processing image:", error);
        showNotification("Error", "Failed to process image. Please try again.");
      });
  }, 100);
}

function showNotification(title, message) {
  if (Notification.permission === "granted") {
    new Notification(title, { body: message });
  } else {
    console.log(`${title}: ${message}`);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("NightEagle: Message received in content script", request);
  if (request.action === "checkStatus") {
    sendResponse({status: "Active on NovelAI page"});
    return true;
  }
});

observeNovelAI();
console.log("NightEagle: Observation started");