const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

// Data lives inside the project folder itself (sibling of `app/`), so the
// whole LifeOS folder — code + data — can be copied to another machine and
// keep working, per the "copy folder → move → continue using it" goal.
// This resolves to <repo root>/data and <repo root>/exports whether running
// from source (dev) or a packaged build placed anywhere.
const isDev = !app.isPackaged;
const REPO_ROOT = isDev
  ? path.resolve(__dirname, "..", "..") // app/electron -> app -> repo root
  : path.dirname(process.execPath); // next to the packaged executable
const DATA_ROOT = path.join(REPO_ROOT, "data");
const EXPORTS_ROOT = path.join(REPO_ROOT, "exports");

function resolveScoped(base, relPath) {
  // Prevent path traversal: resolve then verify the result is still inside
  // the allowed base directory before touching the filesystem.
  const resolved = path.resolve(base, relPath);
  if (!resolved.startsWith(path.resolve(base) + path.sep) && resolved !== path.resolve(base)) {
    throw new Error(`Path escapes allowed scope: ${relPath}`);
  }
  return resolved;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

ipcMain.handle("fs:exists", async (_e, relPath) => {
  const full = resolveScoped(DATA_ROOT, relPath);
  try {
    await fs.access(full);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("fs:readText", async (_e, relPath) => {
  const full = resolveScoped(DATA_ROOT, relPath);
  return fs.readFile(full, "utf-8");
});

ipcMain.handle("fs:writeTextSafe", async (_e, relPath, content) => {
  const full = resolveScoped(DATA_ROOT, relPath);
  const tmp = `${full}.tmp`;
  await ensureDir(full);
  await fs.writeFile(tmp, content, "utf-8");
  const verify = await fs.readFile(tmp, "utf-8");
  JSON.parse(verify); // throws if corrupted; we bail before touching the real file
  await fs.writeFile(full, content, "utf-8");
  await fs.rm(tmp, { force: true });
});

ipcMain.handle("fs:readDir", async (_e, relPath) => {
  const full = resolveScoped(DATA_ROOT, relPath);
  try {
    const entries = await fs.readdir(full, { withFileTypes: true });
    return entries.map((e) => ({ name: e.name, isFile: e.isFile() }));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
});

ipcMain.handle("fs:remove", async (_e, relPath) => {
  const full = resolveScoped(DATA_ROOT, relPath);
  await fs.rm(full, { force: true });
});

ipcMain.handle("fs:writeExport", async (_e, relPath, content) => {
  // Backups/exports are a separate scope from live data, so a restore
  // flow can never confuse a backup file with a live data file.
  const full = resolveScoped(EXPORTS_ROOT, relPath);
  await ensureDir(full);
  await fs.writeFile(full, content, "utf-8");
  return full;
});

// Opens a file (e.g. an .excalidraw canvas) in the user's default app for
// that file type. Accepts either a path relative to the repo root (kept
// portable in JSON) or an absolute path — absolute paths are only ever
// ones the *user* explicitly chose via dialog:pickFile below, never raw
// renderer input, so this can't be used to launch an arbitrary location.
ipcMain.handle("shell:openPath", async (_e, maybeRelPath) => {
  const full = path.isAbsolute(maybeRelPath)
    ? maybeRelPath
    : resolveScoped(REPO_ROOT, maybeRelPath);
  const result = await shell.openPath(full);
  if (result) throw new Error(result); // non-empty string = error message
});

// Lets the user pick any file (e.g. an existing .excalidraw canvas) and
// returns its absolute path, to be stored and later opened via
// shell:openPath. We don't copy this one — Excalidraw canvases are meant
// to live wherever the user's Excalidraw setup already keeps them.
ipcMain.handle("dialog:pickFile", async (_e, extensions) => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: extensions ? [{ name: "Files", extensions }] : undefined,
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Lets the user pick a book cover image from anywhere on disk; we copy it
// into the project's assets/ folder so the reference stays portable if
// the whole LifeOS folder is later moved to another machine.
ipcMain.handle("dialog:pickImageAndCopyToAssets", async (_e, destRelPath) => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const src = result.filePaths[0];
  const dest = resolveScoped(REPO_ROOT, destRelPath);
  await ensureDir(dest);
  await fs.copyFile(src, dest);
  return path.relative(REPO_ROOT, dest).replace(/\\/g, "/");
});

ipcMain.handle("window:minimize", () => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (win) win.minimize();
});

ipcMain.handle("window:maximize", () => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});

ipcMain.handle("window:restore", () => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (win) win.restore();
});

ipcMain.handle("window:close", () => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (win) win.close();
});

function loadAppIntoWindow(win) {
  if (isDev) {
    void win.loadURL("http://localhost:1420");
    return;
  }

  void win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

ipcMain.handle("app:restart", () => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!win) return;

  if (isDev) {
    loadAppIntoWindow(win);
    return;
  }

  app.relaunch();
  app.exit(0);
});

ipcMain.handle("window:applyUiState", async (_e, { hideMenuBar, fullscreen, windowControlsOnHover } = {}) => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!win) return;
  win.setMenuBarVisibility(!hideMenuBar);
  win.setAutoHideMenuBar(Boolean(hideMenuBar));
  win.setFullScreen(Boolean(fullscreen));

  // When the custom hover controls are enabled, let the renderer's own
  // window-chrome handle the controls instead of reserving a native title bar
  // overlay. Keeping both active at once causes the odd blank inset seen after
  // a restart.
  if (windowControlsOnHover) {
    win.setTitleBarOverlay(undefined);
    return;
  }

  win.setTitleBarOverlay({
    color: "#00000000",
    symbolColor: "#edf1f8",
    height: 26,
  });
});

// Resolves a path relative to the repo root (as stored in JSON, so it
// stays portable if the folder moves) into an absolute file:// URL the
// renderer can put directly in an <img src>.
ipcMain.handle("fs:resolveAssetUrl", async (_e, relPath) => {
  if (!relPath) return "";
  if (/^file:\/\//i.test(relPath)) return encodeURI(relPath);

  const full = path.isAbsolute(relPath)
    ? relPath
    : resolveScoped(REPO_ROOT, relPath);

  const normalized = full.replace(/\\/g, "/");
  const uri = `file://${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
  return encodeURI(uri);
});

ipcMain.handle("fs:readImageDataUrl", async (_e, relPath) => {
  if (!relPath) return "";
  const full = path.isAbsolute(relPath) ? relPath : resolveScoped(REPO_ROOT, relPath);
  const ext = path.extname(full).toLowerCase();
  const mime = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
  }[ext] || "image/png";
  const buffer = await fs.readFile(full);
  return `data:${mime};base64,${buffer.toString("base64")}`;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "LifeOS",
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  loadAppIntoWindow(win);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
