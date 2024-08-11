console.log("Background script starting");

importScripts('debugger.js');
importScripts('services/eagle-service.js');
importScripts('services/task-manager.js');
importScripts('services/image-transfer-service.js');
importScripts('services/config-manager.js');

const debug = new NightEagleDebugger();
const configManager = new ConfigManager(debug);
const eagleService = new EagleService(debug);
const taskManager = new TaskManager(debug);
const imageTransferService = new ImageTransferService(debug, eagleService, taskManager);

debug.log("Background script initialized");

chrome.runtime.onInstalled.addListener(() => {
  debug.log("Extension installed");
  configManager.loadConfig();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debug.log("Message received in background script", request);
  
  if (request.action === "startImageTransfer") {
    debug.startTimer("imageTransfer");
    const taskId = taskManager.createTask();
    sendResponse({ taskId });
    imageTransferService.handleImageTransfer(request.imageData, request.imageName, request.parameters, taskId, sender.tab.id)
      .then(() => {
        debug.log(`Image transfer completed for task ${taskId}`);
        // タブが存在する場合のみメッセージを送信
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, { action: "transferComplete", taskId })
            .catch(error => debug.error(`Error sending transferComplete message: ${error}`));
        }
      })
      .catch((error) => {
        debug.error(`Image transfer failed for task ${taskId}`, error);
        // タブが存在する場合のみメッセージを送信
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, { action: "transferError", taskId, error: error.message })
            .catch(error => debug.error(`Error sending transferError message: ${error}`));
        }
      });
    return true;
  } else if (request.action === "getTaskStatus") {
    const status = taskManager.getTaskStatus(request.taskId);
    sendResponse(status);
    return true;
  } else if (request.action === "getDebugLogs") {
    sendResponse({ logs: debug.getLogs(), errors: debug.getErrors() });
    return true;
  }
});

function keepAlive() {
  setInterval(() => {
    debug.log("Service Worker keepalive ping");
  }, 20000);
}

keepAlive();

chrome.runtime.onConnect.addListener(function(port) {
  if (port.name === "checkStatus") {
    port.onMessage.addListener(function(msg) {
      debug.log("Received message from content script", msg);
      port.postMessage({status: "Service Worker is active"});
    });
  }
});

debug.log("Background script fully loaded");