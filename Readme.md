# Input Overlay for Electron

A customizable, transparent input overlay application for Windows, macOS, and Linux. Perfect for streamers, content creators, or anyone who wants to display their keyboard and mouse inputs on screen.

![Demo](ReadmeRes/1.jpg)

## Features

- **Fully Customizable**: Choose which keys and mouse buttons to display
- **Modern UI**: Clean, transparent overlay that won't distract from your content
- **Easy Configuration**: User-friendly settings interface
- **Flexible Positioning**: Place the overlay anywhere on your screen
- **System Tray Integration**: Runs quietly in the background
- **Secure**: Built with modern Electron security best practices
- **Cross-platform**: Works on Windows, macOS, and Linux

## Demo

[![Demo Video](https://img.youtube.com/vi/VVTzGOGayYA/0.jpg)](https://www.youtube.com/watch?v=VVTzGOGayYA)

## Quick Start

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

```bash
npm start
```

### Building Installers

For cross-platform builds:

```bash
npm run make
```

For Windows NSIS installer:

```bash
npm run build-installer
```

## Usage

### Opening Settings

- **Right-click** the system tray icon and select "Settings"
- **Double-click** the system tray icon

### Configuring Your Overlay

The settings window allows you to customize:

1. **Overlay Components**
   - Toggle keyboard overlay on/off
   - Toggle mouse overlay on/off

2. **Keyboard Keys**
   - Select which keys to display (WASD, QWER, etc.)
   - Click any key to add/remove it from the overlay

3. **Window Position**
   - Choose from preset positions (top-left, top-right, bottom-left, bottom-right)
   - Adjust margin from screen edge
   - Control overlay opacity

4. **Appearance**
   - Toggle key labels on/off
   - Customize highlight colors

### System Tray Menu

- **Settings**: Open the configuration window
- **Show Overlay**: Display the overlay window
- **Hide Overlay**: Hide the overlay window
- **Quit**: Exit the application

## Configuration File

Settings are automatically saved to:

- **Windows**: `%APPDATA%\input-overlay-electron\overlay-config.json`
- **macOS**: `~/Library/Application Support/input-overlay-electron/overlay-config.json`
- **Linux**: `~/.config/input-overlay-electron/overlay-config.json`

## Tech Stack

- **Electron**: v32.0.1 (Latest)
- **uiohook-napi**: Global keyboard and mouse event capture
- Modern security with `contextIsolation` and preload scripts

## Development

### Project Structure

```
src/
├── app.js           # Renderer process for overlay
├── index.html       # Main overlay window
├── index.css        # Overlay styles
├── index.js         # Main process (Electron entry point)
├── preload.js       # Secure IPC bridge
├── config.js        # Configuration management
├── settings.html    # Settings window UI
└── settings.js      # Settings window logic
```

### Key Concepts

- **Main Process** (`index.js`): Manages windows, system tray, and input hooks
- **Renderer Process** (`app.js`): Displays the overlay and handles animations
- **Preload Script** (`preload.js`): Secure bridge between main and renderer processes
- **Config Manager** (`config.js`): Handles persistent configuration storage

## Recent Upgrades (v2.0)

This version includes major upgrades:

- ✅ Electron 8 → Electron 32 (latest)
- ✅ `iohook` → `uiohook-napi` (better compatibility, no version constraints)
- ✅ Added context isolation for security
- ✅ New settings interface with live configuration
- ✅ Dynamic overlay configuration
- ✅ System tray integration
- ✅ Modern Electron Forge v7

### Breaking Changes

- No longer requires specific Node.js version (previously required v12.18.3)
- No longer requires Electron < 9 (now works with latest)
- Configuration format has changed (will auto-migrate on first run)

## Troubleshooting

### Windows: "Administrator privileges required"

The installer may request admin rights to capture global input events. This is normal.

### Overlay not capturing inputs

Make sure the application is running and check the system tray for the icon.

### Native module build errors

If you encounter errors during `npm install`:

```bash
# Try rebuilding
npm rebuild

# Or force install
npm install --force
```

For Windows, you may need:

- Visual Studio Build Tools
- Python 3.x

## License

GPL-2.0 license

## Credits

- Original author: [chinsun9](https://github.com/chinsun9)
- Updated to Electron 32 with modern features and configuration UI

## Contributing

Feel free to open issues or submit pull requests for improvements!

---

## 한국어 (Korean)

일렉트론 기반 입력 오버레이 프로그램입니다.

### 주요 기능

- 키보드 및 마우스 입력 오버레이
- 항상 위에 표시
- 오버레이 영역 마우스 클릭 무시
- 설정 UI를 통한 쉬운 커스터마이징
- 시스템 트레이 통합

### 변경사항

- ⚠️ 더 이상 Node.js 12.18.3 버전을 요구하지 않습니다
- ⚠️ 더 이상 Electron 9 미만 버전이 필요하지 않습니다
- ✅ 최신 Electron 32 사용
- ✅ 설정 UI 추가
- ✅ 동적 오버레이 구성
