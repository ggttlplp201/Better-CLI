import { useState, useEffect, useCallback } from 'react'
import type { Session, Message, ToolCall, ClaudeEvent, SessionStatus } from '../../../shared/types'

type SessionStore = Record<string, Session>

export function useSession() {
  const [sessions, setSessions] = useState<SessionStore>({})
  const [activeId, setActiveId] = useState<string | null>(null)

  // Load existing sessions from main process on mount
  useEffect(() => {
    window.api.listSessions().then(existing => {
      if (existing.length === 0) return
      const store: SessionStore = {}
      for (const s of existing) store[s.id] = s
      setSessions(store)
      const first = existing.find(s => s.status !== 'inactive') ?? existing[0]
      setActiveId(first.id)
    })
  }, [])

  // Register IPC listeners once
  useEffect(() => {
    const offEvent = window.api.onEvent((sessionId, event) => {
      setSessions(prev => applyEvent(prev, sessionId, event))
    })
    const offStatus = window.api.onStatus((sessionId, status) => {
      setSessions(prev => applyStatus(prev, sessionId, status))
    })
    return () => { offEvent(); offStatus() }
  }, [])

  const createSession = useCallback(async () => {
    const dir = await window.api.pickFolder()
    if (!dir) return
    const name = dir.split('/').pop() ?? 'New Session'
    const session = await window.api.createSession(dir, name)
    setSessions(prev => ({ ...prev, [session.id]: session }))
    setActiveId(session.id)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!activeId) return
    const msg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      toolCallIds: [],
      timestamp: Date.now(),
    }
    setSessions(prev => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        messages: [...prev[activeId].messages, msg],
      },
    }))
    await window.api.sendMessage(activeId, text)
  }, [activeId])

  const stopSession = useCallback(() => {
    if (activeId) window.api.stopSession(activeId)
  }, [activeId])

  const resumeSession = useCallback((sessionId: string) => {
    window.api.resumeSession(sessionId)
    setActiveId(sessionId)
  }, [])

  const activeSession = activeId ? sessions[activeId] : null

  return {
    sessions: Object.values(sessions),
    activeSession,
    activeId,
    setActiveId,
    createSession,
    sendMessage,
    stopSession,
    resumeSession,
  }
}

function applyEvent(store: SessionStore, sessionId: string, event: ClaudeEvent): SessionStore {
  const session = store[sessionId]
  if (!session) return store

  if (event.type === 'assistant') {
    const textBlock = event.message.content.find(b => b.type === 'text')
    const toolBlocks = event.message.content.filter(b => b.type === 'tool_use')

    const toolCalls: ToolCall[] = toolBlocks
      .filter((b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use')
      .map(b => ({
        id: b.id,
        name: b.name,
        input: b.input,
        status: 'running' as const,
        startedAt: Date.now(),
      }))

    const msg: Message | null = textBlock && textBlock.type === 'text'
      ? {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: textBlock.text,
          toolCallIds: toolCalls.map(t => t.id),
          timestamp: Date.now(),
        }
      : null

    return {
      ...store,
      [sessionId]: {
        ...session,
        messages: msg ? [...session.messages, msg] : session.messages,
        toolCalls: [...session.toolCalls, ...toolCalls],
      },
    }
  }

  if (event.type === 'user') {
    const content = (event.message.content ?? []) as Array<{ type: string; tool_use_id?: string; content?: string; is_error?: boolean }>
    const results = content.filter(b => b.type === 'tool_result')
    if (!results.length) return store
    const updatedToolCalls = session.toolCalls.map(tc => {
      const result = results.find(r => r.tool_use_id === tc.id)
      if (!result) return tc
      const status = result.is_error ? 'error' as const : 'success' as const
      return { ...tc, result: result.content ?? '', status, endedAt: Date.now() }
    })
    return { ...store, [sessionId]: { ...session, toolCalls: updatedToolCalls } }
  }

  if (event.type === 'error') {
    const errMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: `⚠️ ${event.error.message}`,
      toolCallIds: [],
      timestamp: Date.now(),
    }
    return { ...store, [sessionId]: { ...session, messages: [...session.messages, errMsg] } }
  }

  return store
}

function applyStatus(store: SessionStore, sessionId: string, status: SessionStatus): SessionStore {
  const session = store[sessionId]
  if (!session) return store
  return { ...store, [sessionId]: { ...session, status } }
}
