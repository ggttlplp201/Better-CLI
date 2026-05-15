import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import type { SessionStatus } from '../../../shared/types'

type Props = {
  status: SessionStatus
  onSend: (text: string) => void
  onStop: () => void
}

const COMMANDS = [
  { name: '/help',          desc: 'Show available commands and help' },
  { name: '/compact',       desc: 'Compact conversation with a summary' },
  { name: '/cost',          desc: 'Show token usage and cost for this session' },
  { name: '/init',          desc: 'Initialize Claude Code in current directory' },
  { name: '/release-notes', desc: 'View Claude Code release notes' },
  { name: '/review',        desc: 'Request a code review' },
  { name: '/status',        desc: 'Show current session status' },
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
    <div className="bg-white border-t border-gray-200 px-5 py-4 relative">
      {showPopup && (
        <div className="absolute bottom-full left-5 right-5 mb-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
          {suggestions.map((cmd, i) => (
            <button
              key={cmd.name}
              onMouseDown={e => { e.preventDefault(); pick(cmd.name) }}
              className={`w-full text-left px-3 py-2 flex items-baseline gap-3 transition-colors ${
                i === selectedIdx ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-mono text-gray-900">{cmd.name}</span>
              <span className="text-xs text-gray-500">{cmd.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className="border border-gray-300 rounded-xl px-4 py-3 bg-white flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Claude is working...' : 'Message Claude · / for commands'}
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none min-h-[24px] max-h-40 overflow-y-auto disabled:opacity-50"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        {isLoading ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 text-xs rounded-lg hover:bg-red-100 transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="flex-shrink-0 bg-gray-900 text-white px-3 py-1.5 text-xs rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">Enter to send · Shift+Enter for newline</p>
    </div>
  )
}
