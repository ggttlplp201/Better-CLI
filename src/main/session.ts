import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { parseStream } from './parser'
import type { ClaudeEvent, Session, SessionStatus } from '../shared/types'

type SessionState = Omit<Session, never> & { currentProc?: ChildProcess; buffer: string }

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, SessionState>()

  create(workingDir: string, name: string): Session {
    const id = randomUUID()
    const state: SessionState = {
      id,
      name,
      workingDir,
      status: 'active',
      messages: [],
      toolCalls: [],
      createdAt: Date.now(),
      buffer: '',
    }
    this.sessions.set(id, state)
    return this.toSession(state)
  }

  list(): Session[] {
    return Array.from(this.sessions.values()).map(s => this.toSession(s))
  }

  send(sessionId: string, text: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)
    if (state.status === 'loading') throw new Error(`Session ${sessionId} is busy`)

    const args = ['--print', text, '--output-format', 'stream-json', '--verbose']
    if (state.claudeSessionId) {
      args.push('--resume', state.claudeSessionId)
    }

    state.buffer = ''
    this.setStatus(state, 'loading')

    const proc = spawn('claude', args, {
      cwd: state.workingDir,
      env: { ...process.env },
    })
    state.currentProc = proc

    proc.stdout.on('data', (chunk: Buffer) => {
      const { events, remaining } = parseStream(chunk.toString(), state.buffer)
      state.buffer = remaining
      for (const event of events) {
        if (event.type === 'result' && event.session_id) {
          state.claudeSessionId = event.session_id
        }
        this.emit('event', sessionId, event)
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      // surface stderr as an error event so the UI can show it
      const msg = chunk.toString().trim()
      if (msg) {
        const errEvent: ClaudeEvent = { type: 'error', error: { message: msg } }
        this.emit('event', sessionId, errEvent)
      }
    })

    proc.on('exit', () => {
      state.currentProc = undefined
      this.setStatus(state, 'active')
    })
  }

  stop(sessionId: string): void {
    const state = this.sessions.get(sessionId)
    state?.currentProc?.kill('SIGINT')
  }

  resume(sessionId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error(`Session ${sessionId} not found`)
    this.setStatus(state, 'active')
  }

  private setStatus(state: SessionState, status: SessionStatus): void {
    state.status = status
    this.emit('status', state.id, status)
  }

  private toSession(state: SessionState): Session {
    const { buffer: _b, currentProc: _p, ...session } = state
    return session
  }
}
