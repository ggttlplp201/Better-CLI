import React from 'react'
import { useSession } from './hooks/useSession'
import { SessionSidebar } from './components/SessionSidebar'
import { ChatArea } from './components/ChatArea'
import { ToolPanel } from './components/ToolPanel'
import { InputBar } from './components/InputBar'

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
  } = useSession()

  const handleSelect = (id: string) => {
    const session = sessions.find(s => s.id === id)
    if (!session) return
    if (session.status === 'inactive') resumeSession(id)
    else setActiveId(id)
  }

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
        />

        <main className="flex flex-col flex-1 min-w-0">
          {activeSession ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-panel/50 flex-shrink-0">
                <span className="text-sm font-medium text-gray-300 truncate">{activeSession.name}</span>
                <span className="text-xs text-gray-600 truncate">{activeSession.workingDir}</span>
              </div>
              <ChatArea messages={activeSession.messages} toolCalls={activeSession.toolCalls} />
              <InputBar
                status={activeSession.status}
                onSend={sendMessage}
                onStop={stopSession}
              />
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

        {activeSession && <ToolPanel toolCalls={activeSession.toolCalls} />}
      </div>
    </div>
  )
}
