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
  | { type: 'canceled'; message: string }

export type ToolCallStatus = 'running' | 'success' | 'error' | 'canceled'

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

// How Claude handles tool permission prompts for this session.
// acceptEdits: auto-approve file edits, ask for bash/other (safe default)
// auto: auto-approve all tool uses without prompting
// bypassPermissions: skip all checks (unsafe, use in trusted sandboxes only)
// default: ask for every tool (broken in --print mode; use only for awareness)
// dontAsk: don't ask but still log
export type PermissionMode = 'acceptEdits' | 'auto' | 'bypassPermissions' | 'default' | 'dontAsk'

export type Session = {
  id: string
  name: string
  workingDir: string
  status: SessionStatus
  claudeSessionId?: string
  permissionMode: PermissionMode
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
  SESSION_SET_PERMISSION: 'session:set-permission',
  FOLDER_PICK: 'folder:pick',
} as const

export type IpcEventPayload =
  | { channel: typeof IPC.SESSION_EVENT; sessionId: string; event: ClaudeEvent }
  | { channel: typeof IPC.SESSION_STATUS; sessionId: string; status: SessionStatus }
