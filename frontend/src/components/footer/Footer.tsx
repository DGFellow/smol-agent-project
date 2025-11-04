// src/components/footer/Footer.tsx
/**
 * Footer with integrated composer
 * - Full-width gradient
 * - Composer row above copyright
 * - Sticky at bottom
 */

import { MessageComposer } from '@/components/chat/MessageComposer'
import { useAppStore } from '@/store/appStore'

export function Footer() {
  const { currentConversationId, viewMode } = useAppStore()
  
  // ONLY show composer in chat view (when conversation exists)
  const showComposer = viewMode === 'chat' && currentConversationId !== null

  return (
    <footer className="site-footer bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent border-t border-white/10 flex-shrink-0">
      {/* Composer Row - Full width */}
      {showComposer && (
        <div className="w-full px-6 pt-6 pb-4">
          <div className="max-w-4xl mx-auto">
            <MessageComposer
              placeholder="Message Assistant..."
              conversationId={currentConversationId}
            />
          </div>
        </div>
      )}
      
      {/* Copyright Row */}
      <div className="footer-content w-full px-4 py-3 text-center border-t border-white/5">
        <p className="text-white/70 text-xs m-0">
          © 2025 Smolagent Framework. Built with ❤️ and AI.
        </p>
      </div>
    </footer>
  )
}