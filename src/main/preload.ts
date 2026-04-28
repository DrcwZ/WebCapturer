import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveRecording: (cameraLabel: string, arrayBuffer: ArrayBuffer) => {
    const buffer = new Uint8Array(arrayBuffer);
    return ipcRenderer.invoke('save-recording', { cameraLabel, buffer });
  }
});
