console.log("NightEagle: Background script starting");

import { EagleService } from './services/eagle-service.js';
import { TaskManager } from './services/task-manager.js';

console.log("NightEagle: Modules imported in background");

const eagleService = new EagleService();
const taskManager = new TaskManager();

console.log("NightEagle: Background script initialized");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("NightEagle: Received message in background script", request);
  if (request.action === "startImageTransfer") {
    const taskId = taskManager.createTask();
    console.log(`NightEagle: Created new task ${taskId} for image transfer`);
    sendResponse({ taskId });
    handleImageTransfer(request.imageData, request.imageName, request.parameters, taskId, sender.tab.id);
    return true;
  } else if (request.action === "getTaskStatus") {
    const status = taskManager.getTaskStatus(request.taskId);
    console.log(`NightEagle: Task ${request.taskId} status:`, status);
    sendResponse(status);
    return true;
  }
});

async function handleImageTransfer(imageData, imageName, parameters, taskId, tabId) {
  console.log(`NightEagle: Starting image transfer for task ${taskId}`);
  try {
    taskManager.updateTaskStatus(taskId, 'fetching', 10);
    console.log(`NightEagle: Fetching blob for task ${taskId}`);
    const blob = await fetchBlob(imageData);

    taskManager.updateTaskStatus(taskId, 'converting', 30);
    console.log(`NightEagle: Converting blob to base64 for task ${taskId}`);
    const base64data = await blobToBase64(blob);

    taskManager.updateTaskStatus(taskId, 'sending', 50);
    console.log(`NightEagle: Sending image to Eagle for task ${taskId}`);
    
    // すべてのタグを取得
    const { allTags } = await chrome.storage.sync.get(['allTags']);
    const tags = allTags ? allTags.split(',').map(tag => tag.trim()) : ["NovelAI", "AI Generated"];
    
    await eagleService.sendImageToEagle(base64data, imageName, parameters, tags);

    taskManager.updateTaskStatus(taskId, 'completed', 100);
    console.log(`NightEagle: Image transfer completed for task ${taskId}`);
    chrome.tabs.sendMessage(tabId, { action: "transferComplete", taskId });
  } catch (error) {
    console.error(`NightEagle: Image transfer failed for task ${taskId}:`, error);
    taskManager.updateTaskStatus(taskId, 'error', 0, error.message);
    chrome.tabs.sendMessage(tabId, { action: "transferError", taskId, error: error.message });
  }
}

async function fetchBlob(imageData) {
  const response = await fetch(imageData);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.blob();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

console.log("NightEagle: Background script setup complete");