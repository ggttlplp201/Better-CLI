import React, { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { Message, ToolCall } from '../../../shared/types'

type Props = {
  messages: Message[]
  toolCalls: ToolCall[]
}

export function ChatArea({ messages, toolCalls }: Props): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm select-none">
        Start a conversation — Claude Code is ready.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} toolCalls={toolCalls} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
