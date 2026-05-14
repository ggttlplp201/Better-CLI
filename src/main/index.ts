import { app, BrowserWindow, shell, net, protocol } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { SessionManager } from './session'
import { registerIpc } from './ipc'

// Register custom scheme before app is ready so ES modules get a real origin
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true } }
])

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
    win.loadURL('app://localhost/index.html')
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

app.whenReady().then(() => {
  // Serve renderer files via app:// so type="module" scripts get a proper origin
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    const rendererRoot = join(__dirname, '../renderer')
    const filePath = join(rendererRoot, url.pathname)
    return net.fetch(pathToFileURL(filePath).toString())
  })

  const manager = new SessionManager()
  const win = createWindow()
  registerIpc(manager, win)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
