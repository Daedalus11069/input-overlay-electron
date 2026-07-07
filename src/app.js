// ============================================================
// State
// ============================================================
let currentConfig = null;
let presetData = null; // parsed preset JSON
let spriteImage = null; // HTMLImageElement for the sprite sheet

// PS/2 scan codes currently held down – used by both modes
const pressedKeys = new Set();
const pressedMouseButtons = new Set();
let wheelActive = false;
let wheelTimeout = null;
let wheelDirection = null; // WheelDirection: 3=vertical, 4=horizontal
let wheelRotation = 0; // positive=down, negative=up (per uiohook convention)

function activateWheel(direction, rotation) {
  wheelActive = true;
  wheelDirection = direction ?? null;
  wheelRotation = rotation ?? 0;
  clearTimeout(wheelTimeout);
  wheelTimeout = setTimeout(() => {
    wheelActive = false;
    if (presetData) renderPresetFrame();
  }, 150);
  if (presetData) renderPresetFrame();
}
// Apply background via a CSS custom property so it goes through the stylesheet.
function applyBackground(config) {
  const bg = config.background;
  if (bg?.enabled && bg.color) {
    const hex = bg.color.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = bg.opacity ?? 0.5;
    document.documentElement.style.setProperty(
      "--overlay-bg",
      `rgba(${r},${g},${b},${a})`
    );
  } else {
    document.documentElement.style.setProperty("--overlay-bg", "transparent");
  }
}
// ============================================================
// Legacy div-based mode
// ============================================================

function keydown(key) {
  const keycap = document.querySelector(`#key-${key}`);
  if (keycap) keycap.classList.add("keydown");
}

function keyup(key) {
  const keycap = document.querySelector(`#key-${key}`);
  if (keycap) keycap.classList.remove("keydown");
}

// PS/2 scan code → key name for legacy mode
function getKeyFromCode(keycode) {
  const keyMap = {
    // Letters
    30: "A",
    48: "B",
    46: "C",
    32: "D",
    18: "E",
    33: "F",
    34: "G",
    35: "H",
    23: "I",
    36: "J",
    37: "K",
    38: "L",
    50: "M",
    49: "N",
    24: "O",
    25: "P",
    16: "Q",
    19: "R",
    31: "S",
    20: "T",
    22: "U",
    47: "V",
    17: "W",
    45: "X",
    21: "Y",
    44: "Z",

    // Numbers
    2: "1",
    3: "2",
    4: "3",
    5: "4",
    6: "5",
    7: "6",
    8: "7",
    9: "8",
    10: "9",
    11: "0",

    // Special keys
    15: "tab",
    57: "space",
    42: "shift",
    54: "shift", // Right shift
    29: "ctrl",
    157: "ctrl", // Right ctrl
    56: "alt",
    184: "alt", // Right alt
    28: "enter",
    14: "backspace",
    1: "esc"
  };

  return keyMap[keycode] || null;
}

function renderLegacyOverlay(config) {
  const boxContainer = document.querySelector(".box-container");
  const mouseContainer = document.querySelector(".mouse");

  boxContainer.innerHTML = "";

  if (config.overlays.keyboard.enabled) {
    boxContainer.style.display = "flex";
    config.overlays.keyboard.keys.forEach(key => {
      const div = document.createElement("div");
      div.id = `key-${key}`;
      if (key === "space") {
        div.className = "space-key";
      } else if (key === "nonekey") {
        div.id = "nonekey";
      } else if (config.appearance.showLabels) {
        div.textContent = key.toUpperCase();
      }
      boxContainer.appendChild(div);
    });
  } else {
    boxContainer.style.display = "none";
  }

  mouseContainer.style.display = config.overlays.mouse.enabled
    ? "flex"
    : "none";
}

// ============================================================
// Preset canvas-based mode
// ============================================================

async function loadPreset(config) {
  if (!config.preset?.presetFile) return false;

  try {
    const jsonText = await window.electronAPI.readFile(
      config.preset.presetFile
    );
    presetData = JSON.parse(jsonText);

    // Resolve image file: use explicit override, then auto-detect
    let imageFile = config.preset.imageFile;
    if (!imageFile && config.preset.autoDetectImage !== false) {
      imageFile = await window.electronAPI.resolvePresetImage(
        config.preset.presetFile
      );
    }

    if (imageFile) {
      const dataUrl = await window.electronAPI.readFile(imageFile);
      spriteImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
      });
    } else {
      spriteImage = null;
    }

    return true;
  } catch (err) {
    console.error("Failed to load preset:", err);
    presetData = null;
    spriteImage = null;
    return false;
  }
}

// Draw all elements for the current pressed-key/button state
function renderPresetFrame() {
  const canvas = document.getElementById("overlay-canvas");
  if (!canvas || !presetData) return;

  canvas.width = presetData.overlay_width;
  canvas.height = presetData.overlay_height;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!spriteImage) return;

  const pressedMode = currentConfig?.preset?.pressedMode || "highlight";
  const highlightColor = currentConfig?.appearance?.highlightColor || "#ffeb3b";

  const sorted = [...presetData.elements].sort(
    (a, b) => (parseInt(a.z_level) || 0) - (parseInt(b.z_level) || 0)
  );

  for (const el of sorted) {
    const [sx, sy, sw, sh] = el.mapping;
    const [px, py] = el.pos;

    switch (el.type) {
      case 0:
        // Static background — always draw, no pressed state
        ctx.drawImage(spriteImage, sx, sy, sw, sh, px, py, sw, sh);
        break;

      case 1:
      case 3: {
        const pressed =
          el.type === 1
            ? pressedKeys.has(el.code)
            : pressedMouseButtons.has(el.code);

        ctx.drawImage(spriteImage, sx, sy, sw, sh, px, py, sw, sh);

        if (pressed) {
          if (pressedMode === "sprite-offset") {
            ctx.drawImage(spriteImage, sx, sy + sh, sw, sh, px, py, sw, sh);
          } else {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = highlightColor;
            ctx.fillRect(px, py, sw, sh);
            ctx.restore();
          }
        }
        break;
      }

      case 4: {
        // Type 4 = scroll wheel. States are horizontal in the sprite sheet.
        // Stride between frames = sw + 3.
        //   0 = idle, 1 = wheel click, 2 = scroll up, 3 = scroll down
        const wheelStride = sw + 3;
        let stateIndex = 0;
        if (pressedMouseButtons.has(3)) {
          stateIndex = 1;
        } else if (wheelActive && wheelDirection !== 4) {
          stateIndex = wheelRotation > 0 ? 3 : 2;
        }
        ctx.drawImage(
          spriteImage,
          sx + stateIndex * wheelStride,
          sy,
          sw,
          sh,
          px,
          py,
          sw,
          sh
        );
        break;
      }

      // type 2 = analog axis, type 8 = dpad — not yet supported
    }
  }

  // wheelDirection=4 (horizontal tilt) activates the type-1 element nearest to the
  // wheel element on the tilt side. wheelRotation<0 = left, >0 = right.
  if (wheelActive && wheelDirection === 4) {
    const wheelEl = sorted.find(e => e.type === 4);
    if (wheelEl) {
      const [wx] = wheelEl.pos;
      const tiltEl = sorted
        .filter(
          e =>
            e.type === 1 && (wheelRotation < 0 ? e.pos[0] < wx : e.pos[0] > wx)
        )
        .sort((a, b) => Math.abs(a.pos[0] - wx) - Math.abs(b.pos[0] - wx))[0];
      if (tiltEl) {
        const [tsx, tsy, tsw, tsh] = tiltEl.mapping;
        const [tpx, tpy] = tiltEl.pos;
        if (pressedMode === "sprite-offset") {
          ctx.drawImage(
            spriteImage,
            tsx,
            tsy + tsh,
            tsw,
            tsh,
            tpx,
            tpy,
            tsw,
            tsh
          );
        } else {
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = highlightColor;
          ctx.fillRect(tpx, tpy, tsw, tsh);
          ctx.restore();
        }
      }
    }
  }
}

// Legacy single-type helper kept for reference only (renderPresetFrame now handles all types)
function renderKeySprite(ctx, el) {
  const [sx, sy, sw, sh] = el.mapping;
  const [px, py] = el.pos;
  const pressed = pressedKeys.has(el.code);
  const pressedMode = currentConfig?.preset?.pressedMode || "highlight";

  if (pressedMode === "sprite-offset" && pressed) {
    ctx.drawImage(
      spriteImage,
      sx,
      sy + presetData.default_height,
      sw,
      sh,
      px,
      py,
      sw,
      sh
    );
  } else {
    ctx.drawImage(spriteImage, sx, sy, sw, sh, px, py, sw, sh);
    if (pressed) {
      const color = currentConfig?.appearance?.highlightColor || "#ffeb3b";
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, sw, sh);
      ctx.restore();
    }
  }
}

// ============================================================
// Routing: decide which mode to use based on config
// ============================================================

async function renderOverlay() {
  const config = await window.electronAPI.getConfig();
  currentConfig = config;

  applyBackground(config);

  const canvas = document.getElementById("overlay-canvas");
  const boxContainer = document.querySelector(".box-container");
  const mouseContainer = document.querySelector(".mouse");

  if (config.preset?.presetFile) {
    const loaded = await loadPreset(config);
    if (loaded) {
      canvas.style.display = "block";
      boxContainer.style.display = "none";
      mouseContainer.style.display = "none";
      renderPresetFrame();
      return;
    }
  }

  // Fall back to legacy mode
  presetData = null;
  spriteImage = null;
  canvas.style.display = "none";
  renderLegacyOverlay(config);
}

// ============================================================
// Input event handling
// ============================================================

function setupEventListeners() {
  window.electronAPI.onKeydown((event, keycode) => {
    pressedKeys.add(keycode);
    if (presetData) {
      renderPresetFrame();
    } else {
      const key = getKeyFromCode(keycode);
      if (key) keydown(key);
    }
  });

  window.electronAPI.onKeyup((event, keycode) => {
    pressedKeys.delete(keycode);
    if (presetData) {
      renderPresetFrame();
    } else {
      const key = getKeyFromCode(keycode);
      if (key) keyup(key);
    }
  });

  window.electronAPI.onMousedown((event, button) => {
    pressedMouseButtons.add(button);
    // Middle click (button 3) physically presses the scroll wheel — activate the wheel element too
    if (button === 3) activateWheel();
    if (presetData) {
      renderPresetFrame();
    } else {
      if (button === 1) keydown("leftmousebutton");
      else if (button === 2) keydown("rightmousebutton");
    }
  });

  window.electronAPI.onMouseup((event, button) => {
    pressedMouseButtons.delete(button);
    if (presetData) {
      renderPresetFrame();
    } else {
      if (button === 1) keyup("leftmousebutton");
      else if (button === 2) keyup("rightmousebutton");
    }
  });

  window.electronAPI.onWheel((event, data) => {
    activateWheel(data?.direction, data?.rotation);
  });

  window.electronAPI.onConfigUpdate((event, config) => {
    currentConfig = config;
    pressedKeys.clear();
    pressedMouseButtons.clear();
    renderOverlay();
  });
}

// ============================================================
// Bootstrap
// ============================================================

async function init() {
  await renderOverlay();
  setupEventListeners();

  // When the cursor enters the window, stop ignoring mouse events so the
  // window can be dragged. When it leaves, restore click-through.
  document.addEventListener("mousemove", () => {
    window.electronAPI.setIgnoreMouseEvents(false);
  });
  document.addEventListener("mouseleave", () => {
    window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
