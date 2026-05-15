import React, { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

type Props = {
  sessionId: string
  cwd: string
  // Called when the PTY exits so the parent can offer a restart button
  onExit?: (code: number) => void
}

export function TerminalView({ sessionId, cwd, onExit }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const offDataRef = useRef<(() => void) | null>(null)
  const offExitRef = useRef<(() => void) | null>(null)

  const doRestart = useCallback(async () => {
    const term = termRef.current
    if (!term) return
    term.write('\r\n\x1b[90m[Restarting…]\x1b[0m\r\n')
    await window.api.ptySpawn(sessionId, cwd, term.cols, term.rows)
  }, [sessionId, cwd])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 5000,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#4ec9b0',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4fc1ff',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#f44747',
        brightGreen: '#4ec9b0',
        brightYellow: '#dcdcaa',
        brightBlue: '#569cd6',
        brightMagenta: '#c586c0',
        brightCyan: '#4fc1ff',
        brightWhite: '#ffffff',
      },
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    // Global PTY data listener — filter by sessionId
    const offData = window.api.onPtyData((sid, data) => {
      if (sid === sessionId) term.write(data)
    })
    offDataRef.current = offData

    const offExit = window.api.onPtyExit((sid, code) => {
      if (sid !== sessionId) return
      term.write(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m\r\n`)
      onExit?.(code)
    })
    offExitRef.current = offExit

    // Forward keystrokes to PTY
    term.onData(data => window.api.ptyInput(sessionId, data))

    // Resize observer: refit terminal when container size changes
    const observer = new ResizeObserver(() => {
      fit.fit()
      window.api.ptyResize(sessionId, term.cols, term.rows)
    })
    observer.observe(containerRef.current)

    // Spawn the PTY (or replay scrollback if already running)
    const init = async () => {
      const alive = await window.api.ptyIsAlive(sessionId)
      if (alive) {
        // Replay buffered output so the tab looks continuous after remount
        const buf = await window.api.ptyScrollback(sessionId)
        if (buf) term.write(buf)
      } else {
        await window.api.ptySpawn(sessionId, cwd, term.cols, term.rows)
      }
    }
    init()

    return () => {
      offData()
      offExit()
      observer.disconnect()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [sessionId, cwd, onExit])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden"
        style={{ padding: '6px 4px' }}
      />
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-panel/50 flex-shrink-0">
        <span className="text-xs text-gray-600">{cwd}</span>
        <button
          onClick={doRestart}
          className="text-xs text-gray-600 hover:text-gray-300 transition-colors px-2 py-0.5 rounded border border-border/50 hover:border-border"
        >
          Restart
        </button>
      </div>
    </div>
  )
}
