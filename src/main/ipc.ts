import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC } from '../shared/types'
import type { SessionManager } from './session'

export function registerIpc(manager: SessionManager): void {
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
}
