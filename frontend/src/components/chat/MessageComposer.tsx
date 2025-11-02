import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Plus, Settings, Clock, Mic } from 'lucide-react'
import { useMessages } from '@/hooks/useMessages'
import { cn } from '@/lib/utils'

interface MessageComposerProps {
  placeholder?: string
  conversationId?: number | null
  autoFocus?: boolean
  initialValue?: string
  onSent?: () => void
}

export function MessageComposer({
  placeholder = 'Ask anything...',
  conversationId = null,
  autoFocus = false,
  initialValue = '',
  onSent,
}: MessageComposerProps) {
  const [message, setMessage] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage, isLoading } = useMessages()

  // Update message when initialValue changes (for chip clicks)
  useEffect(() => {
    if (initialValue) {
      setMessage(initialValue)
      // Auto-resize
      if (textareaRef.current) {
        autoResize(textareaRef.current)
      }
    }
  }, [initialValue])

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  // Auto-resize textarea
  const autoResize = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    const maxHeight = 160 // max-height from CSS
    const newHeight = Math.min(element.scrollHeight, maxHeight)
    element.style.height = `${newHeight}px`
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    autoResize(e.target)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const trimmed = message.trim()
    if (!trimmed || isLoading) return

    // Clear input immediately for better UX
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    sendMessage(
      {
        message: trimmed,
        conversation_id: conversationId,
      },
      {
        onSuccess: () => {
          onSent?.()
        },
        onError: () => {
          // Restore message if error
          setMessage(trimmed)
        }
      }
    )
  }

  return (
    <div className="pill-composer flex items-center gap-3 bg-white border border-gray-300 rounded-full px-4 py-3 shadow-soft focus-within:border-primary-500 focus-within:shadow-medium transition-all max-w-3xl w-full mx-auto">
      {/* Left actions */}
      <div className="pill-left flex items-center gap-2">
        <button
          className="pill-icon-btn w-9 h-9 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
          title="Add attachment"
          disabled={isLoading}
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
        <button
          className="pill-icon-btn w-9 h-9 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
          title="Settings"
          disabled={isLoading}
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
        <button
          className="pill-icon-btn w-9 h-9 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
          title="Schedule"
          disabled={isLoading}
        >
          <Clock className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pill-input flex-1 resize-none bg-transparent border-0 outline-none text-gray-900 placeholder-gray-500 min-h-[24px] max-h-40 py-1"
        rows={1}
        disabled={isLoading}
      />

      {/* Right actions */}
      <div className="pill-right flex items-center gap-2">
        <button
          className="pill-icon-btn w-9 h-9 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
          title="Voice input (coming soon)"
          disabled={isLoading}
        >
          <Mic className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={handleSubmit}
          className={cn(
            'pill-send w-10 h-10 rounded-full flex items-center justify-center transition-all',
            message.trim() && !isLoading
              ? 'bg-primary-500 hover:bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
          title="Send"
          disabled={!message.trim() || isLoading}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}