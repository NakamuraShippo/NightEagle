class EagleService {
  constructor(debug) {
    this.debug = debug;
  }

  async sendImageToEagle(imageData, imageName, parameters, tags, folderId) {
    this.debug.log("Sending image to Eagle", { imageName, folderId, tags });

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

    try {
      const response = await fetch("http://localhost:41595/api/item/addFromURL", {
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
      this.debug.log("Eagle API response", result);
      return result;
    } catch (error) {
      this.debug.error("Error sending image to Eagle", error);
      throw error;
    }
  }
}

self.EagleService = EagleService;