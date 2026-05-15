import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { App } from './App'

describe('App initial layout', () => {
  it('renders the no-session state without active-session panels', () => {
    const html = renderToString(<App />)

    expect(html).toContain('No session selected')
    expect(html).toContain('New Session')
    expect(html).not.toContain('Tool Calls')
    expect(html).not.toContain('Message Claude')
    expect(html).not.toContain('Start a conversation')
  })
})
