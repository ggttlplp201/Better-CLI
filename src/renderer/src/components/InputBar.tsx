import React, { useState, useRef, KeyboardEvent } from 'react'
import type { SessionStatus } from '../../../shared/types'

type Props = {
  status: SessionStatus
  onSend: (text: string) => void
  onStop: () => void
}

export function InputBar({ status, onSend, onStop }: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isLoading = status === 'loading'

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setText('')
    textareaRef.current?.focus()
  }

  return (
    <div className="px-4 py-3 border-t border-border">
      <div className="flex items-end gap-2 bg-panel border border-border rounded-lg p-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Claude is working...' : 'Message Claude (Enter to send, Shift+Enter for newline)'}
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
      <p className="text-xs text-gray-700 mt-1 pl-1">Shift+Enter for newline</p>
    </div>
  )
}
