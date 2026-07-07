# Migration Guide - Upgrading to v2.0

## What's New

This upgrade brings your Input Overlay application from Electron 8 to Electron 32 with many modern features:

### Key Changes

1. **Electron 32.0.1** (from 8.5.3)
   - Latest features and security updates
   - Better performance
   - Modern APIs

2. **uiohook-napi** (replaces iohook)
   - Works with any Electron version
   - No Node.js version restrictions
   - Better cross-platform support

3. **New Features**
   - Settings UI for easy configuration
   - Flexible window positioning
   - Dynamic key selection
   - Persistent configuration
   - System tray integration
   - Modern security with context isolation

## How to Use the New Settings

### Opening Settings

1. Find the Input Overlay icon in your system tray (bottom-right on Windows)
2. Right-click the icon and select "Settings"
3. Or double-click the tray icon

### Configuring Keys

1. Open Settings
2. In the "Keyboard Keys" section, click on any key to add/remove it
3. Selected keys will be highlighted in blue
4. Changes apply immediately!

### Changing Position

1. Open Settings
2. Under "Window Position", select where you want the overlay:
   - Top Left
   - Top Right
   - Bottom Left
   - Bottom Right
3. Adjust the margin (distance from screen edge)
4. The overlay will move immediately

### Adjusting Opacity

1. Open Settings
2. Under "Window Position", change the Opacity value
3. Values from 0.1 (very transparent) to 1.0 (fully opaque)

## System Tray Features

The application now runs in the system tray:

- **Settings**: Open configuration window
- **Show Overlay**: Make overlay visible
- **Hide Overlay**: Hide overlay temporarily
- **Quit**: Exit the application

## Configuration Storage

Your settings are automatically saved to:

- Windows: `%APPDATA%/input-overlay-electron/overlay-config.json`
- You can backup this file to save your configuration

## Breaking Changes

### ❌ Removed

- No longer requires Node.js 12.18.3 (works with any modern Node.js)
- No longer requires specific Electron version constraints
- `iohook` has been replaced (configuration is compatible)

### ✅ Upgraded

- Now uses modern Electron security practices
- Better performance with latest Electron
- More reliable input capture

## Troubleshooting

### If the overlay doesn't show

1. Check the system tray icon
2. Right-click and select "Show Overlay"
3. Make sure at least one overlay component is enabled in Settings

### If inputs aren't captured

1. On Windows, the app may need administrator privileges
2. Restart the application
3. Check that keyboard/mouse overlays are enabled in Settings

### If you get build errors

```bash
# Remove old dependencies
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still having issues, rebuild native modules
npm rebuild
```

## Running the Application

```bash
# Development mode
npm start

# Build installer (Windows)
npm run build-installer

# Build for all platforms
npm run make
```

## Need Help?

- Check the README-EN.md file for detailed documentation
- Original README (Korean) is in Readme.md
- Open an issue on GitHub for bugs or feature requests
