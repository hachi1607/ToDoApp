const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Navigation
  navigateToPlanner: () => ipcRenderer.send('navigate-to-planner'),
  
  // Authentication
  login: () => ipcRenderer.send('login'),
  
  // Todo operations
  saveDriveTodos: (todos) => ipcRenderer.send('save-drive-todos', todos),
  loadDriveTodos: () => ipcRenderer.send('load-drive-todos'),
  
  // Event listeners
  onSaveStatus: (callback) => ipcRenderer.on('save-status', callback),
  onNotification: (callback) => ipcRenderer.on('notification', callback),
  onAuthenticationStatus: (callback) => ipcRenderer.on('authentication-status', callback),
  onLoadDriveTodos: (callback) => ipcRenderer.on('load-drive-todos', callback),
  
  // Remove listeners
  removeSaveStatusListener: () => ipcRenderer.removeAllListeners('save-status'),
  removeNotificationListener: () => ipcRenderer.removeAllListeners('notification'),
  removeAuthenticationStatusListener: () => ipcRenderer.removeAllListeners('authentication-status'),
  removeLoadDriveTodosListener: () => ipcRenderer.removeAllListeners('load-drive-todos'),
});