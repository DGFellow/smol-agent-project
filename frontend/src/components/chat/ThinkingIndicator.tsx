import { Bot } from 'lucide-react'

export function ThinkingIndicator() {
  return (
    <div className="message-bubble message-assistant mr-auto max-w-[80%] border-dashed animate-fade-in">
      <div className="message-label flex items-center gap-2 mb-2 text-sm font-semibold">
        <Bot className="w-4 h-4" />
        <span>Assistant</span>
      </div>

      <div className="thinking-indicator flex items-center gap-2 text-gray-600">
        <span className="font-semibold">Thinking</span>
        <div className="flex gap-1">
          <span className="dot-pulse w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
          <span className="dot-pulse w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
          <span className="dot-pulse w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
        </div>
      </div>
    </div>
  )
}