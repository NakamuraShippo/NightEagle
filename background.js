console.log("NightEagle: Background script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("NightEagle: Message received in background script", request);
  if (request.action === "sendToEagle") {
    handleSendToEagle(request, sender).then(sendResponse);
    return true;  // 非同期レスポンスを示す
  } else if (request.action === "testEagleConnection") {
    handleTestEagleConnection(request).then(sendResponse);
    return true;  // 非同期レスポンスを示す
  }
});

async function handleSendToEagle(request, sender) {
  try {
    const result = await Promise.race([
      fetchBlobAndSendToEagle(request.imageData, request.imageName, request.parameters, sender.tab.id),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Operation timed out")), 25000))
    ]);
    console.log("NightEagle: sendImageToEagle success", result);
    return {success: true, result: result};
  } catch (error) {
    console.error("NightEagle: Error in sendImageToEagle:", error);
    return {success: false, error: error.message, details: error.stack};
  }
}

async function handleTestEagleConnection(request) {
  try {
    const result = await testEagleConnection(request.endpoint);
    console.log("NightEagle: testEagleConnection success", result);
    return {success: true, result: result};
  } catch (error) {
    console.error("NightEagle: Error in testEagleConnection:", error);
    return {success: false, error: error.message, details: error.stack};
  }
}

async function fetchBlobAndSendToEagle(blobUrl, imageName, parameters, tabId) {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const base64data = await blobToBase64(blob);
    return await sendImageToEagle(base64data, imageName, parameters, tabId);
  } catch (error) {
    console.error("NightEagle: Error fetching blob:", error);
    throw error;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function sendImageToEagle(imageData, imageName, parameters, tabId) {
  console.log("NightEagle: Sending image to Eagle with parameters", parameters);
  try {
    const settings = await chrome.storage.sync.get(['eagleEndpoint']);
    const eagleEndpoint = settings.eagleEndpoint || "http://localhost:41595/api/item/addFromURL";

    const memo = `Positive Prompt:\n${parameters.positivePrompt}\n\n` +
                  `Negative Prompt:\n${parameters.negativePrompt}\n\n` +
                  `Steps: ${parameters.steps}\n` +
                  `CFG: ${parameters.cfg}\n` +
                  `Seed: ${parameters.seed}\n` +
                  `Sampler: ${parameters.sampler}`;

    console.log("NightEagle: Generated memo", memo);
    console.log("NightEagle: Eagle endpoint", eagleEndpoint);

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

    console.log("NightEagle: Eagle API response", response);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('NightEagle: Image successfully sent to Eagle:', result);

    chrome.tabs.sendMessage(tabId, {action: "notifySuccess", message: "Image sent to Eagle successfully!"});

    return result;
  } catch (error) {
    console.error('NightEagle: Error sending image to Eagle:', error);
    chrome.tabs.sendMessage(tabId, {action: "notifyError", message: "Failed to send image to Eagle. Please check your settings and Eagle application."});
    throw new Error(`Failed to send image to Eagle: ${error.message}`);
  }
}

async function testEagleConnection(endpoint) {
  console.log("NightEagle: Testing Eagle connection to", endpoint);
  try {
    const response = await fetch(endpoint, {
      method: 'GET'
    });
    console.log("NightEagle: Eagle connection test response", response);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('NightEagle: Error testing Eagle connection:', error);
    throw new Error(`Failed to connect to Eagle: ${error.message}`);
  }
}

console.log("NightEagle: Background script fully loaded");