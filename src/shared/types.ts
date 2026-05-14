// Types shared between main process and renderer

export type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

export type ClaudeEvent =
  | { type: 'system'; subtype: 'init'; session_id: string }
  | { type: 'assistant'; message: { content: ClaudeContentBlock[] }; session_id: string }
  | { type: 'user'; message: { content: unknown[] } }
  | { type: 'result'; subtype: 'success' | 'error'; result: string; session_id: string; cost_usd?: number }
  | { type: 'error'; error: { message: string } }

export type ToolCallStatus = 'running' | 'success' | 'error'

export type ToolCall = {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  status: ToolCallStatus
  startedAt: number
  endedAt?: number
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  toolCallIds: string[]
  timestamp: number
}

export type SessionStatus = 'active' | 'inactive' | 'loading'

export type Session = {
  id: string
  name: string
  workingDir: string
  status: SessionStatus
  claudeSessionId?: string
  messages: Message[]
  toolCalls: ToolCall[]
  createdAt: number
}

// IPC channel names used by both main and preload
export const IPC = {
  SESSION_CREATE: 'session:create',
  SESSION_SEND: 'session:send',
  SESSION_STOP: 'session:stop',
  SESSION_RESUME: 'session:resume',
  SESSION_LIST: 'session:list',
  SESSION_EVENT: 'session:event',
  SESSION_STATUS: 'session:status',
  FOLDER_PICK: 'folder:pick',
} as const

export type IpcEventPayload =
  | { channel: typeof IPC.SESSION_EVENT; sessionId: string; event: ClaudeEvent }
  | { channel: typeof IPC.SESSION_STATUS; sessionId: string; status: SessionStatus }
