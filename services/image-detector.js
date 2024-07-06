// services/image-detector.js
export class ImageDetector {
    constructor() {
      this.processedImages = new Set();
      this.callbacks = [];
      console.log("NightEagle: ImageDetector constructed");
    }
  
    onNewImage(callback) {
      this.callbacks.push(callback);
      if (!this.observer) {
        this.startObserving();
      }
    }
  
    startObserving() {
      console.log("NightEagle: Starting image observation");
      const config = { childList: true, subtree: true, attributes: true };
      this.observer = new MutationObserver(this.checkForNewImages.bind(this));
      this.observer.observe(document.body, config);
    }
  
    checkForNewImages(mutations) {
      console.log("NightEagle: Checking for new images");
      for (let mutation of mutations) {
        if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'src')) {
          const nodes = mutation.type === 'childList' ? mutation.addedNodes : [mutation.target];
          nodes.forEach(node => {
            if (node.nodeName === 'IMG' && node.src.startsWith('blob:') && !this.processedImages.has(node.src)) {
              console.log("NightEagle: New image found", node.src);
              this.processedImages.add(node.src);
              this.callbacks.forEach(callback => callback(node));
            }
          });
        }
      }
    }
  }