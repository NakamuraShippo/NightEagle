const EAGLE_API_ENDPOINT = 'http://localhost:41595';
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
      addFoldersToSelect(response.folders, folderSelect, '', selectedFolderId);
    } else {
      console.error('Error loading folders:', response.error);
      document.getElementById('status').textContent = 'Error loading folders: ' + response.error;
    }
  });
}

function addFoldersToSelect(folders, select, prefix, selectedFolderId) {
  folders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = prefix + folder.name;
    option.selected = folder.id === selectedFolderId;
    select.appendChild(option);

    if (folder.children && folder.children.length > 0) {
      addFoldersToSelect(folder.children, select, prefix + '  ', selectedFolderId);
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  loadSettings();

  document.getElementById('eagleFolder').addEventListener('change', saveSettings);
  document.getElementById('allTags').addEventListener('input', () => debounce(saveSettings, 500));
});