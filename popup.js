let debounceTimer;

function debounce(func, delay) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(func, delay);
}

function saveSettings() {
  const eagleFolder = document.getElementById('eagleFolder').value;
  const allTags = document.getElementById('allTags').value;

  chrome.storage.sync.set({
    eagleFolder: eagleFolder,
    allTags: allTags
  }, function() {
    console.log('Settings saved');
    document.getElementById('status').textContent = 'Settings saved';
    setTimeout(() => { document.getElementById('status').textContent = ''; }, 2000);
  });
}

function loadSettings() {
  chrome.storage.sync.get(['eagleFolder', 'allTags'], function(result) {
    document.getElementById('allTags').value = result.allTags || '';
    loadFolders(result.eagleFolder);
  });
}

function loadFolders(selectedFolderId) {
  console.log("Requesting folders from:", EAGLE_API_ENDPOINT);

  chrome.runtime.sendMessage({ action: "getFolders", eagleEndpoint: EAGLE_API_ENDPOINT }, response => {
    if (response.success) {
      console.log("Folder list response:", response.folders);
      const folderSelect = document.getElementById('eagleFolder');
      folderSelect.innerHTML = '';
      addFoldersToSelect(response.folders, folderSelect, selectedFolderId);
    } else {
      console.error('Error loading folders:', response.error);
      document.getElementById('status').textContent = 'Error loading folders: ' + response.error;
    }
  });
}

function addFoldersToSelect(folders, select, selectedFolderId) {
  const folderString = JSON.stringify(folders);
  let depth = 0;
  let currentDepth = 0;

  for (let i = 0; i < folderString.length; i++) {
    if (folderString[i] === '{') {
      depth++;
    } else if (folderString[i] === '}') {
      depth--;
    }

    if (folderString.substr(i, 7) === '"name":') {
      const nameStart = folderString.indexOf('"', i + 7) + 1;
      const nameEnd = folderString.indexOf('"', nameStart);
      const name = folderString.substring(nameStart, nameEnd);

      const idStart = folderString.lastIndexOf('"id":', i) + 6;
      const idEnd = folderString.indexOf(',', idStart);
      const id = folderString.substring(idStart, idEnd).replace(/"/g, '');

      const option = document.createElement('option');
      option.value = id;
      option.textContent = '-'.repeat(Math.max(0, depth - 1)) + ' ' + name;
      option.selected = id === selectedFolderId;
      select.appendChild(option);

      i = nameEnd;
    }
  }
}

function detectColorScheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
  } else {
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
  }
}

function listenForColorSchemeChanges() {
  window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
    detectColorScheme();
  });
}

document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  detectColorScheme();
  listenForColorSchemeChanges();

  document.getElementById('eagleFolder').addEventListener('change', saveSettings);
  document.getElementById('allTags').addEventListener('input', () => debounce(saveSettings, 500));
});

document.addEventListener('DOMContentLoaded', function() {
  loadSettings();

  document.getElementById('eagleFolder').addEventListener('change', saveSettings);
  document.getElementById('allTags').addEventListener('input', () => debounce(saveSettings, 500));
});

const EAGLE_API_ENDPOINT = 'http://localhost:41595';