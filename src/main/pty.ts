import * as nodePty from 'node-pty'
import { existsSync, execFileSync } from 'fs'
import { join } from 'path'
import { EventEmitter } from 'events'

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

// Ring buffer size per PTY session (bytes). Allows replaying history on
// tab switch without holding unbounded memory.
const BUFFER_LIMIT = 200_000

export class PtyManager extends EventEmitter {
  private ptys = new Map<string, nodePty.IPty>()
  private scrollback = new Map<string, string>()

  spawn(sessionId: string, cwd: string, cols: number, rows: number): void {
    if (this.ptys.has(sessionId)) return

    const p = nodePty.spawn(CLAUDE_BIN, [], {
      name: 'xterm-256color',
      cols: Math.max(cols, 20),
      rows: Math.max(rows, 5),
      cwd,
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
    })

    this.ptys.set(sessionId, p)
    this.scrollback.set(sessionId, '')

    p.onData(data => {
      let buf = (this.scrollback.get(sessionId) ?? '') + data
      if (buf.length > BUFFER_LIMIT) buf = buf.slice(buf.length - BUFFER_LIMIT)
      this.scrollback.set(sessionId, buf)
      this.emit('data', sessionId, data)
    })

    p.onExit(({ exitCode }) => {
      this.ptys.delete(sessionId)
      this.emit('exit', sessionId, exitCode ?? 0)
    })
  }

  write(sessionId: string, data: string): void {
    this.ptys.get(sessionId)?.write(data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const p = this.ptys.get(sessionId)
    if (!p) return
    p.resize(Math.max(cols, 20), Math.max(rows, 5))
  }

  // Returns buffered output so re-mounting the renderer can replay history.
  getScrollback(sessionId: string): string {
    return this.scrollback.get(sessionId) ?? ''
  }

  isAlive(sessionId: string): boolean {
    return this.ptys.has(sessionId)
  }

  kill(sessionId: string): void {
    try { this.ptys.get(sessionId)?.kill() } catch {}
    this.ptys.delete(sessionId)
    this.scrollback.delete(sessionId)
  }

  killAll(): void {
    for (const id of [...this.ptys.keys()]) this.kill(id)
  }
}
