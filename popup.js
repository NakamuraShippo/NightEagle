document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const settingsForm = document.getElementById('settingsForm');
    const eagleEndpointInput = document.getElementById('eagleEndpoint');

    // Load saved settings
    chrome.storage.sync.get(['eagleEndpoint'], function(result) {
    eagleEndpointInput.value = result.eagleEndpoint || 'http://localhost:41595/api/item/addFromURL';
    });

    // Save settings
    settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        chrome.storage.sync.set({
            eagleEndpoint: eagleEndpointInput.value
        }, function() {
            alert('Settings saved!');
        });
    });

    // Check status
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "checkStatus"}, function(response) {
        if (chrome.runtime.lastError) {
        statusElement.textContent = "Not on NovelAI page";
        } else {
        statusElement.textContent = response.status;
        }
        });
    });
});