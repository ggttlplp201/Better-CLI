import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import type { SessionStatus } from '../../../shared/types'

type Props = {
  status: SessionStatus
  onSend: (text: string) => void
  onStop: () => void
}

const COMMANDS = [
  // Built-in Claude Code (work in --print mode)
  { name: '/help',          desc: 'Show available commands and help' },
  { name: '/compact',       desc: 'Compact conversation with a summary' },
  { name: '/config',        desc: 'Open or edit Claude Code configuration' },
  { name: '/cost',          desc: 'Show token usage and cost for this session' },
  { name: '/debug',         desc: 'Toggle debug mode' },
  { name: '/init',          desc: 'Initialize Claude Code in current directory' },
  { name: '/model',         desc: 'Switch the AI model' },
  { name: '/pr-comments',   desc: 'View pull request comments' },
  { name: '/release-notes', desc: 'View Claude Code release notes' },
  { name: '/review',        desc: 'Request a code review' },
  { name: '/status',        desc: 'Show current session status' },
  // Codex plugin
  { name: '/codex:review',             desc: 'Run a Codex code review against local git state' },
  { name: '/codex:adversarial-review', desc: 'Run a Codex review that challenges your approach' },
  { name: '/codex:rescue',             desc: 'Delegate investigation or fix to Codex rescue agent' },
  { name: '/codex:status',             desc: 'Show active and recent Codex jobs' },
  { name: '/codex:result',             desc: 'Show stored output for a finished Codex job' },
  { name: '/codex:cancel',             desc: 'Cancel an active background Codex job' },
  { name: '/codex:setup',              desc: 'Check Codex CLI readiness and toggle review gate' },
  // Ruflo plugin
  { name: '/ruflo-core:ruflo-status',       desc: 'Show Ruflo health, MCP server status, and agents' },
  { name: '/ruflo-docs:ruflo-docs',         desc: 'Generate or update documentation for a file or project' },
  { name: '/ruflo-memory:ruflo-memory',     desc: 'Memory CRUD: store, search, retrieve, consolidate' },
  { name: '/ruflo-memory:recall',           desc: 'Quick semantic recall across all memory namespaces' },
  { name: '/ruflo-testgen:testgen',         desc: 'Generate tests using coverage analysis and TDD patterns' },
  { name: '/ruflo-security-audit:audit',    desc: 'Run a security audit on the project' },
  { name: '/ruflo-swarm:swarm',             desc: 'Initialize, monitor, and manage multi-agent swarms' },
  { name: '/ruflo-swarm:watch',             desc: 'Live-stream swarm events and agent activity' },
  { name: '/ruflo-loop-workers:ruflo-loop', desc: 'Start a background worker on a recurring schedule' },
  { name: '/ruflo-autopilot:autopilot',     desc: 'Enable, configure, or disable autonomous task completion' },
  { name: '/ruflo-autopilot:autopilot-status', desc: 'Quick autopilot progress summary' },
]

export function InputBar({ status, onSend, onStop }: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isLoading = status === 'loading'

  const slashMatch = text.match(/^(\/\S*)$/)
  const query = slashMatch ? slashMatch[1].toLowerCase() : null
  const suggestions = query !== null
    ? COMMANDS.filter(c => c.name.startsWith(query))
    : []
  const showPopup = suggestions.length > 0

  useEffect(() => { setSelectedIdx(0) }, [query])

  const pick = (name: string) => {
    setText(name + ' ')
    textareaRef.current?.focus()
  }

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setText('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPopup) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && suggestions.length > 0)) {
        e.preventDefault()
        pick(suggestions[selectedIdx].name)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setText('')
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="px-4 py-3 border-t border-border relative">
      {showPopup && (
        <div className="absolute bottom-full left-4 right-4 mb-1 bg-panel border border-border rounded-lg overflow-hidden shadow-lg">
          {suggestions.map((cmd, i) => (
            <button
              key={cmd.name}
              onMouseDown={e => { e.preventDefault(); pick(cmd.name) }}
              className={`w-full text-left px-3 py-2 flex items-baseline gap-3 transition-colors ${
                i === selectedIdx ? 'bg-accent/20' : 'hover:bg-border/50'
              }`}
            >
              <span className="text-sm font-mono text-accent">{cmd.name}</span>
              <span className="text-xs text-gray-500">{cmd.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 bg-panel border border-border rounded-lg p-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Claude is working...' : 'Message Claude · / for commands'}
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 resize-none outline-none min-h-[24px] max-h-40 overflow-y-auto disabled:opacity-50"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        {isLoading ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 px-3 py-1.5 text-xs bg-danger/20 text-danger border border-danger/30 rounded hover:bg-danger/30 transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="flex-shrink-0 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
      </div>
      <p className="text-xs text-gray-700 mt-1 pl-1">Enter to send · Shift+Enter for newline</p>
    </div>
  )
}
