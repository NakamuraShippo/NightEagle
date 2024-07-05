console.log("NightEagle: Background script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("NightEagle: Message received in background script", request);
  if (request.action === "sendToEagle") {
    sendImageToEagle(request.imageData, request.imageName, request.parameters)
      .then((result) => {
        console.log("NightEagle: sendImageToEagle success", result);
        sendResponse({success: true, result: result});
      })
      .catch(error => {
        console.error("NightEagle: Error in sendImageToEagle:", error);
        sendResponse({success: false, error: error.message, details: error.stack});
      });
    return true;  // 非同期レスポンスを示す
  } else if (request.action === "testEagleConnection") {
    testEagleConnection(request.endpoint)
      .then((result) => {
        console.log("NightEagle: testEagleConnection success", result);
        sendResponse({success: true, result: result});
      })
      .catch(error => {
        console.error("NightEagle: Error in testEagleConnection:", error);
        sendResponse({success: false, error: error.message, details: error.stack});
      });
    return true;  // 非同期レスポンスを示す
  }
});

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

async function sendImageToEagle(imageData, imageName, parameters) {
  console.log("NightEagle: Sending image to Eagle with parameters", parameters);
  try {
    const eagleEndpoint = 'http://localhost:41595/api/item/addFromURL';

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
    return result;
  } catch (error) {
    console.error('NightEagle: Error sending image to Eagle:', error);
    throw new Error(`Failed to send image to Eagle: ${error.message}`);
  }
}

console.log("NightEagle: Background script fully loaded");