// services/parameter-extractor.js
export class ParameterExtractor {
    constructor() {
      this.debugMode = true; // デバッグモードを有効にする
    }

    extractParameters() {
        const parameters = {
        positivePrompt: this.getPromptText('positive'),
        negativePrompt: this.getPromptText('negative'),
        steps: this.getSteps(),
        cfg: this.getCFG(),
        seed: this.getSeed(),
        sampler: this.getSampler()
    };

        this.debugLog('Extracted parameters:', parameters);
        return parameters;
    }

    getPromptText(type) {
        const selectors = type === 'positive' 
        ? [
            'textarea[placeholder="プロンプトを入力し、理想の画像を生成しましょう"]',
            'textarea[placeholder="Enter your prompt here"]',
            '.prompt-textarea'
            ]
        : [
            'textarea[placeholder="除外したい要素を入力してください"]',
            'textarea[placeholder="Enter symbols to exclude"]',
            '.negative-prompt-textarea'
        ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            this.debugLog(`Found ${type} prompt with selector: ${selector}`);
            return element.value;
        }
    }

        this.debugLog(`Failed to find ${type} prompt element`);
        return '';
    }

    getSteps() {
        const selectors = [
        '.sc-c87c6dcc-9.fUNIFR input[type="number"]',
        'input[placeholder="Steps"]',
        '.steps-input'
        ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            this.debugLog(`Found steps with selector: ${selector}`);
            return element.value;
        }
    }

        this.debugLog('Failed to find steps element');
        return 'N/A';
    }

    getCFG() {
        const selectors = [
        '.sc-c87c6dcc-9.fUNIFR input[type="number"]:nth-child(2)',
        'input[placeholder="CFG Scale"]',
        '.cfg-input'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            this.debugLog(`Found CFG with selector: ${selector}`);
            return element.value;
        }
    }

        this.debugLog('Failed to find CFG element');
        return 'N/A';
    }

    getSeed() {
      const selectors = [
        '.sc-d72450af-1.sc-b221f04b-15.kXFbYD.fPwlQS .sc-a2d0901c-54.hCPgld span span:first-child',
        '.seed-value',
        'button:contains("Seed")'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          this.debugLog(`Found seed with selector: ${selector}`);
          return element.textContent;
        }
      }

      // フォールバック: ページ内のテキストからシード値を探す
      const pageText = document.body.innerText;
      const seedMatch = pageText.match(/Seed:\s*(\d+)/);
      if (seedMatch) {
        this.debugLog('Found seed using regex');
        return seedMatch[1];
      }

      this.debugLog('Failed to find seed element');
      return 'N/A';
    }

    getSampler() {
      const selectors = [
        '.sc-a2d0901c-15.gfkdYu .css-4t5j3y-singleValue',
        'select[aria-label="Sampler"]',
        '.sampler-select'
    ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          this.debugLog(`Found sampler with selector: ${selector}`);
          return element.textContent || element.value;
        }
      }

      // フォールバック: ページ内のテキストからサンプラー名を探す
      const pageText = document.body.innerText;
      const samplerMatch = pageText.match(/Sampler:\s*(\w+)/);
      if (samplerMatch) {
        this.debugLog('Found sampler using regex');
        return samplerMatch[1];
      }

      this.debugLog('Failed to find sampler element');
      return 'N/A';
    }

    debugLog(...args) {
      if (this.debugMode) {
        console.log('ParameterExtractor:', ...args);
      }
    }
  }