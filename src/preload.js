const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  onKeydown: callback => ipcRenderer.on("keydown", callback),
  onKeyup: callback => ipcRenderer.on("keyup", callback),
  onMousedown: callback => ipcRenderer.on("mousedown", callback),
  onMouseup: callback => ipcRenderer.on("mouseup", callback),
  onWheel: callback => ipcRenderer.on("wheel", callback),

  // Settings API
  openSettings: () => ipcRenderer.send("open-settings"),
  setIgnoreMouseEvents: (ignore, options) =>
    ipcRenderer.send("set-ignore-mouse-events", ignore, options),
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: config => ipcRenderer.invoke("save-config", config),
  onConfigUpdate: callback => ipcRenderer.on("config-updated", callback),

  // Preset / file APIs
  readFile: filePath => ipcRenderer.invoke("read-file", filePath),
  openFileDialog: options => ipcRenderer.invoke("open-file-dialog", options),
  resolvePresetImage: jsonPath =>
    ipcRenderer.invoke("resolve-preset-image", jsonPath),

  // Remove listeners
  removeListener: (channel, callback) =>
    ipcRenderer.removeListener(channel, callback)
});
