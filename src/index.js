const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  Menu,
  Tray,
  dialog
} = require("electron");
const path = require("path");
const fs = require("fs");
const { uIOhook } = require("uiohook-napi");
const ConfigManager = require("./config.js");

if (require("electron-squirrel-startup")) {
  app.quit();
}

app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");

const configManager = new ConfigManager();

// windowId -> BrowserWindow (overlay windows)
const overlayWindows = new Map();
// windowId -> BrowserWindow (settings windows)
const settingsWindows = new Map();
// webContentsId -> windowId  (routes IPC from both window types to the right config)
const senderToWindowId = new Map();

let tray = null;

// ============================================================
// Window position helpers
// ============================================================

function calculateWindowPosition(config) {
  const { width, height, margin, position, customX, customY } = config.window;

  if (position === "custom" && customX != null && customY != null) {
    return { x: customX, y: customY };
  }

  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  switch (position) {
    case "top-left":
      return { x: margin, y: margin };
    case "top-right":
      return { x: sw - width - margin, y: margin };
    case "bottom-left":
      return { x: margin, y: sh - height - margin };
    case "bottom-right":
    default:
      return { x: sw - width - margin, y: sh - height - margin };
  }
}

// ============================================================
// Overlay window factory
// ============================================================

function createOverlayWindow(windowId) {
  const config = configManager.getWindowConfig(windowId);
  const { x, y } = calculateWindowPosition(config);

  const win = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    },
    x,
    y
  });

  // win.setAlwaysOnTop(true, "screen-saver");
  // win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, "index.html"));

  const wcId = win.webContents.id;
  overlayWindows.set(windowId, win);
  senderToWindowId.set(wcId, windowId);

  // Right-click context menu on the overlay
  win.webContents.on("context-menu", () => {
    Menu.buildFromTemplate([
      { label: "Settings", click: () => openSettingsWindow(windowId) },
      { type: "separator" },
      {
        label: win.isMenuBarVisible() ? "Hide Menu Bar" : "Show Menu Bar",
        click: () => {
          win.setMenuBarVisibility(!win.isMenuBarVisible());
        }
      },
      { type: "separator" },
      {
        label: "Remove Overlay",
        click: () => {
          win.close();
          configManager.removeWindowConfig(windowId);
          rebuildTrayMenu();
        }
      },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() }
    ]).popup({ window: win });
  });

  // Persist drag position
  win.on("moved", () => {
    const [nx, ny] = win.getPosition();
    const cfg = configManager.getWindowConfig(windowId);
    cfg.window.position = "custom";
    cfg.window.customX = nx;
    cfg.window.customY = ny;
    configManager.saveWindowConfig(windowId, cfg);
    // Keep settings window in sync if open
    const settingsWin = settingsWindows.get(windowId);
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.webContents.send("config-updated", cfg);
    }
  });

  // Persist resize
  win.on("resized", () => {
    const [nw, nh] = win.getSize();
    const cfg = configManager.getWindowConfig(windowId);
    cfg.window.width = nw;
    cfg.window.height = nh;
    configManager.saveWindowConfig(windowId, cfg);
    // Keep settings window in sync if open
    const settingsWin = settingsWindows.get(windowId);
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.webContents.send("config-updated", cfg);
    }
  });

  win.on("closed", () => {
    overlayWindows.delete(windowId);
    senderToWindowId.delete(wcId);
    rebuildTrayMenu();
  });

  return win;
}

// ============================================================
// Settings window menu
// ============================================================

// Return the windowId mapped to whichever settings window currently has focus.
function focusedWindowId() {
  const focused = BrowserWindow.getFocusedWindow();
  return focused
    ? (senderToWindowId.get(focused.webContents.id) ?? null)
    : null;
}

function buildSettingsMenu() {
  return [
    {
      label: "File",
      submenu: [
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            const windowId = focusedWindowId();
            if (windowId) openSettingsWindow(windowId);
          }
        },
        { type: "separator" },
        {
          label: "New Overlay",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            const id = configManager.createWindowConfig();
            createOverlayWindow(id);
            openSettingsWindow(id);
            rebuildTrayMenu();
          }
        },
        {
          label: "Duplicate Overlay",
          accelerator: "CmdOrCtrl+D",
          click: () => {
            const windowId = focusedWindowId();
            if (!windowId) return;
            const src = configManager.getWindowConfig(windowId);
            const newLabel = (src.label ?? "Overlay") + " Copy";
            const id = configManager.createWindowConfig(newLabel);
            const { id: _id, ...rest } = src;
            configManager.saveWindowConfig(id, { ...rest, label: newLabel });
            createOverlayWindow(id);
            openSettingsWindow(id);
            rebuildTrayMenu();
          }
        },
        { type: "separator" },
        {
          label: "Export Configuration\u2026",
          accelerator: "CmdOrCtrl+E",
          click: async () => {
            const win = BrowserWindow.getFocusedWindow();
            const windowId = focusedWindowId();
            if (!win || !windowId) return;
            const config = configManager.getWindowConfig(windowId);
            const result = await dialog.showSaveDialog(win, {
              title: "Export Configuration",
              defaultPath:
                (config.label ?? "overlay").replace(/[/\\?%*:|"<>]/g, "-") +
                ".json",
              filters: [{ name: "JSON Configuration", extensions: ["json"] }]
            });
            if (!result.canceled && result.filePath) {
              fs.writeFileSync(
                result.filePath,
                JSON.stringify(config, null, 2)
              );
            }
          }
        },
        {
          label: "Import Configuration\u2026",
          accelerator: "CmdOrCtrl+I",
          click: async () => {
            const win = BrowserWindow.getFocusedWindow();
            const windowId = focusedWindowId();
            if (!win || !windowId) return;
            const result = await dialog.showOpenDialog(win, {
              title: "Import Configuration",
              filters: [{ name: "JSON Configuration", extensions: ["json"] }],
              properties: ["openFile"]
            });
            if (result.canceled || !result.filePaths.length) return;
            try {
              const raw = JSON.parse(
                fs.readFileSync(result.filePaths[0], "utf-8")
              );
              // Strip keys that belong only to the config file itself
              const { id: _id, windows: _windows, ...importedConfig } = raw;
              configManager.saveWindowConfig(windowId, importedConfig);
              const newConfig = configManager.getWindowConfig(windowId);
              const overlayWin = overlayWindows.get(windowId);
              if (overlayWin && !overlayWin.isDestroyed()) {
                overlayWin.webContents.send("config-updated", newConfig);
              }
              // Refresh settings page to reflect imported values
              win.webContents.reload();
              rebuildTrayMenu();
            } catch (err) {
              dialog.showErrorBox("Import Failed", err.message);
            }
          }
        },
        { type: "separator" },
        {
          label: "Delete Overlay",
          click: () => {
            const windowId = focusedWindowId();
            if (!windowId) return;
            const win = BrowserWindow.getFocusedWindow();
            const overlayWin = overlayWindows.get(windowId);
            configManager.removeWindowConfig(windowId);
            overlayWin?.close();
            win?.close();
            rebuildTrayMenu();
          }
        },
        { type: "separator" },
        {
          label: "Close Window",
          accelerator: "CmdOrCtrl+W",
          click: () => BrowserWindow.getFocusedWindow()?.close()
        },
        {
          label: "Quit",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit()
        }
      ]
    }
  ];
}

// ============================================================
// Settings window factory
// ============================================================

function openSettingsWindow(windowId) {
  if (settingsWindows.has(windowId)) {
    settingsWindows.get(windowId).focus();
    return;
  }

  const label = configManager.getWindowConfig(windowId)?.label ?? "Overlay";
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
    resizable: true,
    icon: path.join(__dirname, "icon.ico"),
    title: "Settings - " + label
  });

  win.loadFile(path.join(__dirname, "settings.html"));

  const wcId = win.webContents.id;
  settingsWindows.set(windowId, win);
  senderToWindowId.set(wcId, windowId);

  win.on("closed", () => {
    settingsWindows.delete(windowId);
    senderToWindowId.delete(wcId);
  });
}

// ============================================================
// Tray
// ============================================================

function buildTrayMenuTemplate() {
  const windowEntries = configManager.getAllWindows().flatMap(w => [
    {
      label: (w.label || "Overlay") + " – Settings",
      click: () => openSettingsWindow(w.id)
    },
    {
      label: (w.label || "Overlay") + " – Delete",
      click: () => {
        overlayWindows.get(w.id)?.close();
        settingsWindows.get(w.id)?.close();
        configManager.removeWindowConfig(w.id);
        rebuildTrayMenu();
      }
    },
    { type: "separator" }
  ]);

  return [
    ...windowEntries,
    { type: "separator" },
    {
      label: "Add Overlay",
      click: () => {
        const id = configManager.createWindowConfig();
        createOverlayWindow(id);
        rebuildTrayMenu();
      }
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() }
  ];
}

function rebuildTrayMenu() {
  if (tray)
    tray.setContextMenu(Menu.buildFromTemplate(buildTrayMenuTemplate()));
}

function createTray() {
  tray = new Tray(path.join(__dirname, "icon.ico"));
  tray.setToolTip("Input Overlay");
  rebuildTrayMenu();
  tray.on("double-click", () => {
    const first = configManager.getAllWindows()[0];
    if (first) openSettingsWindow(first.id);
  });
}

// ============================================================
// IPC handlers
// ============================================================

ipcMain.handle("get-config", event => {
  const windowId = senderToWindowId.get(event.sender.id);
  return configManager.getWindowConfig(windowId);
});

ipcMain.handle("save-config", (event, config) => {
  const windowId = senderToWindowId.get(event.sender.id);
  if (!windowId) return false;

  // Snapshot window bounds before saving so we can detect explicit changes
  const oldConfig = configManager.getWindowConfig(windowId);
  const success = configManager.saveWindowConfig(windowId, config);
  if (!success) return false;

  const newConfig = configManager.getWindowConfig(windowId);
  const overlayWin = overlayWindows.get(windowId);

  if (overlayWin && !overlayWin.isDestroyed()) {
    // Only reposition/resize when window or preset dimension settings actually changed
    const oldW =
      oldConfig.preset?.presetDimensions?.width ?? oldConfig.window.width;
    const oldH =
      oldConfig.preset?.presetDimensions?.height ?? oldConfig.window.height;
    const oldPos = calculateWindowPosition(oldConfig);

    const newW =
      newConfig.preset?.presetDimensions?.width ?? newConfig.window.width;
    const newH =
      newConfig.preset?.presetDimensions?.height ?? newConfig.window.height;
    const newPos = calculateWindowPosition(newConfig);

    if (
      oldW !== newW ||
      oldH !== newH ||
      oldPos.x !== newPos.x ||
      oldPos.y !== newPos.y
    ) {
      overlayWin.setBounds({
        x: newPos.x,
        y: newPos.y,
        width: newW,
        height: newH
      });
    }

    if (oldConfig.window.opacity !== newConfig.window.opacity) {
      overlayWin.setOpacity(newConfig.window.opacity);
    }

    overlayWin.webContents.send("config-updated", newConfig);
  }

  const settingsWin = settingsWindows.get(windowId);
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.setTitle("Settings \u2013 " + (newConfig.label ?? "Overlay"));
  }

  rebuildTrayMenu();
  return true;
});

ipcMain.on("open-settings", event => {
  const windowId = senderToWindowId.get(event.sender.id);
  if (windowId) openSettingsWindow(windowId);
});

// ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
//   const windowId = senderToWindowId.get(event.sender.id);
//   const win = overlayWindows.get(windowId);
//   if (win && !win.isDestroyed()) {
//     win.setIgnoreMouseEvents(ignore, options ?? {});
//   }
// });

const ALLOWED_FILE_EXTS = new Set([
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".bmp",
  ".gif",
  ".webp"
]);
ipcMain.handle("read-file", (event, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_FILE_EXTS.has(ext))
    throw new Error("File type not allowed: " + ext);
  if (ext === ".json") return fs.readFileSync(filePath, "utf-8");
  const mimeMap = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".bmp": "image/bmp",
    ".gif": "image/gif",
    ".webp": "image/webp"
  };
  const data = fs.readFileSync(filePath);
  return "data:" + mimeMap[ext] + ";base64," + data.toString("base64");
});

ipcMain.handle("open-file-dialog", async (event, options) => {
  const windowId = senderToWindowId.get(event.sender.id);
  const win = settingsWindows.get(windowId) ?? overlayWindows.get(windowId);
  return await dialog.showOpenDialog(win, options);
});

ipcMain.handle("resolve-preset-image", (event, jsonPath) => {
  const base = jsonPath.replace(/\.json$/i, "");
  for (const ext of [".png", ".jpg", ".jpeg", ".bmp", ".webp"]) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
});

// ============================================================
// Input hooks � broadcast to all overlay windows
// ============================================================

function setupInputHooks() {
  const broadcast = (channel, data) => {
    for (const win of overlayWindows.values()) {
      if (!win.isDestroyed()) win.webContents.send(channel, data);
    }
  };

  uIOhook.on("keydown", e => broadcast("keydown", e.keycode));
  uIOhook.on("keyup", e => broadcast("keyup", e.keycode));
  uIOhook.on("mousedown", e => broadcast("mousedown", e.button));
  uIOhook.on("mouseup", e => broadcast("mouseup", e.button));
  uIOhook.on("wheel", e =>
    broadcast("wheel", { direction: e.direction, rotation: e.rotation })
  );

  uIOhook.start();
}

// ============================================================
// App lifecycle
// ============================================================

app.on("ready", () => {
  // Single application menu shared by all settings windows;
  // click handlers use BrowserWindow.getFocusedWindow() to detect the active one.
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildSettingsMenu()));

  const all = configManager.getAllWindows();
  if (all.length === 0) {
    const id = configManager.createWindowConfig();
    createOverlayWindow(id);
  } else {
    all.forEach(w => createOverlayWindow(w.id));
  }
  createTray();
  setupInputHooks();
});

// Close the app when all windows are closed, even on macOS. The tray icon will still be available to open new windows.
app.on("window-all-closed", _e => {
  app.quit();
});

app.on("activate", () => {
  if (overlayWindows.size === 0) {
    const all = configManager.getAllWindows();
    if (all.length) createOverlayWindow(all[0].id);
  }
});

app.on("before-quit", () => {
  try {
    uIOhook.stop();
  } catch (e) {
    console.error("Error stopping uIOhook:", e);
  }
});
