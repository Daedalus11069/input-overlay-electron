const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const CONFIG_FILE = path.join(app.getPath("userData"), "overlay-config.json");

const DEFAULT_WINDOW_CONFIG = {
  label: "Overlay",
  overlays: {
    keyboard: {
      enabled: true,
      keys: [
        "tab",
        "Q",
        "W",
        "E",
        "R",
        "A",
        "S",
        "D",
        "F",
        "shift",
        "Z",
        "X",
        "C",
        "V",
        "ctrl",
        "space"
      ]
    },
    mouse: { enabled: true, buttons: ["left", "right"] }
  },
  window: {
    width: 630,
    height: 290,
    position: "bottom-right",
    customX: null,
    customY: null,
    margin: 30,
    opacity: 1.0
  },
  appearance: { theme: "default", showLabels: true, highlightColor: "#ffeb3b" },
  background: {
    enabled: false,
    color: "#000000",
    opacity: 0.5
  },
  preset: {
    presetFile: null,
    imageFile: null,
    autoDetectImage: true,
    pressedMode: "highlight",
    presetDimensions: null
  }
};

class ConfigManager {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
        if (!raw.windows) {
          return {
            windows: [{ id: randomUUID(), ...DEFAULT_WINDOW_CONFIG, ...raw }]
          };
        }
        return raw;
      }
    } catch (err) {
      console.error("Error loading config:", err);
    }
    return { windows: [{ id: randomUUID(), ...DEFAULT_WINDOW_CONFIG }] };
  }

  _save() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error("Error saving config:", err);
    }
  }

  getAllWindows() {
    return this.data.windows;
  }

  getWindowConfig(id) {
    const entry = this.data.windows.find(w => w.id === id);
    if (!entry) return null;
    return {
      ...DEFAULT_WINDOW_CONFIG,
      ...entry,
      overlays: { ...DEFAULT_WINDOW_CONFIG.overlays, ...entry.overlays },
      window: { ...DEFAULT_WINDOW_CONFIG.window, ...entry.window },
      appearance: { ...DEFAULT_WINDOW_CONFIG.appearance, ...entry.appearance },
      preset: { ...DEFAULT_WINDOW_CONFIG.preset, ...entry.preset }
    };
  }

  saveWindowConfig(id, config) {
    const idx = this.data.windows.findIndex(w => w.id === id);
    if (idx === -1) return false;
    this.data.windows[idx] = { id, ...config };
    this._save();
    return true;
  }

  createWindowConfig(label) {
    const id = randomUUID();
    this.data.windows.push({
      id,
      ...DEFAULT_WINDOW_CONFIG,
      label: label ?? "Overlay"
    });
    this._save();
    return id;
  }

  removeWindowConfig(id) {
    this.data.windows = this.data.windows.filter(w => w.id !== id);
    this._save();
  }
}

module.exports = ConfigManager;
