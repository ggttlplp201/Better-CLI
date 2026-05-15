import React, { useState } from 'react'
import type { ToolCall } from '../../../shared/types'

type Props = {
  toolCalls: ToolCall[]
}

function getToolType(name: string): 'file' | 'terminal' {
  const lower = name.toLowerCase()
  if (lower.includes('bash') || lower.includes('exec') || lower.includes('terminal') || lower.includes('command')) {
    return 'terminal'
  }
  return 'file'
}

function getToolTitle(tc: ToolCall): string {
  const name = tc.name.toLowerCase()
  const input = tc.input as Record<string, unknown>

  if (name.includes('read') || name.includes('view')) {
    const p = String(input.path ?? input.file_path ?? input.filePath ?? '')
    if (p) {
      const parts = p.split('/').filter(Boolean)
      return `Read ${parts.slice(-2).join('/')}`
    }
    return `Read`
  }
  if (name.includes('bash') || name.includes('exec')) {
    const cmd = String(input.command ?? input.cmd ?? '')
    return cmd ? cmd.slice(0, 50) : tc.name
  }
  if (name.includes('write') || name.includes('edit') || name.includes('create')) {
    const p = String(input.path ?? input.file_path ?? input.filePath ?? '')
    if (p) return `Edit ${p.split('/').pop()}`
    return `Edit`
  }
  return tc.name
}

function getFirstInputValue(input: unknown): string {
  if (!input || typeof input !== 'object') return ''
  const vals = Object.values(input as Record<string, unknown>)
  const first = vals.find(v => typeof v === 'string')
  return first ? String(first).slice(0, 60) : ''
}

function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="9" height="14" rx="1.5" stroke="#9ca3af" strokeWidth="1.25"/>
      <path d="M11 1l3 3" stroke="#9ca3af" strokeWidth="1.25" strokeLinecap="round"/>
      <path d="M11 1v3h3" stroke="#9ca3af" strokeWidth="1.25" strokeLinejoin="round"/>
      <path d="M5 6h6M5 9h4" stroke="#9ca3af" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

function TerminalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="12" rx="2" stroke="#9ca3af" strokeWidth="1.25"/>
      <path d="M4 6l3 2.5L4 11" stroke="#9ca3af" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 11h3" stroke="#9ca3af" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

function StatusBadge({ status }: { status: ToolCall['status'] }) {
  if (status === 'running') {
    return (
      <span className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin inline-block" />
    )
  }
  if (status === 'success') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill="#16a34a" fillOpacity="0.15" stroke="#16a34a" strokeWidth="1.25"/>
        <path d="M4.5 7l2 2 3-3" stroke="#16a34a" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (status === 'error') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill="#dc2626" fillOpacity="0.1" stroke="#dc2626" strokeWidth="1.25"/>
        <path d="M5 5l4 4M9 5l-4 4" stroke="#dc2626" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    )
  }
  return (
    <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
  )
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
    <aside className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-bold text-gray-900">Tool Calls</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2 px-3">
        {toolCalls.length === 0 && (
          <p className="text-xs text-gray-400 px-2 py-4 text-center">No tools used yet</p>
        )}
        {toolCalls.map(tc => {
          const type = getToolType(tc.name)
          const cardClass = tc.status === 'success'
            ? 'bg-green-50 border-green-100'
            : tc.status === 'running'
            ? 'bg-indigo-50 border-indigo-100'
            : tc.status === 'error'
            ? 'bg-red-50 border-red-100'
            : 'bg-gray-50 border-gray-200'

          return (
            <div
              key={tc.id}
              className={`rounded-xl border p-3.5 cursor-pointer ${cardClass}`}
              onClick={() => toggle(tc.id)}
            >
              {/* Top row: icon + name badge + status */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  {type === 'terminal' ? <TerminalIcon /> : <FileIcon />}
                </div>
                <span className="text-xs font-mono text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5 truncate max-w-[110px]">
                  {tc.name}
                </span>
                <div className="ml-auto flex-shrink-0">
                  <StatusBadge status={tc.status} />
                </div>
              </div>

              {/* Title row */}
              <div className="text-xs font-semibold text-gray-900 truncate mb-0.5">
                {getToolTitle(tc)}
              </div>

              {/* Detail row */}
              <div className="text-xs font-mono text-gray-400 truncate">
                {getFirstInputValue(tc.input)}
              </div>

              {/* Timing */}
              {tc.endedAt && (
                <div className="text-xs text-gray-400 mt-1">
                  {tc.endedAt - tc.startedAt}ms
                </div>
              )}

              {/* Expanded detail */}
              {expanded.has(tc.id) && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 break-all whitespace-pre-wrap font-mono">
                    {JSON.stringify(tc.input, null, 2)}
                  </div>
                  {tc.result && (
                    <>
                      <div className="text-xs text-gray-500 mt-1.5 font-semibold">Result:</div>
                      <div className="text-xs text-gray-400 font-mono truncate">{tc.result.slice(0, 200)}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {toolCalls.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
          {toolCalls.length} calls · {totalMs}ms
        </div>
      )}
    </aside>
  )
}
