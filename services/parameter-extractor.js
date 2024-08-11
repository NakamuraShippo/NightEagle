export class ParameterExtractor {
  constructor(debug, config) {
    this.debug = debug;
    this.config = config;
  }

  extractParameters() {
    return {
      positivePrompt: this.getPromptText('positive'),
      negativePrompt: this.getPromptText('negative'),
      steps: this.getNumericValue('steps'),
      cfg: this.getNumericValue('cfg'),
      seed: this.getSeed(),
      sampler: this.getSampler()
    };

    this.debug.log('Extracted parameters:', parameters);
    return parameters;
  }

  getPromptText(type) {
    const selector = this.config.selectors[type === 'positive' ? 'positivePrompt' : 'negativePrompt'];
    const element = document.querySelector(selector);
    if (element) {
      this.debug.log(`Found ${type} prompt with selector: ${selector}`);
      return element.value;
    }
    this.debug.log(`Failed to find ${type} prompt element`);
    return '';
  }

  getNumericValue(param) {
    const element = document.querySelector(this.config.selectors[param]);
    if (element) {
      this.debug.log(`Found ${param} with selector: ${this.config.selectors[param]}`);
      return element.value;
    }
    this.debug.log(`Failed to find ${param} element`);
    return this.config.defaultValues[param];
  }

  getSeed() {
    const element = document.querySelector(this.config.selectors.seed);
    if (element) {
      this.debug.log(`Found seed with selector: ${this.config.selectors.seed}`);
      return element.textContent;
    }
    // フォールバック: ページ内のテキストからシード値を探す
    const pageText = document.body.innerText;
    const seedMatch = pageText.match(/Seed:\s*(\d+)/);
    if (seedMatch) {
      this.debug.log('Found seed using regex');
      return seedMatch[1];
    }
    this.debug.log('Failed to find seed element');
    return this.config.defaultValues.seed;
  }

  getSampler() {
    const element = document.querySelector(this.config.selectors.sampler);
    if (element) {
      this.debug.log(`Found sampler with selector: ${this.config.selectors.sampler}`);
      return element.textContent || element.value;
    }
    // フォールバック: ページ内のテキストからサンプラー名を探す
    const pageText = document.body.innerText;
    const samplerMatch = pageText.match(/Sampler:\s*(\w+)/);
    if (samplerMatch) {
      this.debug.log('Found sampler using regex');
      return samplerMatch[1];
    }
    this.debug.log('Failed to find sampler element');
    return this.config.defaultValues.sampler;
  }
}