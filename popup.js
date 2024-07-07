document.addEventListener('DOMContentLoaded', function() {
    const settingsForm = document.getElementById('settingsForm');
    const eagleEndpointInput = document.getElementById('eagleEndpoint');
    const allTagsInput = document.getElementById('allTags');
  
    if (!settingsForm || !eagleEndpointInput || !allTagsInput) {
      console.error('NightEagle: Some elements not found in popup.html');
      return;
    }
  
    // Load saved settings
    chrome.storage.sync.get(['eagleEndpoint', 'allTags'], function(result) {
      if (eagleEndpointInput) {
        eagleEndpointInput.value = result.eagleEndpoint || 'http://localhost:41595/api/item/addFromURL';
      }
      if (allTagsInput) {
        allTagsInput.value = result.allTags || 'NovelAI, AI Generated';
      }
    });
  
    // Save settings
    settingsForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const allTags = allTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      chrome.storage.sync.set({
        eagleEndpoint: eagleEndpointInput.value,
        allTags: allTags.join(', ')
      }, function() {
        alert('Settings saved!');
      });
    });
  });