const { contextBridge, ipcRenderer } = require("electron");

// This is the ONLY surface the renderer (your React app) can use to touch
// the filesystem. It cannot require('fs') or reach Node APIs directly —
// contextIsolation + no nodeIntegration block that. Every call here is
// scoped server-side (in main.js) to the data/ or exports/ folders only.
contextBridge.exposeInMainWorld("lifeos", {
  exists: (relPath) => ipcRenderer.invoke("fs:exists", relPath),
  readText: (relPath) => ipcRenderer.invoke("fs:readText", relPath),
  writeTextSafe: (relPath, content) => ipcRenderer.invoke("fs:writeTextSafe", relPath, content),
  readDir: (relPath) => ipcRenderer.invoke("fs:readDir", relPath),
  remove: (relPath) => ipcRenderer.invoke("fs:remove", relPath),
  writeExport: (relPath, content) => ipcRenderer.invoke("fs:writeExport", relPath, content),
  openPath: (pathOrRelPath) => ipcRenderer.invoke("shell:openPath", pathOrRelPath),
  pickFile: (extensions) => ipcRenderer.invoke("dialog:pickFile", extensions),
  pickImageAndCopyToAssets: (destRelPath) =>
    ipcRenderer.invoke("dialog:pickImageAndCopyToAssets", destRelPath),
  resolveAssetUrl: (relPath) => ipcRenderer.invoke("fs:resolveAssetUrl", relPath),
  readImageDataUrl: (relPath) => ipcRenderer.invoke("fs:readImageDataUrl", relPath),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  maximizeWindow: () => ipcRenderer.invoke("window:maximize"),
  restoreWindow: () => ipcRenderer.invoke("window:restore"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  restartApp: () => ipcRenderer.invoke("app:restart"),
  applyUiState: (state) => ipcRenderer.invoke("window:applyUiState", state),
});
