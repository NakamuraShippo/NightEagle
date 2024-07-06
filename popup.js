document.addEventListener('DOMContentLoaded', function() {
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
});