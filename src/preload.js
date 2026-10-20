'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sitego', {
  chooseFolder: () => ipcRenderer.invoke('sitego:choose-folder'),
  listSites: () => ipcRenderer.invoke('sitego:list-sites'),
  addSite: (site) => ipcRenderer.invoke('sitego:add-site', site),
  removeSite: (id) => ipcRenderer.invoke('sitego:remove-site', id),
  inspectSite: (id) => ipcRenderer.invoke('sitego:inspect-site', id),
  checkLiveUrl: (id) => ipcRenderer.invoke('sitego:check-live-url', id),
  publish: (request) => ipcRenderer.invoke('sitego:publish', request),
  openUrl: (url) => ipcRenderer.invoke('sitego:open-url', url),
});
