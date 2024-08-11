document.addEventListener('DOMContentLoaded', function() {
  const eagleFolderSelect = document.getElementById('eagleFolder');
  const allTagsTextarea = document.getElementById('allTags');
  const statusDiv = document.getElementById('status');
  const showDebugLogsButton = document.getElementById('showDebugLogs');

  // Load settings
  chrome.storage.sync.get(['eagleFolder', 'allTags'], function(result) {
    if (result.eagleFolder) {
      eagleFolderSelect.value = result.eagleFolder;
    }
    if (result.allTags) {
      allTagsTextarea.value = result.allTags;
    }
  });

  // Save settings
  function saveSettings() {
    chrome.storage.sync.set({
      eagleFolder: eagleFolderSelect.value,
      allTags: allTagsTextarea.value
    }, function() {
      showToast('Settings saved');
    });
  }

  eagleFolderSelect.addEventListener('change', saveSettings);
  allTagsTextarea.addEventListener('input', saveSettings);

  // Load Eagle folders
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

  // Show debug logs
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
});