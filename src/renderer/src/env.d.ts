import type { Session, SessionStatus, ClaudeEvent } from '../../shared/types'

declare global {
  interface Window {
    api: {
      pickFolder: () => Promise<string | null>
      createSession: (workingDir: string, name: string) => Promise<Session>
      listSessions: () => Promise<Session[]>
      sendMessage: (sessionId: string, text: string) => Promise<void>
      stopSession: (sessionId: string) => void
      resumeSession: (sessionId: string) => void
      onEvent: (cb: (sessionId: string, event: ClaudeEvent) => void) => () => void
      onStatus: (cb: (sessionId: string, status: SessionStatus) => void) => () => void
    }
  }
}
