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

  const handleSend = (text: string) => {
    if (!activeId) return
    if (activeSession?.status === 'inactive') {
      resumeSession(activeId)
    }
    sendMessage(text)
  }

  const handleStop = () => {
    stopSession()
  }

  return (
    <div className="flex h-screen bg-surface text-gray-200 overflow-hidden">
      <SessionSidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={createSession}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <ChatArea
          messages={activeSession?.messages ?? []}
          toolCalls={activeSession?.toolCalls ?? []}
        />
        <InputBar
          status={activeSession?.status ?? 'inactive'}
          onSend={handleSend}
          onStop={handleStop}
        />
      </div>
      <ToolPanel toolCalls={activeSession?.toolCalls ?? []} />
    </div>
  )
}
