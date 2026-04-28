import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

ipcMain.handle('save-recording', async (_event, payload: { cameraLabel: string; buffer: Uint8Array }) => {
  const date = new Date();
  const dayFolder = date.toISOString().slice(0, 10);
  const saveBaseDir = path.join(app.getPath('videos'), 'WebCapturer', dayFolder);

  if (!existsSync(saveBaseDir)) {
    mkdirSync(saveBaseDir, { recursive: true });
  }

  const sanitizedLabel = payload.cameraLabel.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30) || 'camera';
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  const defaultPath = path.join(saveBaseDir, `${timestamp}_${sanitizedLabel}.webm`);

  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath,
    title: '保存摄像头录像',
    filters: [{ name: 'WebM Video', extensions: ['webm'] }]
  });

  if (canceled || !filePath) {
    return { ok: false, message: '用户取消保存' };
  }

  writeFileSync(filePath, Buffer.from(payload.buffer));
  return { ok: true, filePath };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
