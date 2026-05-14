import React from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message, ToolCall } from '../../../shared/types'

type Props = {
  message: Message
  toolCalls: ToolCall[]
}

export function MessageBubble({ message, toolCalls }: Props): React.JSX.Element {
  const isUser = message.role === 'user'
  const relatedTools = toolCalls.filter(t => message.toolCallIds.includes(t.id))

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs flex-shrink-0 mt-1">
          C
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col gap-1.5`}>
        <div
          className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
            isUser
              ? 'bg-border text-gray-200 rounded-br-sm'
              : 'bg-blue-900/40 text-gray-200 rounded-bl-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.text}</p>
          ) : (
            <ReactMarkdown
              components={{
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-')
                  return isBlock ? (
                    <pre className="bg-black/40 rounded p-2 overflow-x-auto text-xs mt-1 mb-1">
                      <code>{children}</code>
                    </pre>
                  ) : (
                    <code className="bg-black/40 rounded px-1 text-xs">{children}</code>
                  )
                },
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              }}
            >
              {message.text}
            </ReactMarkdown>
          )}
        </div>

        {/* Inline tool call badges */}
        {relatedTools.length > 0 && (
          <div className="flex flex-wrap gap-1 pl-1">
            {relatedTools.map(tc => (
              <span
                key={tc.id}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                  tc.status === 'success'
                    ? 'border-tool/40 text-tool bg-tool/10'
                    : tc.status === 'error'
                    ? 'border-danger/40 text-danger bg-danger/10'
                    : 'border-yellow-400/40 text-yellow-400 bg-yellow-400/10'
                }`}
              >
                {tc.status === 'running' ? '⟳' : tc.status === 'success' ? '✓' : '✗'} {tc.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
