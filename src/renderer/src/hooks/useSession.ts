import { useState, useEffect, useCallback, useRef } from 'react'
import type { Session, Message, ToolCall, ClaudeEvent, SessionStatus, PermissionMode } from '../../../shared/types'

type SessionStore = Record<string, Session>

export function useSession() {
  const [sessions, setSessions] = useState<SessionStore>({})
  const [activeId, setActiveId] = useState<string | null>(null)

  // Tracks the ID of the message currently being streamed per session.
  // Stored in a ref so streaming updates don't trigger extra renders.
  const streamingRef = useRef<Record<string, string | undefined>>({})

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
      setSessions(prev => {
        const { nextStore, nextStreamingId } = applyEvent(
          prev, sessionId, event, streamingRef.current[sessionId]
        )
        streamingRef.current[sessionId] = nextStreamingId
        return nextStore
      })
    })

    const offStatus = window.api.onStatus((sessionId, status) => {
      // When a turn ends, clear the streaming tracker for that session
      if (status !== 'loading') {
        streamingRef.current[sessionId] = undefined
      }
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
    // Optimistically add user message for responsiveness
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

  const setPermissionMode = useCallback((sessionId: string, mode: PermissionMode) => {
    window.api.setPermissionMode(sessionId, mode)
    // Optimistic update so the UI reflects the change immediately
    setSessions(prev => {
      const session = prev[sessionId]
      if (!session) return prev
      return { ...prev, [sessionId]: { ...session, permissionMode: mode } }
    })
  }, [])

  const deleteSession = useCallback((sessionId: string) => {
    window.api.deleteSession(sessionId)
    setSessions(prev => {
      const next = { ...prev }
      delete next[sessionId]
      return next
    })
    setActiveId(prev => {
      if (prev !== sessionId) return prev
      const remaining = Object.keys(sessions).filter(id => id !== sessionId)
      return remaining[0] ?? null
    })
  }, [sessions])

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
    setPermissionMode,
    deleteSession,
  }
}

function applyEvent(
  store: SessionStore,
  sessionId: string,
  event: ClaudeEvent,
  streamingMsgId: string | undefined
): { nextStore: SessionStore; nextStreamingId: string | undefined } {
  const session = store[sessionId]
  if (!session) return { nextStore: store, nextStreamingId: streamingMsgId }

  if (event.type === 'assistant') {
    const textBlock = event.message.content.find(b => b.type === 'text')
    const toolBlocks = event.message.content.filter(b => b.type === 'tool_use')

    const newToolCalls: ToolCall[] = toolBlocks
      .filter((b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use')
      // Deduplicate: partial events may repeat tool blocks already received
      .filter(b => !session.toolCalls.some(tc => tc.id === b.id))
      .map(b => ({
        id: b.id,
        name: b.name,
        input: b.input,
        status: 'running' as const,
        startedAt: Date.now(),
      }))

    const toolCalls = newToolCalls.length > 0
      ? [...session.toolCalls, ...newToolCalls]
      : session.toolCalls

    if (textBlock?.type === 'text') {
      let messages: Message[]
      let nextStreamingId: string | undefined

      if (streamingMsgId) {
        // Partial update: overwrite the in-progress message text
        messages = session.messages.map(m =>
          m.id === streamingMsgId
            ? { ...m, text: textBlock.text, toolCallIds: newToolCalls.length > 0 ? [...m.toolCallIds, ...newToolCalls.map(t => t.id)] : m.toolCallIds }
            : m
        )
        nextStreamingId = streamingMsgId
      } else {
        // First text in this turn: create the message
        const newMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: textBlock.text,
          toolCallIds: newToolCalls.map(t => t.id),
          timestamp: Date.now(),
        }
        messages = [...session.messages, newMsg]
        nextStreamingId = newMsg.id
      }

      return {
        nextStore: { ...store, [sessionId]: { ...session, messages, toolCalls } },
        nextStreamingId,
      }
    }

    // Tool-use-only event (no text block)
    if (newToolCalls.length === 0) {
      return { nextStore: store, nextStreamingId: streamingMsgId }
    }
    return {
      nextStore: { ...store, [sessionId]: { ...session, toolCalls } },
      nextStreamingId: streamingMsgId,
    }
  }

  if (event.type === 'user') {
    const content = (event.message.content ?? []) as Array<{ type: string; tool_use_id?: string; content?: string; is_error?: boolean }>
    const results = content.filter(b => b.type === 'tool_result')
    if (!results.length) return { nextStore: store, nextStreamingId: undefined }
    const updatedToolCalls = session.toolCalls.map(tc => {
      const result = results.find(r => r.tool_use_id === tc.id)
      if (!result) return tc
      const status = result.is_error ? 'error' as const : 'success' as const
      return { ...tc, result: result.content ?? '', status, endedAt: Date.now() }
    })
    return {
      nextStore: { ...store, [sessionId]: { ...session, toolCalls: updatedToolCalls } },
      nextStreamingId: undefined,
    }
  }

  if (event.type === 'error') {
    const errMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: `Warning: ${event.error.message}`,
      toolCallIds: [],
      timestamp: Date.now(),
    }
    return {
      nextStore: { ...store, [sessionId]: { ...session, messages: [...session.messages, errMsg] } },
      nextStreamingId: undefined,
    }
  }

  if (event.type === 'canceled') {
    const msg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: event.message,
      toolCallIds: [],
      timestamp: Date.now(),
    }
    const toolCalls = session.toolCalls.map(tc =>
      tc.status === 'running' ? { ...tc, status: 'canceled' as const, endedAt: Date.now() } : tc
    )
    return {
      nextStore: { ...store, [sessionId]: { ...session, messages: [...session.messages, msg], toolCalls } },
      nextStreamingId: undefined,
    }
  }

  return { nextStore: store, nextStreamingId: streamingMsgId }
}

function applyStatus(store: SessionStore, sessionId: string, status: SessionStatus): SessionStore {
  const session = store[sessionId]
  if (!session) return store
  return { ...store, [sessionId]: { ...session, status } }
}
