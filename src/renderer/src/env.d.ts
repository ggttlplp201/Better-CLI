import type { PermissionMode, Session, SessionStatus, ClaudeEvent } from '../../shared/types'

declare global {
  interface Window {
    api: {
      pickFolder: () => Promise<string | null>
      createSession: (workingDir: string, name: string) => Promise<Session>
      listSessions: () => Promise<Session[]>
      sendMessage: (sessionId: string, text: string) => Promise<void>
      stopSession: (sessionId: string) => void
      resumeSession: (sessionId: string) => void
      setPermissionMode: (sessionId: string, mode: PermissionMode) => void
      deleteSession: (sessionId: string) => void
      onEvent: (cb: (sessionId: string, event: ClaudeEvent) => void) => () => void
      onStatus: (cb: (sessionId: string, status: SessionStatus) => void) => () => void
      // PTY (interactive terminal)
      ptySpawn: (sessionId: string, cwd: string, cols: number, rows: number) => Promise<void>
      ptyInput: (sessionId: string, data: string) => void
      ptyResize: (sessionId: string, cols: number, rows: number) => void
      ptyKill: (sessionId: string) => void
      ptyScrollback: (sessionId: string) => Promise<string>
      ptyIsAlive: (sessionId: string) => Promise<boolean>
      onPtyData: (cb: (sessionId: string, data: string) => void) => () => void
      onPtyExit: (cb: (sessionId: string, code: number) => void) => () => void
    }
  }
}
