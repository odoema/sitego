'use strict';

const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createStore } = require('./store');
const { inspectRepository, commitAndPush, waitForDeployment, checkLiveUrl } = require('./git');

if (process.platform === 'win32') app.setAppUserModelId('com.sitego.desktop');

let mainWindow;
let store;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 700,
    backgroundColor: '#f7f8f7',
    title: 'SiteGo',
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

function safeUrl(value) {
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { throw new Error('Enter a valid HTTPS live URL.'); }
  if (url.protocol !== 'https:') throw new Error('SiteGo only accepts HTTPS live URLs.');
  return url.toString();
}

function requiredText(value, field, max = 100) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${field} is required.`);
  if (text.length > max) throw new Error(`${field} must be ${max} characters or fewer.`);
  return text;
}

async function sites() {
  return (await store.read()).sites;
}

function registerIpc() {
  ipcMain.handle('sitego:choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('sitego:list-sites', () => sites());

  ipcMain.handle('sitego:add-site', async (_event, input) => {
    const folder = await fs.realpath(requiredText(input.folder, 'Folder', 4096));
    const repo = await inspectRepository(folder);
    const name = requiredText(input.name, 'Site name');
    const list = await sites();
    if (list.some((site) => site.folder.toLowerCase() === folder.toLowerCase())) throw new Error('That folder is already connected to SiteGo.');
    const record = {
      id: crypto.randomUUID(),
      name,
      folder,
      repository: repo.repository || 'GitHub repository not detected',
      branch: repo.branch || '(detached HEAD)',
      liveUrl: safeUrl(input.liveUrl),
      addedAt: new Date().toISOString(),
    };
    list.push(record);
    await store.write({ sites: list });
    return record;
  });

  ipcMain.handle('sitego:remove-site', async (_event, id) => {
    const list = await sites();
    await store.write({ sites: list.filter((site) => site.id !== id) });
    return true;
  });

  ipcMain.handle('sitego:inspect-site', async (_event, id) => {
    const site = (await sites()).find((item) => item.id === id);
    if (!site) throw new Error('That site is no longer in SiteGo.');
    const status = await inspectRepository(site.folder);
    return { site, ...status };
  });

  ipcMain.handle('sitego:check-live-url', async (_event, id) => {
    const site = (await sites()).find((item) => item.id === id);
    if (!site) throw new Error('That site is no longer in SiteGo.');
    return checkLiveUrl(site.liveUrl);
  });

  ipcMain.handle('sitego:publish', async (_event, request) => {
    const site = (await sites()).find((item) => item.id === request.id);
    if (!site) throw new Error('That site is no longer in SiteGo.');
    const selected = [...new Set((request.paths || []).map((item) => String(item)))];
    if (!selected.length) throw new Error('Select at least one changed file to publish.');
    const note = requiredText(request.note || `Publish ${site.name}`, 'Publish note', 120);
    const result = await commitAndPush({ ...site, expectedHead: request.expectedHead }, selected, note);
    const deployment = await waitForDeployment(result.repository, result.sha, site.liveUrl);
    return { ...result, ...deployment };
  });

  ipcMain.handle('sitego:open-url', async (_event, value) => {
    const url = safeUrl(value);
    await shell.openExternal(url);
    return true;
  });
}

app.whenReady().then(() => {
  store = createStore(path.join(app.getPath('userData'), 'sitego-sites.json'));
  registerIpc();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
