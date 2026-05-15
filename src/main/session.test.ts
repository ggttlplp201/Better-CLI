import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionManager } from './session'
import type { ClaudeEvent } from '../shared/types'

let dir: string | null = null

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = null
})

describe('SessionManager persistence', () => {
  it('loads sessions created by an earlier manager instance', () => {
    dir = mkdtempSync(join(tmpdir(), 'claude-ui-'))
    const storagePath = join(dir, 'sessions.json')

    const first = new SessionManager(storagePath)
    const created = first.create('/tmp/project', 'project')

    const second = new SessionManager(storagePath)
    expect(second.list()).toEqual([created])
  })

  it('defaults permissionMode to acceptEdits on old sessions without the field', () => {
    dir = mkdtempSync(join(tmpdir(), 'claude-ui-'))
    const storagePath = join(dir, 'sessions.json')

    // Write a session file that predates permissionMode
    writeFileSync(storagePath, JSON.stringify({
      sessions: [{
        id: 'old-id', name: 'old', workingDir: '/tmp',
        status: 'active', messages: [], toolCalls: [], createdAt: 0,
        // no permissionMode field
      }],
    }))

    const manager = new SessionManager(storagePath)
    expect(manager.list()[0].permissionMode).toBe('acceptEdits')
  })
})

describe('SessionManager permission mode', () => {
  it('defaults new sessions to acceptEdits', () => {
    const manager = new SessionManager()
    const session = manager.create('/tmp', 'test')
    expect(session.permissionMode).toBe('acceptEdits')
  })

  it('setPermissionMode updates the session', () => {
    const manager = new SessionManager()
    const session = manager.create('/tmp', 'test')
    manager.setPermissionMode(session.id, 'auto')
    expect(manager.list()[0].permissionMode).toBe('auto')
  })

  it('setPermissionMode persists across instances', () => {
    dir = mkdtempSync(join(tmpdir(), 'claude-ui-'))
    const storagePath = join(dir, 'sessions.json')

    const first = new SessionManager(storagePath)
    const session = first.create('/tmp', 'test')
    first.setPermissionMode(session.id, 'dontAsk')

    const second = new SessionManager(storagePath)
    expect(second.list()[0].permissionMode).toBe('dontAsk')
  })
})

describe('SessionManager streaming', () => {
  const assistantEvent = (text: string): ClaudeEvent => ({
    type: 'assistant',
    message: { content: [{ type: 'text', text }] },
    session_id: 'claude-123',
  })

  it('multiple partial assistant events update one message in-place', () => {
    const manager = new SessionManager()
    const session = manager.create('/tmp', 'test')
    const state = (manager as unknown as { sessions: Map<string, unknown> }).sessions.get(session.id)
    const applyEvent = (manager as unknown as { applyEvent: (s: unknown, e: ClaudeEvent) => void }).applyEvent.bind(manager)

    applyEvent(state, assistantEvent('Hel'))
    applyEvent(state, assistantEvent('Hello'))
    applyEvent(state, assistantEvent('Hello world'))

    const msgs = manager.list()[0].messages
    expect(msgs).toHaveLength(1)
    expect(msgs[0].text).toBe('Hello world')
  })

  it('does not duplicate tool calls from repeated partial events', () => {
    const manager = new SessionManager()
    const session = manager.create('/tmp', 'test')
    const state = (manager as unknown as { sessions: Map<string, unknown> }).sessions.get(session.id)
    const applyEvent = (manager as unknown as { applyEvent: (s: unknown, e: ClaudeEvent) => void }).applyEvent.bind(manager)

    const eventWithTool: ClaudeEvent = {
      type: 'assistant',
      session_id: 'x',
      message: {
        content: [
          { type: 'text', text: 'Running...' },
          { type: 'tool_use', id: 'tool-1', name: 'Bash', input: { command: 'ls' } },
        ],
      },
    }

    // Simulate same event arriving twice (as partial + final)
    applyEvent(state, eventWithTool)
    applyEvent(state, eventWithTool)

    const result = manager.list()[0]
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].id).toBe('tool-1')
  })

  it('a new send() resets streaming so it starts a fresh message', () => {
    const manager = new SessionManager()
    const session = manager.create('/tmp', 'test')
    const state = (manager as unknown as { sessions: Map<string, unknown> }).sessions.get(session.id)
    const applyEvent = (manager as unknown as { applyEvent: (s: unknown, e: ClaudeEvent) => void }).applyEvent.bind(manager)

    // First turn
    applyEvent(state, assistantEvent('First response'))
    // Reset streaming (simulates what send() does before spawning)
    ;(state as { streamingMsgId?: string }).streamingMsgId = undefined

    // Second turn
    applyEvent(state, assistantEvent('Second response'))

    const msgs = manager.list()[0].messages
    expect(msgs).toHaveLength(2)
    expect(msgs[0].text).toBe('First response')
    expect(msgs[1].text).toBe('Second response')
  })
})
