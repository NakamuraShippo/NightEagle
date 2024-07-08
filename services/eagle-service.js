// services/eagle-service.js

const EAGLE_API_ENDPOINT = 'http://localhost:41595';

export class EagleService {
  async sendImageToEagle(imageData, imageName, parameters, tags, folderId) {
    const memo = `Positive Prompt:\n${parameters.positivePrompt}\n\n` +
                  `Negative Prompt:\n${parameters.negativePrompt}\n\n` +
                  `Steps: ${parameters.steps}\n` +
                  `CFG: ${parameters.cfg}\n` +
                  `Seed: ${parameters.seed}\n` +
                  `Sampler: ${parameters.sampler}`;

    const requestBody = {
      url: imageData,
      name: imageName,
      website: "https://novelai.net/",
      annotation: memo,
      tags: tags,
      folderId: folderId
    };

    console.log("NightEagle: Sending image to Eagle", { imageName, folderId, tags });

    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch(`${EAGLE_API_ENDPOINT}/api/item/addFromURL`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("NightEagle: Eagle API response", result);
        return result;
      } catch (error) {
        console.error(`NightEagle: Error sending image to Eagle (attempt ${4 - retries}/3):`, error);
        retries--;
        if (retries === 0) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      }
    }
  }
}