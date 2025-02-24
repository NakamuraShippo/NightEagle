document.addEventListener('DOMContentLoaded', function() {
  // ===== 設定タブ用要素 =====
  const eagleFolderSelect = document.getElementById('eagleFolder');
  // 従来の localFolderInput は廃止し、以下の新要素を使用
  const chooseLocalFolderBtn = document.getElementById('chooseLocalFolderBtn');
  const localFolderPicker = document.getElementById('localFolderPicker');
  const localFolderNameSpan = document.getElementById('localFolderName');
  
  const allTagsTextarea = document.getElementById('allTags');
  const transferTargetSelect = document.getElementById('transferTarget');
  const statusDiv = document.getElementById('status');
  
  const settingsTabBtn = document.getElementById('settingsTabBtn');
  const promptManagerTabBtn = document.getElementById('promptManagerTabBtn');
  const settingsTab = document.getElementById('settingsTab');
  const promptManagerTab = document.getElementById('promptManagerTab');
  
  const showDebugLogsButton = document.getElementById('showDebugLogs');
  
  // ===== Prompt Manager用サブタブ要素 =====
  const positiveTabBtn = document.getElementById('positiveTabBtn');
  const negativeTabBtn = document.getElementById('negativeTabBtn');
  const positiveTabContent = document.getElementById('positiveTab');
  const negativeTabContent = document.getElementById('negativeTab');
  const positivePromptListDiv = document.getElementById('positivePromptList');
  const negativePromptListDiv = document.getElementById('negativePromptList');
  
  // ===== Prompt Manager用その他の要素 =====
  const addPromptBtn = document.getElementById('addPromptBtn');
  const exportPromptsBtn = document.getElementById('exportPromptsBtn');
  const importPromptsBtn = document.getElementById('importPromptsBtn');
  const importPromptsInput = document.getElementById('importPromptsInput');
  const savePromptsBtn = document.getElementById('savePromptsBtn');
  
  // ===== 設定の読み込み・保存 =====
  chrome.storage.sync.get(['eagleFolder', 'localFolder', 'allTags', 'transferTarget'], function(result) {
    if (result.eagleFolder) {
      eagleFolderSelect.value = result.eagleFolder;
    }
    if (result.localFolder) {
      localFolderNameSpan.textContent = result.localFolder;
    }
    if (result.allTags) {
      allTagsTextarea.value = result.allTags;
    }
    if (result.transferTarget) {
      transferTargetSelect.value = result.transferTarget;
    }
  });
  
  function saveSettings() {
    chrome.storage.sync.set({
      eagleFolder: eagleFolderSelect.value,
      // localFolder はファイル選択時に保存するのでここでは更新不要
      allTags: allTagsTextarea.value,
      transferTarget: transferTargetSelect.value
    }, function() {
      showToast('Settings saved');
    });
  }
  
  eagleFolderSelect.addEventListener('change', saveSettings);
  allTagsTextarea.addEventListener('input', saveSettings);
  transferTargetSelect.addEventListener('change', saveSettings);
  
  // ----- LocalFolder (エクスプローラーでフォルダー選択) -----
  chooseLocalFolderBtn.addEventListener('click', () => {
    localFolderPicker.click();
  });
  
  localFolderPicker.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      // files[0].webkitRelativePath は "FolderName/filename.ext" の形式なので、最初のディレクトリ名を抽出
      const relativePath = files[0].webkitRelativePath;
      const folderName = relativePath.split('/')[0];
      localFolderNameSpan.textContent = folderName;
      chrome.storage.sync.set({ localFolder: folderName }, () => {
        showToast('Local folder selected: ' + folderName);
      });
    }
  });
  
  // ----- Eagleフォルダー一覧の取得 -----
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
  
  // 再帰呼び出し時は、最初だけ innerHTML をクリアする
  function populateFolderSelect(folders, prefix = '') {
    if (prefix === '') {
      eagleFolderSelect.innerHTML = "";
    }
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
  
  showDebugLogsButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "getDebugLogs"}, function(response) {
      console.log("Debug Logs:", response.logs);
      console.log("Error Logs:", response.errors);
      showToast('Debug logs printed to console');
    });
  });
  
  // ===== メインタブの切り替え =====
  settingsTabBtn.addEventListener('click', () => {
    settingsTab.classList.add('active');
    promptManagerTab.classList.remove('active');
  });
  promptManagerTabBtn.addEventListener('click', () => {
    promptManagerTab.classList.add('active');
    settingsTab.classList.remove('active');
    loadPrompts(); // プロンプトレコードを読み込む
  });
  
  // ===== Prompt Manager =====
  let promptRecords = []; // 各レコードは { date, time, positive, negative } の形式
  const storageKey = 'promptYaml';
  
  // サブタブの切り替え
  positiveTabBtn.addEventListener('click', () => {
    positiveTabBtn.classList.add('active');
    negativeTabBtn.classList.remove('active');
    positiveTabContent.classList.add('active');
    negativeTabContent.classList.remove('active');
    renderPromptLists();
  });
  negativeTabBtn.addEventListener('click', () => {
    negativeTabBtn.classList.add('active');
    positiveTabBtn.classList.remove('active');
    negativeTabContent.classList.add('active');
    positiveTabContent.classList.remove('active');
    renderPromptLists();
  });
  
  function loadPrompts() {
    chrome.storage.local.get([storageKey], (result) => {
      const yamlStr = result[storageKey] || "";
      promptRecords = parseYaml(yamlStr);
      renderPromptLists();
    });
  }
  
  function savePrompts() {
    const yamlStr = convertRecordsToYaml(promptRecords);
    chrome.storage.local.set({[storageKey]: yamlStr}, () => {
      showToast('Prompts saved');
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
  
  // 自動登録時に重複登録を防ぐ関数（positive と negative を個別に処理）
  function addPromptRecord(newRecord) {
    let added = false;
    let lastPositive = "";
    let lastNegative = "";
    if (promptRecords.length > 0) {
      for (let i = promptRecords.length - 1; i >= 0; i--) {
        if (promptRecords[i].positive && promptRecords[i].positive.trim() !== "") {
          lastPositive = promptRecords[i].positive;
          break;
        }
      }
      for (let i = promptRecords.length - 1; i >= 0; i--) {
        if (promptRecords[i].negative && promptRecords[i].negative.trim() !== "") {
          lastNegative = promptRecords[i].negative;
          break;
        }
      }
    }
    if (newRecord.positive && newRecord.positive.trim() !== "" && newRecord.positive !== lastPositive) {
      promptRecords.push({
        date: newRecord.date,
        time: newRecord.time,
        positive: newRecord.positive,
        negative: ""
      });
      added = true;
    }
    if (newRecord.negative && newRecord.negative.trim() !== "" && newRecord.negative !== lastNegative) {
      promptRecords.push({
        date: newRecord.date,
        time: newRecord.time,
        positive: "",
        negative: newRecord.negative
      });
      added = true;
    }
    if (added) {
      savePrompts();
      renderPromptLists();
    } else {
      showToast("Duplicate prompt, not added");
    }
  }
  
  // ユーザーが直接編集できるインタラクティブなプロンプト編集領域作成
  // 各セグメントはカンマ区切りに分割され、＋／－ボタンで括弧の増減が可能
  // さらに "Add Tag" ボタンで新規セグメントを追加できる
  function createInteractivePrompt(text, updateCallback) {
    const container = document.createElement('div');
    container.style.border = "1px solid #ddd";
    container.style.padding = "5px";
    container.style.minHeight = "30px";
    
    if (text === "") {
      container.appendChild(createSegment("", container, updateCallback));
    } else {
      const parts = text.split(/(,)/);
      parts.forEach(part => {
        if (part === ",") {
          const commaSpan = document.createElement('span');
          commaSpan.textContent = part;
          container.appendChild(commaSpan);
        } else if (part !== "") {
          container.appendChild(createSegment(part, container, updateCallback));
        }
      });
    }
    
    // "Add Tag" ボタン
    const addTagBtn = document.createElement('button');
    addTagBtn.textContent = "Add Tag";
    addTagBtn.addEventListener('click', () => {
      if (container.childNodes.length > 0) {
        const commaSpan = document.createElement('span');
        commaSpan.textContent = ",";
        container.insertBefore(commaSpan, addTagBtn);
      }
      container.insertBefore(createSegment("", container, updateCallback), addTagBtn);
      updateCallback(getContainerText(container));
    });
    container.appendChild(addTagBtn);
    
    container.addEventListener('input', () => {
      updateCallback(getContainerText(container));
    });
    
    function getContainerText(container) {
      let parts = [];
      container.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains("prompt-segment")) {
          const textSpan = child.querySelector('.segment-text');
          parts.push(textSpan ? textSpan.textContent : "");
        }
      });
      return parts.join(",");
    }
    
    return container;
  }
  
  // 各セグメント生成の共通関数
  function createSegment(text, container, updateCallback) {
    const segment = document.createElement('span');
    segment.className = "prompt-segment";
    
    const textSpan = document.createElement('span');
    textSpan.className = "segment-text";
    textSpan.textContent = text;
    textSpan.contentEditable = "true";
    textSpan.style.outline = "none";
    
    const controls = document.createElement('span');
    controls.className = "segment-controls";
    
    const plusBtn = document.createElement('button');
    plusBtn.textContent = "+";
    plusBtn.addEventListener('click', () => {
      textSpan.textContent = "(" + textSpan.textContent + ")";
      updateCallback(getContainerText(container));
    });
    
    const minusBtn = document.createElement('button');
    minusBtn.textContent = "-";
    minusBtn.addEventListener('click', () => {
      let currentText = textSpan.textContent;
      if (currentText.startsWith("(") && currentText.endsWith(")")) {
        textSpan.textContent = currentText.substring(1, currentText.length - 1);
        updateCallback(getContainerText(container));
      }
    });
    
    controls.appendChild(plusBtn);
    controls.appendChild(minusBtn);
    
    segment.appendChild(textSpan);
    segment.appendChild(controls);
    
    return segment;
    
    function getContainerText(container) {
      let parts = [];
      container.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains("prompt-segment")) {
          const textSpan = child.querySelector('.segment-text');
          parts.push(textSpan ? textSpan.textContent : "");
        }
      });
      return parts.join(",");
    }
  }
  
  // サブタブにプロンプトレコードをレンダリングする関数
  function renderPromptLists() {
    positivePromptListDiv.innerHTML = "";
    negativePromptListDiv.innerHTML = "";
    
    promptRecords.forEach((record, index) => {
      // --- ポジティブプロンプト用レコード ---
      const posRecordDiv = document.createElement('div');
      posRecordDiv.style.border = "1px solid #ccc";
      posRecordDiv.style.padding = "5px";
      posRecordDiv.style.marginBottom = "5px";
      
      const header = document.createElement('div');
      header.textContent = `Date: ${record.date} Time: ${record.time}`;
      posRecordDiv.appendChild(header);
      
      const copyBtn = document.createElement('button');
      copyBtn.textContent = "Copy to NovelAI";
      copyBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs.length) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "pastePrompt",
              promptType: "positive",
              promptText: record.positive
            });
          }
        });
      });
      posRecordDiv.appendChild(copyBtn);
      
      const posInteractive = createInteractivePrompt(record.positive, (newText) => {
        record.positive = newText;
      });
      posRecordDiv.appendChild(posInteractive);
      
      positivePromptListDiv.appendChild(posRecordDiv);
      
      // --- ネガティブプロンプト用レコード ---
      const negRecordDiv = document.createElement('div');
      negRecordDiv.style.border = "1px solid #ccc";
      negRecordDiv.style.padding = "5px";
      negRecordDiv.style.marginBottom = "5px";
      
      const negHeader = document.createElement('div');
      negHeader.textContent = `Date: ${record.date} Time: ${record.time}`;
      negRecordDiv.appendChild(negHeader);
      
      const copyNegBtn = document.createElement('button');
      copyNegBtn.textContent = "Copy to NovelAI";
      copyNegBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs.length) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "pastePrompt",
              promptType: "negative",
              promptText: record.negative
            });
          }
        });
      });
      negRecordDiv.appendChild(copyNegBtn);
      
      const negInteractive = createInteractivePrompt(record.negative, (newText) => {
        record.negative = newText;
      });
      negRecordDiv.appendChild(negInteractive);
      
      negativePromptListDiv.appendChild(negRecordDiv);
    });
  }
  
  // NovelAI の入力欄へ貼り付け要求（content.js 側で promptType を利用して貼り付け処理を実装する）
  function pastePromptToNovelAI(promptText) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if(tabs.length) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "pastePrompt",
          promptText: promptText
        });
      }
    });
  }
  
  // 新規プロンプトレコード追加（自動登録時の重複防止処理付き）
  function addPromptRecord(newRecord) {
    let added = false;
    let lastPositive = "";
    let lastNegative = "";
    if (promptRecords.length > 0) {
      for (let i = promptRecords.length - 1; i >= 0; i--) {
        if (promptRecords[i].positive && promptRecords[i].positive.trim() !== "") {
          lastPositive = promptRecords[i].positive;
          break;
        }
      }
      for (let i = promptRecords.length - 1; i >= 0; i--) {
        if (promptRecords[i].negative && promptRecords[i].negative.trim() !== "") {
          lastNegative = promptRecords[i].negative;
          break;
        }
      }
    }
    if (newRecord.positive && newRecord.positive.trim() !== "" && newRecord.positive !== lastPositive) {
      promptRecords.push({
        date: newRecord.date,
        time: newRecord.time,
        positive: newRecord.positive,
        negative: ""
      });
      added = true;
    }
    if (newRecord.negative && newRecord.negative.trim() !== "" && newRecord.negative !== lastNegative) {
      promptRecords.push({
        date: newRecord.date,
        time: newRecord.time,
        positive: "",
        negative: newRecord.negative
      });
      added = true;
    }
    if (added) {
      savePrompts();
      renderPromptLists();
    } else {
      showToast("Duplicate prompt, not added");
    }
  }
  
  // 手動で新規レコードを追加する場合（ユーザー操作）
  addPromptBtn.addEventListener('click', () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const newRecord = { date: dateStr, time: timeStr, positive: "", negative: "" };
    addPromptRecord(newRecord);
  });
  
  exportPromptsBtn.addEventListener('click', () => {
    const yamlStr = convertRecordsToYaml(promptRecords);
    const blob = new Blob([yamlStr], {type: 'text/yaml'});
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({url: url, filename: 'prompt.yaml'});
  });
  
  importPromptsBtn.addEventListener('click', () => {
    importPromptsInput.click();
  });
  
  importPromptsInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      promptRecords = parseYaml(content);
      renderPromptLists();
      savePrompts();
    };
    reader.readAsText(file);
  });
  
  savePromptsBtn.addEventListener('click', () => {
    savePrompts();
  });
  
  function showToast(message) {
    statusDiv.textContent = message;
    statusDiv.style.opacity = '1';
    setTimeout(() => {
      statusDiv.style.opacity = '0';
    }, 2000);
  }
});
