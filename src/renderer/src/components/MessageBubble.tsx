import React from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message, ToolCall } from '../../../shared/types'

type Props = { message: Message; toolCalls: ToolCall[] }

export function MessageBubble({ message, toolCalls }: Props): React.JSX.Element {
  const isUser = message.role === 'user'
  const relatedTools = toolCalls.filter(t => message.toolCallIds.includes(t.id))

  if (!message.text && relatedTools.length === 0) return <></>

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mb-0.5">
          <BotIcon />
        </div>
      )}

      <div className={`flex flex-col gap-1.5 max-w-[72%] ${isUser ? 'items-end' : 'items-start'}`}>
        {message.text && (
          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-gray-900 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.text}</p>
            ) : (
              <ReactMarkdown components={{
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-')
                  return isBlock ? (
                    <pre className="bg-white rounded-lg p-2.5 overflow-x-auto text-xs mt-1.5 mb-1.5 border border-gray-200">
                      <code>{children}</code>
                    </pre>
                  ) : (
                    <code className="bg-white rounded px-1.5 py-0.5 text-xs border border-gray-200">{children}</code>
                  )
                },
                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
              }}>
                {message.text}
              </ReactMarkdown>
            )}
          </div>
        )}

        {relatedTools.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {relatedTools.map(tc => (
              <span key={tc.id} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
                tc.status === 'success' ? 'border-green-200 text-green-700 bg-green-50'
                : tc.status === 'error' ? 'border-red-200 text-red-600 bg-red-50'
                : tc.status === 'canceled' ? 'border-gray-200 text-gray-500 bg-gray-50'
                : 'border-indigo-200 text-indigo-600 bg-indigo-50'
              }`}>
                {tc.status === 'running'
                  ? <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  : tc.status === 'success' ? '✓'
                  : tc.status === 'error' ? '✗'
                  : '·'}
                {tc.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mb-0.5">
          <PersonIcon />
        </div>
      )}
    </div>
  )
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
    </svg>
  )
}

function BotIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="6" width="14" height="10" rx="2" fill="#9ca3af"/>
      <circle cx="7.5" cy="11" r="1.5" fill="white"/>
      <circle cx="12.5" cy="11" r="1.5" fill="white"/>
      <rect x="7" y="14" width="6" height="1.5" rx="0.75" fill="white"/>
      <rect x="9" y="3" width="2" height="4" rx="1" fill="#9ca3af"/>
    </svg>
  )
}
