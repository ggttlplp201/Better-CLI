import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { PermissionMode, Session, SessionStatus, ClaudeEvent } from '../shared/types'

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

  setPermissionMode: (sessionId: string, mode: PermissionMode): void =>
    ipcRenderer.send(IPC.SESSION_SET_PERMISSION, sessionId, mode),

  deleteSession: (sessionId: string): void =>
    ipcRenderer.send(IPC.SESSION_DELETE, sessionId),

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

  // PTY (interactive terminal)
  ptySpawn: (sessionId: string, cwd: string, cols: number, rows: number): Promise<void> =>
    ipcRenderer.invoke(IPC.PTY_SPAWN, sessionId, cwd, cols, rows),

  ptyInput: (sessionId: string, data: string): void =>
    ipcRenderer.send(IPC.PTY_INPUT, sessionId, data),

  ptyResize: (sessionId: string, cols: number, rows: number): void =>
    ipcRenderer.send(IPC.PTY_RESIZE, sessionId, cols, rows),

  ptyKill: (sessionId: string): void =>
    ipcRenderer.send(IPC.PTY_KILL, sessionId),

  ptyScrollback: (sessionId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.PTY_SCROLLBACK, sessionId),

  ptyIsAlive: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.PTY_IS_ALIVE, sessionId),

  onPtyData: (cb: (sessionId: string, data: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, sessionId: string, data: string) =>
      cb(sessionId, data)
    ipcRenderer.on(IPC.PTY_DATA, handler)
    return () => ipcRenderer.off(IPC.PTY_DATA, handler)
  },

  onPtyExit: (cb: (sessionId: string, code: number) => void) => {
    const handler = (_: Electron.IpcRendererEvent, sessionId: string, code: number) =>
      cb(sessionId, code)
    ipcRenderer.on(IPC.PTY_EXIT, handler)
    return () => ipcRenderer.off(IPC.PTY_EXIT, handler)
  },
})
