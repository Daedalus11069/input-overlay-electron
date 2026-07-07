// Available keys for selection
const AVAILABLE_KEYS = [
  "tab",
  "Q",
  "W",
  "E",
  "R",
  "T",
  "Y",
  "U",
  "I",
  "O",
  "P",
  "A",
  "S",
  "D",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "Z",
  "X",
  "C",
  "V",
  "B",
  "N",
  "M",
  "shift",
  "ctrl",
  "alt",
  "space",
  "1",
  "2",
  "3",
  "4",
  "5"
];

let currentConfig = null;
let presetMeta = null; // { elementCount, overlayWidth, overlayHeight }

// Load configuration
async function loadConfig() {
  currentConfig = await window.electronAPI.getConfig();
  applyConfigToUI();
}

// Apply config to UI elements
function applyConfigToUI() {
  if (!currentConfig) return;

  // Overlay label
  document.getElementById("overlayLabel").value =
    currentConfig.label ?? "Overlay";

  // Overlay toggles
  document.getElementById("keyboardEnabled").checked =
    currentConfig.overlays.keyboard.enabled;
  document.getElementById("mouseEnabled").checked =
    currentConfig.overlays.mouse.enabled;

  // Window settings
  document.getElementById("windowWidth").value = currentConfig.window.width;
  document.getElementById("windowHeight").value = currentConfig.window.height;
  document.getElementById("windowX").value = currentConfig.window.customX ?? "";
  document.getElementById("windowY").value = currentConfig.window.customY ?? "";
  document.getElementById("windowPosition").value =
    currentConfig.window.position;
  document.getElementById("windowMargin").value = currentConfig.window.margin;
  document.getElementById("windowOpacity").value = currentConfig.window.opacity;

  // Appearance
  document.getElementById("showLabels").checked =
    currentConfig.appearance.showLabels;

  // Background
  document.getElementById("bgEnabled").checked =
    currentConfig.background?.enabled ?? false;
  document.getElementById("bgColor").value =
    currentConfig.background?.color ?? "#000000";
  document.getElementById("bgOpacity").value =
    currentConfig.background?.opacity ?? 0.5;

  // Preset settings
  const presetFile = currentConfig.preset?.presetFile || null;
  const imageFile = currentConfig.preset?.imageFile || null;

  document.getElementById("presetFilePath").textContent = presetFile
    ? shortenPath(presetFile)
    : "No preset selected";
  document.getElementById("clearPresetBtn").style.display = presetFile
    ? "inline-block"
    : "none";

  document.getElementById("imageFilePath").textContent = imageFile
    ? shortenPath(imageFile)
    : "Auto-detect from preset";
  document.getElementById("clearImageBtn").style.display = imageFile
    ? "inline-block"
    : "none";

  document.getElementById("pressedMode").value =
    currentConfig.preset?.pressedMode || "highlight";

  // Show preset info badge
  const hasPreset = !!presetFile;
  if (hasPreset && presetMeta) {
    document.getElementById("presetInfoRow").style.display = "flex";
    document.getElementById("presetInfoText").textContent =
      `${presetMeta.elementCount} elements \u2022 ${presetMeta.overlayWidth}\u00d7${presetMeta.overlayHeight} px`;
  } else {
    document.getElementById("presetInfoRow").style.display = "none";
  }

  // Render key selector
  renderKeySelector();
}

// Render key selector
function renderKeySelector() {
  const container = document.getElementById("keySelector");
  container.innerHTML = "";

  AVAILABLE_KEYS.forEach(key => {
    const button = document.createElement("div");
    button.className = "key-option";
    button.textContent = key.toUpperCase();

    if (currentConfig.overlays.keyboard.keys.includes(key)) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      button.classList.toggle("selected");
      updateConfig();
    });

    container.appendChild(button);
  });
}

// Collect config from UI
function collectConfig() {
  const selectedKeys = Array.from(
    document.querySelectorAll(".key-option.selected")
  ).map(el => {
    const text = el.textContent.toLowerCase();
    return AVAILABLE_KEYS.find(k => k.toLowerCase() === text) || text;
  });

  return {
    label: document.getElementById("overlayLabel").value.trim() || "Overlay",
    overlays: {
      keyboard: {
        enabled: document.getElementById("keyboardEnabled").checked,
        keys: selectedKeys
      },
      mouse: {
        enabled: document.getElementById("mouseEnabled").checked,
        buttons: currentConfig.overlays.mouse.buttons
      }
    },
    window: {
      width: parseInt(document.getElementById("windowWidth").value),
      height: parseInt(document.getElementById("windowHeight").value),
      position: currentConfig.window.position,
      customX:
        document.getElementById("windowX").value !== ""
          ? parseInt(document.getElementById("windowX").value)
          : currentConfig.window.customX,
      customY:
        document.getElementById("windowY").value !== ""
          ? parseInt(document.getElementById("windowY").value)
          : currentConfig.window.customY,
      margin: parseInt(document.getElementById("windowMargin").value),
      opacity: parseFloat(document.getElementById("windowOpacity").value)
    },
    appearance: {
      theme: currentConfig.appearance.theme,
      showLabels: document.getElementById("showLabels").checked,
      highlightColor: currentConfig.appearance.highlightColor
    },
    background: {
      enabled: document.getElementById("bgEnabled").checked,
      color: document.getElementById("bgColor").value,
      opacity: parseFloat(document.getElementById("bgOpacity").value)
    },
    preset: {
      presetFile: currentConfig.preset?.presetFile || null,
      imageFile: currentConfig.preset?.imageFile || null,
      autoDetectImage: currentConfig.preset?.autoDetectImage !== false,
      pressedMode: document.getElementById("pressedMode").value,
      presetDimensions: currentConfig.preset?.presetDimensions || null
    }
  };
}

// Update config and save
async function updateConfig() {
  const newConfig = collectConfig();
  await window.electronAPI.saveConfig(newConfig);
  currentConfig = newConfig;
}

// Event listeners
document
  .getElementById("overlayLabel")
  .addEventListener("change", updateConfig);
document
  .getElementById("keyboardEnabled")
  .addEventListener("change", updateConfig);
document
  .getElementById("mouseEnabled")
  .addEventListener("change", updateConfig);
document.getElementById("windowWidth").addEventListener("change", updateConfig);
document
  .getElementById("windowHeight")
  .addEventListener("change", updateConfig);
document
  .getElementById("windowPosition")
  .addEventListener("change", updateConfig);
document
  .getElementById("windowMargin")
  .addEventListener("change", updateConfig);
document
  .getElementById("windowOpacity")
  .addEventListener("change", updateConfig);

// Snap button: apply the selected corner position immediately
document
  .getElementById("applyPositionBtn")
  .addEventListener("click", async () => {
    const pos = document.getElementById("windowPosition").value;
    currentConfig = {
      ...currentConfig,
      window: {
        ...currentConfig.window,
        position: pos,
        customX: null,
        customY: null
      }
    };
    await window.electronAPI.saveConfig(currentConfig);
    applyConfigToUI();
  });
document.getElementById("showLabels").addEventListener("change", updateConfig);
document.getElementById("bgEnabled").addEventListener("change", updateConfig);
document.getElementById("bgColor").addEventListener("input", updateConfig);
document.getElementById("bgOpacity").addEventListener("change", updateConfig);

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (confirm("Reset all settings to defaults?")) {
    await window.electronAPI.saveConfig({
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
        mouse: {
          enabled: true,
          buttons: ["left", "right"]
        }
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
      appearance: {
        theme: "default",
        showLabels: true,
        highlightColor: "#ffffff"
      }
    });
    await loadConfig();
  }
});

document.getElementById("saveBtn").addEventListener("click", () => {
  window.close();
});

// ============================================================
// Preset helpers
// ============================================================

function shortenPath(p) {
  // Show the last two path segments so the file name is always visible
  const parts = p.replace(/\\/g, "/").split("/");
  return parts.length > 2 ? "\u2026/" + parts.slice(-2).join("/") : p;
}

async function selectPresetFile() {
  const result = await window.electronAPI.openFileDialog({
    title: "Select Preset File",
    filters: [{ name: "Input Overlay Preset", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (result.canceled || !result.filePaths.length) return;

  const presetFile = result.filePaths[0];
  try {
    const jsonText = await window.electronAPI.readFile(presetFile);
    const preset = JSON.parse(jsonText);

    presetMeta = {
      elementCount: preset.elements?.length || 0,
      overlayWidth: preset.overlay_width,
      overlayHeight: preset.overlay_height
    };

    const autoImage = await window.electronAPI.resolvePresetImage(presetFile);

    currentConfig = {
      ...currentConfig,
      preset: {
        presetFile,
        imageFile: autoImage || currentConfig.preset?.imageFile || null,
        autoDetectImage: true,
        pressedMode: document.getElementById("pressedMode").value,
        presetDimensions: {
          width: preset.overlay_width,
          height: preset.overlay_height
        }
      }
    };

    await window.electronAPI.saveConfig(currentConfig);
    applyConfigToUI();
  } catch (err) {
    alert(`Failed to load preset:\n${err.message}`);
  }
}

async function clearPreset() {
  presetMeta = null;
  currentConfig = {
    ...currentConfig,
    preset: {
      presetFile: null,
      imageFile: null,
      autoDetectImage: true,
      pressedMode: "highlight",
      presetDimensions: null
    }
  };
  await window.electronAPI.saveConfig(currentConfig);
  applyConfigToUI();
}

async function selectImageFile() {
  const result = await window.electronAPI.openFileDialog({
    title: "Select Sprite Sheet Image",
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "bmp", "webp"] }
    ],
    properties: ["openFile"]
  });
  if (result.canceled || !result.filePaths.length) return;

  currentConfig = {
    ...currentConfig,
    preset: {
      ...currentConfig.preset,
      imageFile: result.filePaths[0],
      autoDetectImage: false
    }
  };
  await window.electronAPI.saveConfig(currentConfig);
  applyConfigToUI();
}

async function clearImageOverride() {
  currentConfig = {
    ...currentConfig,
    preset: { ...currentConfig.preset, imageFile: null, autoDetectImage: true }
  };
  await window.electronAPI.saveConfig(currentConfig);
  applyConfigToUI();
}

document
  .getElementById("selectPresetBtn")
  .addEventListener("click", selectPresetFile);
document
  .getElementById("clearPresetBtn")
  .addEventListener("click", clearPreset);
document
  .getElementById("selectImageBtn")
  .addEventListener("click", selectImageFile);
document
  .getElementById("clearImageBtn")
  .addEventListener("click", clearImageOverride);
document.getElementById("pressedMode").addEventListener("change", updateConfig);

// Sync position/size if the overlay window is moved or resized while settings is open
window.electronAPI.onConfigUpdate((_event, updatedConfig) => {
  if (!currentConfig) return;
  currentConfig = {
    ...currentConfig,
    window: { ...currentConfig.window, ...updatedConfig.window }
  };
  document.getElementById("windowWidth").value = currentConfig.window.width;
  document.getElementById("windowHeight").value = currentConfig.window.height;
  document.getElementById("windowX").value = currentConfig.window.customX ?? "";
  document.getElementById("windowY").value = currentConfig.window.customY ?? "";
});

// Initialize
loadConfig();
