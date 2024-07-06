export class EagleService {
    async sendImageToEagle(imageData, imageName, parameters) {
      console.log("NightEagle EagleService: Preparing to send image to Eagle");
      const settings = await chrome.storage.sync.get(['eagleEndpoint']);
      const eagleEndpoint = settings.eagleEndpoint || "http://localhost:41595/api/item/addFromURL";
      
      console.log("NightEagle EagleService: Using Eagle endpoint", eagleEndpoint);
  
      const memo = `Positive Prompt:\n${parameters.positivePrompt}\n\n` +
                   `Negative Prompt:\n${parameters.negativePrompt}\n\n` +
                   `Steps: ${parameters.steps}\n` +
                   `CFG: ${parameters.cfg}\n` +
                   `Seed: ${parameters.seed}\n` +
                   `Sampler: ${parameters.sampler}`;
  
      console.log("NightEagle EagleService: Sending request to Eagle");
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
  
      console.log("NightEagle EagleService: Received response from Eagle", response);
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
      }
  
      const result = await response.json();
      console.log('NightEagle EagleService: Image successfully sent to Eagle:', result);
      return result;
    }
  }