export class ImageDetector {
  constructor(debug) {
    this.debug = debug;
    this.processedImages = new Set();
    this.callbacks = [];
    this.debug.log("ImageDetector constructed");
  }

  onNewImage(callback) {
    this.callbacks.push(callback);
    if (!this.observer) {
      this.startObserving();
    }
  }

  startObserving() {
    this.debug.log("Starting image observation");
    const config = { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] };
    this.observer = new MutationObserver(this.checkForNewImages.bind(this));
    this.observer.observe(document.body, config);
  }

  checkForNewImages(mutations) {
    this.debug.log("Checking for new images");
    for (let mutation of mutations) {
      if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'src')) {
        const nodes = mutation.type === 'childList' ? mutation.addedNodes : [mutation.target];
        nodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && node.matches('img[src^="blob:"]') && !this.processedImages.has(node.src)) {
            this.debug.log("New image found", node.src);
            this.processedImages.add(node.src);
            this.callbacks.forEach(callback => callback(node));
          }
        });
      }
    }
  }
}