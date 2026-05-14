import React, { useState } from 'react'
import type { ToolCall } from '../../../shared/types'

type Props = {
  toolCalls: ToolCall[]
}

export function ToolPanel({ toolCalls }: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const totalMs = toolCalls
    .filter(t => t.endedAt)
    .reduce((sum, t) => sum + (t.endedAt! - t.startedAt), 0)

  return (
    <aside className="w-44 flex-shrink-0 bg-panel border-l border-border flex flex-col">
      <div className="px-3 py-3 border-b border-border">
        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Tool Calls</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1 flex flex-col gap-1 px-1">
        {toolCalls.length === 0 && (
          <p className="text-xs text-gray-600 px-2 py-4 text-center">No tools used yet</p>
        )}
        {toolCalls.map(tc => (
          <div
            key={tc.id}
            className={`rounded border-l-2 text-xs cursor-pointer transition-colors ${
              tc.status === 'success'
                ? 'border-tool bg-tool/5 hover:bg-tool/10'
                : tc.status === 'error'
                ? 'border-danger bg-danger/5 hover:bg-danger/10'
                : 'border-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10'
            }`}
            onClick={() => toggle(tc.id)}
          >
            <div className="px-2 py-1.5">
              <div className={`font-medium ${
                tc.status === 'success' ? 'text-tool' :
                tc.status === 'error' ? 'text-danger' : 'text-yellow-400'
              }`}>
                {tc.status === 'running' ? '⟳' : tc.status === 'success' ? '✓' : '✗'} {tc.name}
              </div>
              <div className="text-gray-500 truncate">
                {Object.entries(tc.input)[0]?.[1] as string ?? ''}
              </div>
              {tc.endedAt && (
                <div className="text-gray-600">{tc.endedAt - tc.startedAt}ms</div>
              )}
            </div>
            {expanded.has(tc.id) && (
              <div className="px-2 pb-2 border-t border-border/50 mt-1 pt-1">
                <div className="text-gray-500 break-all whitespace-pre-wrap">
                  {JSON.stringify(tc.input, null, 2)}
                </div>
                {tc.result && (
                  <>
                    <div className="text-gray-600 mt-1 font-medium">Result:</div>
                    <div className="text-gray-500 truncate">{tc.result.slice(0, 200)}</div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {toolCalls.length > 0 && (
        <div className="px-3 py-2 border-t border-border text-xs text-gray-600">
          {toolCalls.length} calls · {totalMs}ms
        </div>
      )}
    </aside>
  )
}
