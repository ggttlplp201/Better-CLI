import React, { useState, useCallback } from 'react'
import { useSession } from './hooks/useSession'
import { SessionSidebar } from './components/SessionSidebar'
import { ChatArea } from './components/ChatArea'
import { ToolPanel } from './components/ToolPanel'
import { InputBar } from './components/InputBar'
import { TerminalView } from './components/TerminalView'
import type { PermissionMode } from '../../shared/types'

const PERMISSION_LABELS: Record<PermissionMode, string> = {
  acceptEdits: 'accept edits',
  auto: 'auto-approve all',
  bypassPermissions: 'bypass all',
  default: 'ask (interactive)',
  dontAsk: "don't ask",
}

type View = 'chat' | 'terminal'

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

  // view is per-app; switching sessions resets to chat
  const [view, setView] = useState<View>('chat')

  const handleSelect = useCallback((id: string) => {
    const session = sessions.find(s => s.id === id)
    if (!session) return
    setView('chat')
    if (session.status === 'inactive') resumeSession(id)
    else setActiveId(id)
  }, [sessions, resumeSession, setActiveId])

  return (
    <div className="flex flex-col h-screen bg-surface text-gray-200 overflow-hidden">
      {/* Title bar: real layout space so content doesn't slide under traffic lights */}
      <div className="h-8 flex-shrink-0 [-webkit-app-region:drag] bg-panel border-b border-border/30" />

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
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-panel/50 flex-shrink-0 min-w-0">
                <span className="text-sm font-medium text-gray-300 truncate">{activeSession.name}</span>
                <span className="text-xs text-gray-600 truncate hidden sm:block">{activeSession.workingDir}</span>

                {/* Chat / Terminal toggle */}
                <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                  <div className="flex rounded border border-border/60 overflow-hidden">
                    <button
                      onClick={() => setView('chat')}
                      className={`text-xs px-2.5 py-1 transition-colors ${
                        view === 'chat' ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-border/40'
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setView('terminal')}
                      className={`text-xs px-2.5 py-1 border-l border-border/60 transition-colors ${
                        view === 'terminal' ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-border/40'
                      }`}
                    >
                      Terminal
                    </button>
                  </div>

                  {/* Permission mode — only relevant in Chat mode */}
                  {view === 'chat' && (
                    <select
                      value={activeSession.permissionMode}
                      onChange={e => setPermissionMode(activeSession.id, e.target.value as PermissionMode)}
                      className="ml-1 text-xs text-gray-400 bg-panel border border-border/60 rounded px-1.5 py-0.5 focus:outline-none focus:border-accent/60 cursor-pointer"
                    >
                      {(Object.keys(PERMISSION_LABELS) as PermissionMode[]).map(mode => (
                        <option key={mode} value={mode}>{PERMISSION_LABELS[mode]}</option>
                      ))}
                    </select>
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
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-600">
              <p className="text-lg">No session selected</p>
              <button
                onClick={createSession}
                className="px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80 transition-colors"
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
