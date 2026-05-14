import { app, BrowserWindow, shell, globalShortcut } from 'electron'
import { join } from 'path'
import { SessionManager } from './session'
import { registerIpc } from './ipc'
import { IPC } from '../shared/types'

const manager = new SessionManager()

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

  const onEvent = (sessionId: string, event: unknown) => {
    if (!win.isDestroyed()) win.webContents.send(IPC.SESSION_EVENT, sessionId, event)
  }
  const onStatus = (sessionId: string, status: string) => {
    if (!win.isDestroyed()) win.webContents.send(IPC.SESSION_STATUS, sessionId, status)
  }

  manager.on('event', onEvent)
  manager.on('status', onStatus)
  win.on('closed', () => {
    manager.off('event', onEvent)
    manager.off('status', onStatus)
  })

  return win
}

app.whenReady().then(() => {
  registerIpc(manager)
  const win = createWindow()

  globalShortcut.register('CommandOrControl+Option+I', () => {
    win.webContents.toggleDevTools()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
