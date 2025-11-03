// src/components/header/Header.tsx
import { useAppStore } from '@/store/appStore'
import { useChat } from '@/hooks/useChat'

export function Header() {
  const { currentConversationId } = useAppStore()
  const { conversation } = useChat(currentConversationId)

  return (
    <header className="site-header bg-transparent border-b border-white/10 flex-shrink-0">
      <div className="site-header-content max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left: Conversation title or app name */}
        <div className="flex-1 min-w-0">
          {conversation ? (
            <h1 className="text-white text-lg font-semibold truncate">
              {conversation.title || 'New Conversation'}
            </h1>
          ) : (
            <h1 className="text-white text-lg font-semibold">
              Smolagent
            </h1>
          )}
        </div>

        {/* Right: Status indicator */}
        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white/90 text-sm font-medium">Ready</span>
          </div>
        </div>
      </div>
    </header>
  )
}