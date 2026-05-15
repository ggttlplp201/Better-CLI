import { spawn, execFileSync, ChildProcess } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { parseLine, parseStream } from './parser'
import type { ClaudeEvent, Message, PermissionMode, Session, SessionStatus, ToolCall } from '../shared/types'

function resolveClaude(): string {
  const home = process.env.HOME ?? ''
  const candidates = [
    join(home, '.local/bin/claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  try {
    const r = execFileSync('/bin/zsh', ['-lc', 'which claude'], { encoding: 'utf8' }).trim()
    if (r) return r
  } catch {}
  return 'claude'
}

const CLAUDE_BIN = resolveClaude()

// streamingMsgId is runtime-only — tracks which message is currently being
// streamed so partial events update in-place instead of creating duplicates.
type SessionState = Session & { currentProc?: ChildProcess; buffer: string; streamingMsgId?: string }

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, SessionState>()
  private readonly storagePath?: string

  constructor(storagePath?: string) {
    super()
    this.storagePath = storagePath
    this.load()
  }

  create(workingDir: string, name: string): Session {
    const id = randomUUID()
    const state: SessionState = {
      id,
      name,
      workingDir,
      status: 'active',
      permissionMode: 'acceptEdits',
      messages: [],
      toolCalls: [],
      createdAt: Date.now(),
      buffer: '',
    }
    this.sessions.set(id, state)
    this.persist()
    return this.toSession(state)
  }

  list(): Session[] {
    return Array.from(this.sessions.values()).map(s => this.toSession(s))
  }

  send(sessionId: string, text: string, retryWithoutResume = false): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)
    if (state.status === 'loading') throw new Error(`Session ${sessionId} is busy`)

    if (!retryWithoutResume) {
      const userMessage: Message = {
        id: randomUUID(),
        role: 'user',
        text,
        toolCallIds: [],
        timestamp: Date.now(),
      }
      state.messages.push(userMessage)
      this.persist()
    }

    const args = [
      '--print', text,
      '--output-format', 'stream-json',
      '--verbose',
      '--permission-mode', state.permissionMode,
      '--include-partial-messages',
    ]
    if (state.claudeSessionId && !retryWithoutResume) {
      args.push('--resume', state.claudeSessionId)
    }

    state.buffer = ''
    state.streamingMsgId = undefined
    this.setStatus(state, 'loading')

    const proc = spawn(CLAUDE_BIN, args, {
      cwd: state.workingDir,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    state.currentProc = proc

    proc.on('error', (err) => {
      state.currentProc = undefined
      state.streamingMsgId = undefined
      const errEvent: ClaudeEvent = { type: 'error', error: { message: `Failed to start Claude: ${err.message}` } }
      this.applyEvent(state, errEvent)
      this.emit('event', sessionId, errEvent)
      this.setStatus(state, 'active')
    })

    let stderrAccum = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      const { events, remaining } = parseStream(chunk.toString(), state.buffer)
      state.buffer = remaining
      for (const event of events) {
        if (event.type === 'result' && event.session_id) {
          state.claudeSessionId = event.session_id
        }
        this.applyEvent(state, event)
        this.emit('event', sessionId, event)
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrAccum += chunk.toString()
    })

    proc.on('exit', (code, signal) => {
      state.currentProc = undefined
      state.streamingMsgId = undefined

      const finalEvent = parseLine(state.buffer)
      state.buffer = ''
      if (finalEvent) {
        if (finalEvent.type === 'result' && finalEvent.session_id) {
          state.claudeSessionId = finalEvent.session_id
        }
        this.applyEvent(state, finalEvent)
        this.emit('event', sessionId, finalEvent)
      }

      const msg = stderrAccum.trim()
      if (msg) {
        if (msg.includes('No conversation found with session ID')) {
          state.claudeSessionId = undefined
          this.setStatus(state, 'active')
          this.send(sessionId, text, true)
          return
        }
        if (code !== 0 && signal !== 'SIGINT') {
          const errEvent: ClaudeEvent = { type: 'error', error: { message: msg } }
          this.applyEvent(state, errEvent)
          this.emit('event', sessionId, errEvent)
        }
      }

      this.setStatus(state, 'active')
    })
  }

  stop(sessionId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state?.currentProc) return

    state.streamingMsgId = undefined
    const cancelEvent: ClaudeEvent = { type: 'canceled', message: 'Stopped by user' }
    this.applyEvent(state, cancelEvent)
    this.emit('event', sessionId, cancelEvent)
    state.currentProc.kill('SIGINT')
  }

  resume(sessionId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)
    this.setStatus(state, 'active')
  }

  delete(sessionId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) return
    if (state.currentProc) state.currentProc.kill('SIGINT')
    this.sessions.delete(sessionId)
    this.persist()
  }

  setPermissionMode(sessionId: string, mode: PermissionMode): void {
    const state = this.sessions.get(sessionId)
    if (!state) return
    state.permissionMode = mode
    this.persist()
  }

  private setStatus(state: SessionState, status: SessionStatus): void {
    state.status = status
    this.persist()
    this.emit('status', state.id, status)
  }

  private toSession(state: SessionState): Session {
    const { buffer: _b, currentProc: _p, streamingMsgId: _s, ...session } = state
    return session
  }

  private applyEvent(state: SessionState, event: ClaudeEvent): void {
    if (event.type === 'assistant') {
      const textBlock = event.message.content.find(b => b.type === 'text')
      const toolBlocks = event.message.content.filter(b => b.type === 'tool_use')

      const newToolCalls: ToolCall[] = toolBlocks
        .filter((b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use')
        // Deduplicate: partial events may repeat tool blocks already seen
        .filter(b => !state.toolCalls.some(tc => tc.id === b.id))
        .map(b => ({
          id: b.id,
          name: b.name,
          input: b.input,
          status: 'running' as const,
          startedAt: Date.now(),
        }))

      if (newToolCalls.length > 0) {
        state.toolCalls.push(...newToolCalls)
      }

      if (textBlock?.type === 'text') {
        if (state.streamingMsgId) {
          // Update the streaming message in-place — no new message, no persist
          const msg = state.messages.find(m => m.id === state.streamingMsgId)
          if (msg) {
            msg.text = textBlock.text
            if (newToolCalls.length > 0) {
              msg.toolCallIds.push(...newToolCalls.map(t => t.id))
            }
          }
        } else {
          // First text block of this turn — create message and start streaming
          const newMsg: Message = {
            id: randomUUID(),
            role: 'assistant',
            text: textBlock.text,
            toolCallIds: newToolCalls.map(t => t.id),
            timestamp: Date.now(),
          }
          state.messages.push(newMsg)
          state.streamingMsgId = newMsg.id
          this.persist()
        }
      } else if (newToolCalls.length > 0 && !state.streamingMsgId) {
        // Tool-only event with no preceding text — create a host message
        const newMsg: Message = {
          id: randomUUID(),
          role: 'assistant',
          text: '',
          toolCallIds: newToolCalls.map(t => t.id),
          timestamp: Date.now(),
        }
        state.messages.push(newMsg)
        this.persist()
      }
      return
    }

    if (event.type === 'result') {
      // Turn complete — persist the finished message
      this.persist()
      return
    }

    if (event.type === 'user') {
      const content = (event.message.content ?? []) as Array<{ type: string; tool_use_id?: string; content?: string; is_error?: boolean }>
      const results = content.filter(b => b.type === 'tool_result')
      if (!results.length) return
      state.toolCalls = state.toolCalls.map(tc => {
        const result = results.find(r => r.tool_use_id === tc.id)
        if (!result) return tc
        const status = result.is_error ? 'error' as const : 'success' as const
        return { ...tc, result: result.content ?? '', status, endedAt: Date.now() }
      })
      this.persist()
      return
    }

    if (event.type === 'error') {
      state.messages.push({
        id: randomUUID(),
        role: 'assistant',
        text: `Warning: ${event.error.message}`,
        toolCallIds: [],
        timestamp: Date.now(),
      })
      this.persist()
      return
    }

    if (event.type === 'canceled') {
      state.messages.push({
        id: randomUUID(),
        role: 'assistant',
        text: event.message,
        toolCallIds: [],
        timestamp: Date.now(),
      })
      state.toolCalls = state.toolCalls.map(tc =>
        tc.status === 'running' ? { ...tc, status: 'canceled' as const, endedAt: Date.now() } : tc
      )
      this.persist()
    }
  }

  private load(): void {
    if (!this.storagePath || !existsSync(this.storagePath)) return

    try {
      const raw = readFileSync(this.storagePath, 'utf8')
      const parsed = JSON.parse(raw) as { sessions?: Session[] }
      for (const session of parsed.sessions ?? []) {
        this.sessions.set(session.id, {
          ...session,
          // Back-compat: sessions saved before permissionMode was added
          permissionMode: session.permissionMode ?? 'acceptEdits',
          status: session.status === 'loading' ? 'active' : session.status,
          buffer: '',
        })
      }
    } catch {
      this.sessions.clear()
    }
  }

  private persist(): void {
    if (!this.storagePath) return

    const payload = JSON.stringify({ sessions: this.list() }, null, 2)
    mkdirSync(dirname(this.storagePath), { recursive: true })
    writeFileSync(this.storagePath, payload)
  }
}
