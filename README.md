# Better CLI — Desktop UI for Claude Code

A native macOS desktop app that wraps the Claude Code CLI in a proper UI. Three-panel layout: session sidebar, chat area, and tool call viewer. Full slash command support with autocomplete.

![screenshot placeholder](docs/screenshot.png)

## Features

- Multiple named sessions with status indicators
- Streaming responses rendered as Markdown with syntax-highlighted code blocks
- Tool call panel showing what Claude is doing in real-time
- Slash command popup (`/`) with all built-in, Codex, and Ruflo plugin commands
- Stop button to interrupt mid-response
- macOS native title bar with traffic light buttons

## Requirements

- macOS (arm64)
- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- Node.js 18+ and npm (to build from source)

## Install (pre-built)

Download the latest DMG from [Releases](https://github.com/ggttlplp201/Better-CLI/releases), open it, and drag **Claude UI** to your Applications folder.

> First launch: macOS may show "unidentified developer" — right-click the app and choose **Open** to bypass Gatekeeper.

## Build from source

```bash
git clone https://github.com/ggttlplp201/Better-CLI.git
cd Better-CLI
npm install
npm run package
# Output: dist/Claude UI-0.1.0-arm64.dmg
```

For development with hot-reload:

```bash
npm run dev
```

## Usage

1. Launch the app
2. Click **+** in the sidebar to create a new session — it opens in your home directory
3. Type a message and press **Enter** to send
4. Press **Shift+Enter** for a newline
5. Type `/` to open the command autocomplete popup
6. Press **⌘⌥I** to open DevTools if needed

## Project structure

```
src/
  main/         Electron main process (session manager, IPC, claude subprocess)
  preload/      Context bridge exposing IPC to renderer
  renderer/     React UI (chat, sidebar, tool panel, input bar)
  shared/       Shared TypeScript types
```

## Tech stack

- Electron 34, electron-vite 2
- React 18 + TypeScript
- Tailwind CSS 3
- Shiki for syntax highlighting
