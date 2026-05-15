# Better CLI — Desktop UI for Claude Code

A native macOS desktop app that wraps the Claude Code CLI in a proper UI. Three-panel layout with a session sidebar, chat area, and live tool call viewer. Includes a full interactive terminal tab for auth, config, and permission flows.

<img width="1271" height="922" alt="Screenshot 2026-05-14 at 11 00 00 AM" src="https://github.com/user-attachments/assets/6578c748-5f55-46ae-8799-e1c0af2c952e" />

## Features

- **Chat tab** — structured Markdown rendering, streaming responses, tool call panel, persisted session history
- **Terminal tab** — full interactive `claude` session in a real PTY (xterm.js), so auth, `/login`, `/config`, permission prompts, and any TTY-required flow work exactly as in a native terminal
- Multiple named sessions with status indicators and per-session working directory
- Slash command autocomplete popup (`/`) covering built-in, Codex, and Ruflo plugin commands
- Per-session permission mode (accept edits / auto-approve / bypass / ask)
- Stop button to interrupt mid-response
- macOS native title bar with traffic light buttons
- Sessions and chat history persisted across restarts

## How it works

**Chat tab** runs `claude --print --output-format stream-json` and renders structured JSON events as chat bubbles, tool cards, and Markdown. Best for everyday use.

**Terminal tab** spawns `claude` inside a native PTY so Claude thinks it's in a real terminal. Use this when you need to log in, change config, approve permissions interactively, or use any command that doesn't work in `--print` mode. The terminal buffers scrollback, so switching between tabs doesn't lose your session.

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
2. Click **+** in the sidebar and choose a working directory
3. Type a message in the **Chat** tab and press **Enter** to send (`Shift+Enter` for newline)
4. Type `/` to open the slash command autocomplete popup
5. Switch to the **Terminal** tab for auth, config, or any interactive Claude flow
6. Use the permission mode dropdown in the header to control how Claude handles tool approvals
7. Press **⌘⌥I** to open DevTools

## Project structure

```
src/
  main/         Electron main process — session manager, PTY manager, IPC
  preload/      Context bridge exposing IPC to the renderer
  renderer/     React UI — chat, terminal, sidebar, tool panel, input bar
  shared/       TypeScript types shared between main and renderer
```

## Tech stack

- Electron 34, electron-vite 2
- React 18 + TypeScript
- Tailwind CSS 3
- node-pty (interactive terminal sessions)
- xterm.js (terminal renderer)
- react-markdown (chat rendering)
