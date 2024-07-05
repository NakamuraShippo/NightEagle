console.log("NovelAI to Eagle: Background script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("NovelAI to Eagle: Message received in background script", request);
  if (request.action === "sendToEagle") {
    sendImageToEagle(request.imageData, request.imageName, request.parameters, sender.tab.id)
      .then(() => {
        sendResponse({success: true});
      })
      .catch(error => {
        console.error("Error in sendImageToEagle:", error);
        sendResponse({success: false, error: error.message});
      });
    return true;  // 非同期レスポンスを示す
  }
});

async function sendImageToEagle(imageData, imageName, parameters, tabId) {
  console.log("NovelAI to Eagle: Sending image to Eagle with parameters", parameters);
  try {
    const settings = await chrome.storage.sync.get(['eagleEndpoint']);
    const eagleEndpoint = settings.eagleEndpoint || "http://localhost:41595/api/item/addFromURL";

    const memo = `Positive Prompt: ${parameters.positivePrompt}\n` +
                  `Negative Prompt: ${parameters.negativePrompt}\n` +
                  `Steps: ${parameters.steps}\n` +
                  `CFG: ${parameters.cfg}\n` +
                  `Seed: ${parameters.seed}\n` +
                  `Sampler: ${parameters.sampler}`;

    console.log("NovelAI to Eagle: Generated memo", memo);
    console.log("NovelAI to Eagle: Eagle endpoint", eagleEndpoint);

    const response = await fetch(eagleEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: imageData,
        name: imageName,
        website: "https://novelai.net/",
        annotation: memo,
        tags: ["NovelAI", "AI Generated"],
        folder: ""
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('NovelAI to Eagle: Image successfully sent to Eagle:', result);

    chrome.tabs.sendMessage(tabId, {action: "notifySuccess", message: "Image sent to Eagle successfully!"});
  } catch (error) {
    console.error('NovelAI to Eagle: Error sending image to Eagle:', error);

    chrome.tabs.sendMessage(tabId, {action: "notifyError", message: "Failed to send image to Eagle. Please check your settings and Eagle application."});
    throw error;  // エラーを再スローして呼び出し元に伝播させる
  }
}