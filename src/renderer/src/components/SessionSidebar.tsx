import React from 'react'
import type { Session } from '../../../shared/types'

type Props = {
  sessions: Session[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export function SessionSidebar({ sessions, activeId, onSelect, onNew }: Props): React.JSX.Element {
  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <aside className="w-44 flex-shrink-0 bg-panel border-r border-border flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Sessions</span>
        <button
          onClick={onNew}
          className="text-accent hover:text-white transition-colors text-lg leading-none"
          title="New session"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {sorted.length === 0 && (
          <p className="text-xs text-gray-600 px-3 py-4 text-center">
            No sessions yet.{'\n'}Click + to start.
          </p>
        )}
        {sorted.map(session => (
          <button
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`w-full text-left px-3 py-2 rounded mx-1 transition-colors ${
              session.id === activeId
                ? 'bg-border text-white border-l-2 border-accent'
                : 'text-gray-400 hover:text-white hover:bg-border/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {session.status === 'active' && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              )}
              {session.status === 'loading' && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0 animate-pulse" />
              )}
              {session.status === 'inactive' && (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0" />
              )}
              <span className="text-xs truncate">{session.name}</span>
            </div>
            <div className="text-xs text-gray-600 mt-0.5 pl-3">
              {new Date(session.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
