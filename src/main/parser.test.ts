import { describe, it, expect } from 'vitest'
import { parseLine, parseStream } from './parser'

describe('parseLine', () => {
  it('returns null for empty string', () => {
    expect(parseLine('')).toBeNull()
  })

  it('returns null for whitespace', () => {
    expect(parseLine('   ')).toBeNull()
  })

  it('returns null for invalid json', () => {
    expect(parseLine('not json')).toBeNull()
  })

  it('parses a valid assistant event', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Hello' }] },
      session_id: 'abc123'
    })
    const result = parseLine(line)
    expect(result).not.toBeNull()
    expect(result?.type).toBe('assistant')
  })

  it('parses a result event', () => {
    const line = JSON.stringify({ type: 'result', subtype: 'success', result: 'done', session_id: 'abc' })
    const result = parseLine(line)
    expect(result?.type).toBe('result')
  })
})

describe('parseStream', () => {
  it('returns empty events and empty remaining for empty input', () => {
    const { events, remaining } = parseStream('', '')
    expect(events).toHaveLength(0)
    expect(remaining).toBe('')
  })

  it('handles a single complete line', () => {
    const line = JSON.stringify({ type: 'result', subtype: 'success', result: '', session_id: 'x' }) + '\n'
    const { events, remaining } = parseStream(line, '')
    expect(events).toHaveLength(1)
    expect(remaining).toBe('')
  })

  it('buffers incomplete lines', () => {
    const partial = '{"type":"result"'
    const { events, remaining } = parseStream(partial, '')
    expect(events).toHaveLength(0)
    expect(remaining).toBe(partial)
  })

  it('completes a buffered line when rest arrives', () => {
    const start = '{"type":"result"'
    const end = ',"subtype":"success","result":"","session_id":"x"}\n'
    const { events, remaining } = parseStream(end, start)
    expect(events).toHaveLength(1)
    expect(remaining).toBe('')
  })

  it('handles multiple lines in one chunk', () => {
    const a = JSON.stringify({ type: 'result', subtype: 'success', result: '', session_id: 'x' })
    const b = JSON.stringify({ type: 'error', error: { message: 'oops' } })
    const { events } = parseStream(a + '\n' + b + '\n', '')
    expect(events).toHaveLength(2)
  })

  it('skips non-json lines silently', () => {
    const { events } = parseStream('not json\n', '')
    expect(events).toHaveLength(0)
  })
})
