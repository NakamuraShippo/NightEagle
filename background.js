// background.js

import { EagleService } from './services/eagle-service.js';
import { TaskManager } from './services/task-manager.js';

const eagleService = new EagleService();
const taskManager = new TaskManager();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("NightEagle: Received message in background", request);

  if (request.action === "startImageTransfer") {
    const taskId = taskManager.createTask();
    sendResponse({ taskId });
    handleImageTransfer(request.imageData, request.imageName, request.parameters, taskId, sender.tab.id);
    return true;
  } else if (request.action === "getTaskStatus") {
    const status = taskManager.getTaskStatus(request.taskId);
    sendResponse(status);
    return true;
  } else if (request.action === "getFolders") {
    fetchFolders(request.eagleEndpoint)
      .then(folders => sendResponse({ success: true, folders: folders }))
      .catch(error => {
        console.error("NightEagle: Error fetching folders:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function handleImageTransfer(imageData, imageName, parameters, taskId, tabId) {
  try {
    console.log(`NightEagle: Starting image transfer for task ${taskId}`);
    taskManager.updateTaskStatus(taskId, 'fetching', 10);
    const blob = await fetchBlob(imageData);

    taskManager.updateTaskStatus(taskId, 'converting', 30);
    const base64data = await blobToBase64(blob);

    taskManager.updateTaskStatus(taskId, 'sending', 50);

    const settings = await chrome.storage.sync.get(['eagleFolder', 'allTags']);
    const tags = settings.allTags ? settings.allTags.split(',').map(tag => tag.trim()) : ["NovelAI", "AI Generated"];

    await eagleService.sendImageToEagle(
      base64data,
      imageName,
      parameters,
      tags,
      settings.eagleFolder
    );

    taskManager.updateTaskStatus(taskId, 'completed', 100);
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

async function fetchFolders(eagleEndpoint) {
  try {
    const response = await fetch(`${eagleEndpoint}/api/folder/list`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error("Failed to load folders: " + (result.message || "Unknown error"));
    }
    return result.data;
  } catch (error) {
    console.error("NightEagle: Fetch error:", error);
    throw error;
  }
}

console.log("NightEagle: Background script loaded");