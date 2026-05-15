import { app, BrowserWindow, shell, globalShortcut } from 'electron'
import { join } from 'path'
import { SessionManager } from './session'
import { PtyManager } from './pty'
import { registerIpc } from './ipc'
import { IPC } from '../shared/types'

const manager = new SessionManager(join(app.getPath('userData'), 'sessions.json'))
const ptyManager = new PtyManager()

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Forward session events to this window
  const onEvent = (sessionId: string, event: unknown) => {
    if (!win.isDestroyed()) win.webContents.send(IPC.SESSION_EVENT, sessionId, event)
  }
  const onStatus = (sessionId: string, status: string) => {
    if (!win.isDestroyed()) win.webContents.send(IPC.SESSION_STATUS, sessionId, status)
  }

  // Forward PTY output to this window
  const onPtyData = (sessionId: string, data: string) => {
    if (!win.isDestroyed()) win.webContents.send(IPC.PTY_DATA, sessionId, data)
  }
  const onPtyExit = (sessionId: string, code: number) => {
    if (!win.isDestroyed()) win.webContents.send(IPC.PTY_EXIT, sessionId, code)
  }

  manager.on('event', onEvent)
  manager.on('status', onStatus)
  ptyManager.on('data', onPtyData)
  ptyManager.on('exit', onPtyExit)

  win.on('closed', () => {
    manager.off('event', onEvent)
    manager.off('status', onStatus)
    ptyManager.off('data', onPtyData)
    ptyManager.off('exit', onPtyExit)
  })

  return win
}

app.whenReady().then(() => {
  registerIpc(manager, ptyManager)
  const win = createWindow()

  globalShortcut.register('CommandOrControl+Option+I', () => {
    win.webContents.toggleDevTools()
  })
})

app.on('window-all-closed', () => {
  ptyManager.killAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
