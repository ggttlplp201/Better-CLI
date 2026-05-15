import React from 'react'
import type { Session } from '../../../shared/types'
import { shortenPath } from '../App'

type Props = {
  sessions: Session[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export function SessionSidebar({ sessions, activeId, onSelect, onNew, onDelete }: Props): React.JSX.Element {
  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 pl-16">
        <span className="text-sm font-semibold text-gray-900">Sessions</span>
        <button
          onClick={onNew}
          className="text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
          title="New session"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {sorted.length === 0 && (
          <p className="text-xs text-gray-400 px-4 py-4 text-center">
            No sessions yet.{'\n'}Click + to start.
          </p>
        )}
        {sorted.map(session => (
          <div key={session.id} className="group relative">
            <button
              onClick={() => onSelect(session.id)}
              className={`w-full text-left px-4 py-3 pr-8 transition-colors ${
                session.id === activeId
                  ? 'bg-gray-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {session.status === 'active' && (
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                )}
                {session.status === 'loading' && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0 animate-pulse" />
                )}
                {session.status === 'inactive' && (
                  <span className="w-2 h-2 rounded-full border border-gray-300 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-900 truncate">{session.name}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5 pl-[18px] truncate">
                {shortenPath(session.workingDir)}
              </div>
            </button>

            {/* Delete button */}
            <button
              onClick={e => { e.stopPropagation(); onDelete(session.id) }}
              title="Delete session"
              className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors text-gray-300 hover:text-red-400 w-5 h-5 flex items-center justify-center rounded text-base"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
