import type { ClaudeEvent } from '../shared/types'

export function parseLine(line: string): ClaudeEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as ClaudeEvent
  } catch {
    return null
  }
}

export function parseStream(
  chunk: string,
  buffer: string
): { events: ClaudeEvent[]; remaining: string } {
  const combined = buffer + chunk
  const lines = combined.split('\n')
  const remaining = lines.pop() ?? ''
  const events: ClaudeEvent[] = []
  for (const line of lines) {
    const event = parseLine(line)
    if (event !== null) events.push(event)
  }
  return { events, remaining }
}
