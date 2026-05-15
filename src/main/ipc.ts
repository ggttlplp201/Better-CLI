import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC } from '../shared/types'
import type { PermissionMode } from '../shared/types'
import type { SessionManager } from './session'
import type { PtyManager } from './pty'

export function registerIpc(manager: SessionManager, ptyManager: PtyManager): void {
  ipcMain.handle(IPC.FOLDER_PICK, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: 'Choose working directory for this session',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.SESSION_CREATE, (_e, workingDir: string, name: string) => {
    return manager.create(workingDir, name)
  })

  ipcMain.handle(IPC.SESSION_LIST, () => {
    return manager.list()
  })

  ipcMain.handle(IPC.SESSION_SEND, (_e, sessionId: string, text: string) => {
    manager.send(sessionId, text)
  })

  ipcMain.on(IPC.SESSION_STOP, (_e, sessionId: string) => {
    manager.stop(sessionId)
  })

  ipcMain.on(IPC.SESSION_RESUME, (_e, sessionId: string) => {
    manager.resume(sessionId)
  })

  ipcMain.on(IPC.SESSION_SET_PERMISSION, (_e, sessionId: string, mode: PermissionMode) => {
    manager.setPermissionMode(sessionId, mode)
  })

  ipcMain.on(IPC.SESSION_DELETE, (_e, sessionId: string) => {
    manager.delete(sessionId)
  })

  // PTY handlers
  ipcMain.handle(IPC.PTY_SPAWN, (_e, sessionId: string, cwd: string, cols: number, rows: number) => {
    ptyManager.spawn(sessionId, cwd, cols, rows)
  })

  ipcMain.on(IPC.PTY_INPUT, (_e, sessionId: string, data: string) => {
    ptyManager.write(sessionId, data)
  })

  ipcMain.on(IPC.PTY_RESIZE, (_e, sessionId: string, cols: number, rows: number) => {
    ptyManager.resize(sessionId, cols, rows)
  })

  ipcMain.on(IPC.PTY_KILL, (_e, sessionId: string) => {
    ptyManager.kill(sessionId)
  })

  ipcMain.handle(IPC.PTY_SCROLLBACK, (_e, sessionId: string) => {
    return ptyManager.getScrollback(sessionId)
  })

  ipcMain.handle(IPC.PTY_IS_ALIVE, (_e, sessionId: string) => {
    return ptyManager.isAlive(sessionId)
  })
}
