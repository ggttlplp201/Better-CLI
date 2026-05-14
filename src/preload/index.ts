import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { Session, SessionStatus, ClaudeEvent } from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  pickFolder: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.FOLDER_PICK),

  createSession: (workingDir: string, name: string): Promise<Session> =>
    ipcRenderer.invoke(IPC.SESSION_CREATE, workingDir, name),

  listSessions: (): Promise<Session[]> =>
    ipcRenderer.invoke(IPC.SESSION_LIST),

  sendMessage: (sessionId: string, text: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SESSION_SEND, sessionId, text),

  stopSession: (sessionId: string): void =>
    ipcRenderer.send(IPC.SESSION_STOP, sessionId),

  resumeSession: (sessionId: string): void =>
    ipcRenderer.send(IPC.SESSION_RESUME, sessionId),

  onEvent: (cb: (sessionId: string, event: ClaudeEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, sessionId: string, event: ClaudeEvent) =>
      cb(sessionId, event)
    ipcRenderer.on(IPC.SESSION_EVENT, handler)
    return () => ipcRenderer.off(IPC.SESSION_EVENT, handler)
  },

  onStatus: (cb: (sessionId: string, status: SessionStatus) => void) => {
    const handler = (_: Electron.IpcRendererEvent, sessionId: string, status: SessionStatus) =>
      cb(sessionId, status)
    ipcRenderer.on(IPC.SESSION_STATUS, handler)
    return () => ipcRenderer.off(IPC.SESSION_STATUS, handler)
  },
})
