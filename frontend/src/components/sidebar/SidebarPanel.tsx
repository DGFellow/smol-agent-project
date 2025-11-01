import React, { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useConversations } from '@/hooks/useConversations'
import { ConversationList } from './ConversationList'
import { AccountButton } from './AccountButton'

/**
 * Slide-out panel next to the rail.
 * Width/visibility controlled by `.app-shell.expanded` (index.css).
 */
export function SidebarPanel() {
  const closeSidebar = useAppStore((s) => s.closeSidebar)
  const { conversations, isLoading, error, refetch } = useConversations({ limit: 50 })

  // Close with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeSidebar])

  return (
    <div className="sidebar-panel">
      <div className="sidebar-content">
        {isLoading ? (
          <div className="flex items-center justify-center h-24 text-gray-500">Loading…</div>
        ) : error ? (
          <div className="p-3 text-sm text-red-600">
            Failed to load conversations.
            <button className="ml-2 underline" onClick={() => refetch?.()}>
              Retry
            </button>
          </div>
        ) : (
          // Pass a safe array so ConversationList.map never explodes
          <ConversationList conversations={conversations ?? []} />
        )}
      </div>

      <div className="p-2">
        <AccountButton />
      </div>
    </div>
  )
}
