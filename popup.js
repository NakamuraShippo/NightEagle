document.addEventListener('DOMContentLoaded', function() {
  const eagleFolderSelect = document.getElementById('eagleFolder');
  const localFolderInput = document.getElementById('localFolder');
  const allTagsTextarea = document.getElementById('allTags');
  const transferTargetSelect = document.getElementById('transferTarget');
  const statusDiv = document.getElementById('status');
  const showDebugLogsButton = document.getElementById('showDebugLogs');
  
  const settingsTab = document.getElementById('settingsTab');
  const promptManagerTab = document.getElementById('promptManagerTab');
  const settingsTabBtn = document.getElementById('settingsTabBtn');
  const promptManagerTabBtn = document.getElementById('promptManagerTabBtn');
  
  const promptListDiv = document.getElementById('promptList');
  const addPromptBtn = document.getElementById('addPromptBtn');
  const savePromptsBtn = document.getElementById('savePromptsBtn');

  // タブ切替
  settingsTabBtn.addEventListener('click', () => {
    settingsTab.classList.add('active');
    promptManagerTab.classList.remove('active');
  });
  promptManagerTabBtn.addEventListener('click', () => {
    promptManagerTab.classList.add('active');
    settingsTab.classList.remove('active');
    loadPromptRecords();
  });
  
  // 設定の読み込み
  chrome.storage.sync.get(['eagleFolder', 'localFolder', 'allTags', 'transferTarget'], function(result) {
    if (result.eagleFolder) {
      eagleFolderSelect.value = result.eagleFolder;
    }
    if (result.localFolder) {
      localFolderInput.value = result.localFolder;
    }
    if (result.allTags) {
      allTagsTextarea.value = result.allTags;
    }
    if (result.transferTarget) {
      transferTargetSelect.value = result.transferTarget;
    }
  });

  // 設定の保存
  function saveSettings() {
    chrome.storage.sync.set({
      eagleFolder: eagleFolderSelect.value,
      localFolder: localFolderInput.value,
      allTags: allTagsTextarea.value,
      transferTarget: transferTargetSelect.value
    }, function() {
      showToast('Settings saved');
    });
  }

  eagleFolderSelect.addEventListener('change', saveSettings);
  localFolderInput.addEventListener('input', saveSettings);
  allTagsTextarea.addEventListener('input', saveSettings);
  transferTargetSelect.addEventListener('change', saveSettings);

  // Eagle フォルダ一覧の読み込み（従来通り）
  function loadEagleFolders() {
    fetch('http://localhost:41595/api/folder/list')
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          populateFolderSelect(data.data);
        } else {
          showToast('Failed to load Eagle folders');
        }
      })
      .catch(error => {
        showToast('Error loading Eagle folders');
        console.error('Error:', error);
      });
  }

  function populateFolderSelect(folders, prefix = '') {
    folders.forEach(folder => {
      const option = document.createElement('option');
      option.value = folder.id;
      option.textContent = prefix + folder.name;
      eagleFolderSelect.appendChild(option);

      if (folder.children && folder.children.length > 0) {
        populateFolderSelect(folder.children, prefix + '- ');
      }
    });
  }

  loadEagleFolders();

  // デバッグログ表示
  showDebugLogsButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "getDebugLogs"}, function(response) {
      console.log("Debug Logs:", response.logs);
      console.log("Error Logs:", response.errors);
      showToast('Debug logs printed to console');
    });
  });

  function showToast(message) {
    statusDiv.textContent = message;
    statusDiv.style.opacity = '1';
    setTimeout(() => {
      statusDiv.style.opacity = '0';
    }, 2000);
  }
  
  // --- Prompt Manager の処理 ---
  function loadPromptRecords() {
    chrome.storage.local.get(['promptYaml'], function(result) {
      let yamlStr = result.promptYaml || "";
      let records = parseYaml(yamlStr);
      renderPromptRecords(records);
    });
  }
  
  function parseYaml(yamlStr) {
    const lines = yamlStr.split('\n');
    const records = [];
    let current = null;
    lines.forEach(line => {
      if (line.startsWith('-')) {
        if (current) records.push(current);
        current = {};
      } else if (current && line.trim()) {
        const parts = line.trim().split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          let value = parts.slice(1).join(':').trim();
          value = value.replace(/^"|"$/g, '');
          current[key] = value;
        }
      }
    });
    if (current) records.push(current);
    return records;
  }
  
  function convertRecordsToYaml(records) {
    let yaml = "";
    records.forEach(record => {
      yaml += `- date: ${record.date}\n  time: ${record.time}\n  positive: "${record.positive.replace(/"/g, '\\"')}"\n  negative: "${record.negative.replace(/"/g, '\\"')}"\n`;
    });
    return yaml;
  }
  
  function renderPromptRecords(records) {
    promptListDiv.innerHTML = "";
    records.forEach((record, index) => {
      const recordDiv = document.createElement('div');
      recordDiv.style.border = "1px solid #ccc";
      recordDiv.style.padding = "5px";
      recordDiv.style.marginBottom = "5px";
      
      // Positive prompt（インタラクティブセグメント）
      const posLabel = document.createElement('div');
      posLabel.textContent = "Positive Prompt:";
      recordDiv.appendChild(posLabel);
      const posContent = createInteractivePrompt(record.positive, (newText) => {
        record.positive = newText;
      });
      recordDiv.appendChild(posContent);
      
      // Negative prompt（インタラクティブセグメント）
      const negLabel = document.createElement('div');
      negLabel.textContent = "Negative Prompt:";
      recordDiv.appendChild(negLabel);
      const negContent = createInteractivePrompt(record.negative, (newText) => {
        record.negative = newText;
      });
      recordDiv.appendChild(negContent);
      
      promptListDiv.appendChild(recordDiv);
    });
  }
  
  function createInteractivePrompt(text, updateCallback) {
    const container = document.createElement('div');
    container.style.border = "1px solid #ddd";
    container.style.padding = "5px";
    container.style.minHeight = "30px";
    
    // カンマで分割（カンマ自体も保持）
    const parts = text.split(/(,)/);
    parts.forEach(part => {
      if (part === ",") {
        const commaSpan = document.createElement('span');
        commaSpan.textContent = part;
        container.appendChild(commaSpan);
      } else if (part.trim() !== "") {
        // セグメント全体用のコンテナ
        const segment = document.createElement('span');
        segment.className = "prompt-segment";
        
        // 実際のテキスト表示用の要素
        const textSpan = document.createElement('span');
        textSpan.className = "segment-text";
        textSpan.textContent = part;
        
        // コントロール用の要素（+、-ボタン）
        const controls = document.createElement('span');
        controls.className = "segment-controls";
        
        const plusBtn = document.createElement('button');
        plusBtn.textContent = "+";
        plusBtn.addEventListener('click', () => {
          // 現在のテキスト部分に括弧を追加する
          textSpan.textContent = "(" + textSpan.textContent + ")";
          updateCallback(getContainerText(container));
        });
        
        const minusBtn = document.createElement('button');
        minusBtn.textContent = "-";
        minusBtn.addEventListener('click', () => {
          let currentText = textSpan.textContent;
          // 文字列が括弧で囲まれている場合、先頭と末尾の括弧を削除する
          if (currentText.startsWith("(") && currentText.endsWith(")")) {
            textSpan.textContent = currentText.substring(1, currentText.length - 1);
            updateCallback(getContainerText(container));
          }
        });
        
        controls.appendChild(plusBtn);
        controls.appendChild(minusBtn);
        
        // セグメントコンテナにテキスト部分とコントロール部分を追加
        segment.appendChild(textSpan);
        segment.appendChild(controls);
        
        container.appendChild(segment);
      } else {
        const emptySpan = document.createElement('span');
        emptySpan.textContent = part;
        container.appendChild(emptySpan);
      }
    });
    
    // container 内の実際のテキストを取得する補助関数
    function getContainerText(container) {
      let text = "";
      container.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.classList.contains("prompt-segment")) {
            // セグメント内のテキスト部分のみ取得
            const textSpan = child.querySelector('.segment-text');
            text += textSpan ? textSpan.textContent : child.textContent;
          } else {
            text += child.textContent;
          }
        }
      });
      return text;
    }
    
    return container;
  }
  
  addPromptBtn.addEventListener('click', () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const newRecord = {
      date: dateStr,
      time: timeStr,
      positive: "",
      negative: ""
    };
    chrome.storage.local.get(['promptYaml'], function(result) {
      let records = parseYaml(result.promptYaml || "");
      records.push(newRecord);
      renderPromptRecords(records);
      const yamlStr = convertRecordsToYaml(records);
      chrome.storage.local.set({ promptYaml: yamlStr });
    });
  });
  
  savePromptsBtn.addEventListener('click', () => {
    // ※必要に応じ、ここで UI 上の内容を再収集して保存処理を追加してください
    chrome.storage.local.get(['promptYaml'], function(result) {
      showToast('Prompts saved');
    });
  });
});
