import React, { useState, useCallback } from 'react'
import { useSession } from './hooks/useSession'
import { SessionSidebar } from './components/SessionSidebar'
import { ChatArea } from './components/ChatArea'
import { ToolPanel } from './components/ToolPanel'
import { InputBar } from './components/InputBar'
import { TerminalView } from './components/TerminalView'
import type { PermissionMode } from '../../shared/types'

const PERMISSION_LABELS: Record<PermissionMode, string> = {
  acceptEdits: 'Accept Edits',
  auto: 'Auto Allow',
  bypassPermissions: 'Bypass All',
  default: 'Ask',
  dontAsk: "Don't Ask",
}

type View = 'chat' | 'terminal'

export function shortenPath(p: string): string {
  return p.replace(/^\/Users\/[^/]+\//, '~/')
}

export function App(): React.JSX.Element {
  const {
    sessions,
    activeSession,
    activeId,
    setActiveId,
    createSession,
    sendMessage,
    stopSession,
    resumeSession,
    setPermissionMode,
    deleteSession,
  } = useSession()

  const [view, setView] = useState<View>('chat')

  const handleSelect = useCallback((id: string) => {
    const session = sessions.find(s => s.id === id)
    if (!session) return
    setView('chat')
    if (session.status === 'inactive') resumeSession(id)
    else setActiveId(id)
  }, [sessions, resumeSession, setActiveId])

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 overflow-hidden">
      {/* Title bar: real layout space so content doesn't slide under traffic lights */}
      <div className="h-8 flex-shrink-0 [-webkit-app-region:drag] bg-white border-b border-gray-100" />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SessionSidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={handleSelect}
          onNew={createSession}
          onDelete={deleteSession}
        />

        <main className="flex flex-col flex-1 min-w-0">
          {activeSession ? (
            <>
              {/* Session header */}
              <div className="flex items-center gap-3 bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0 min-w-0">
                {/* Left: session name + path */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm font-semibold text-gray-900 truncate">{activeSession.name}</span>
                  <span className="text-gray-400 flex-shrink-0"><FolderIcon /></span>
                  <span className="text-xs text-gray-400 truncate hidden sm:block">
                    {shortenPath(activeSession.workingDir)}
                  </span>
                </div>

                {/* Right: Chat/Terminal toggle + permission select */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex rounded-full border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setView('chat')}
                      className={`text-xs px-3 py-1 transition-colors rounded-full ${
                        view === 'chat'
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-500 bg-white hover:text-gray-700'
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setView('terminal')}
                      className={`text-xs px-3 py-1 transition-colors rounded-full ${
                        view === 'terminal'
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-500 bg-white hover:text-gray-700'
                      }`}
                    >
                      Terminal
                    </button>
                  </div>

                  {view === 'chat' && (
                    <div className="relative">
                      <select
                        value={activeSession.permissionMode}
                        onChange={e => setPermissionMode(activeSession.id, e.target.value as PermissionMode)}
                        className="text-xs text-gray-700 bg-white border border-gray-300 rounded-full pl-3 pr-7 py-1 appearance-none cursor-pointer focus:outline-none focus:border-gray-400"
                      >
                        {(Object.keys(PERMISSION_LABELS) as PermissionMode[]).map(mode => (
                          <option key={mode} value={mode}>{PERMISSION_LABELS[mode]}</option>
                        ))}
                      </select>
                      <ChevronIcon />
                    </div>
                  )}
                </div>
              </div>

              {/* Chat view */}
              {view === 'chat' && (
                <>
                  <ChatArea messages={activeSession.messages} toolCalls={activeSession.toolCalls} />
                  <InputBar status={activeSession.status} onSend={sendMessage} onStop={stopSession} />
                </>
              )}

              {/* Terminal view — kept mounted once activated so the PTY persists across view switches */}
              {view === 'terminal' && (
                <TerminalView
                  key={activeSession.id}
                  sessionId={activeSession.id}
                  cwd={activeSession.workingDir}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
              <p className="text-lg">No session selected</p>
              <button
                onClick={createSession}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
              >
                New Session
              </button>
            </div>
          )}
        </main>

        {activeSession && view === 'chat' && <ToolPanel toolCalls={activeSession.toolCalls} />}
      </div>
    </div>
  )
}

function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 12.5V5a1 1 0 011-1h3.586a1 1 0 01.707.293L8.414 5.5H13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  )
}

function ChevronIcon() {
  return (
    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2.5 3.5L5 6L7.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}
