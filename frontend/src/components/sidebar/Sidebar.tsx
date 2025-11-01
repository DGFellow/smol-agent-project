import { useEffect, useRef } from 'react'
import { MessageSquarePlus, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useConversationActions } from '@/hooks/useConversations'
import { SidebarRail } from './SidebarRail'
import { SidebarPanel } from './SidebarPanel'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { sidebarExpanded, setSidebarExpanded } = useAppStore()
  const { startNewConversation } = useConversationActions()
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close sidebar on overlay click (mobile)
  useEffect(() => {
    const handleOverlayClick = (e: MouseEvent) => {
      if (e.target === overlayRef.current) {
        setSidebarExpanded(false)
      }
    }

    if (sidebarExpanded && window.innerWidth <= 768) {
      document.addEventListener('click', handleOverlayClick)
      return () => document.removeEventListener('click', handleOverlayClick)
    }
  }, [sidebarExpanded, setSidebarExpanded])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarExpanded) {
        setSidebarExpanded(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [sidebarExpanded, setSidebarExpanded])

  return (
    <>
      {/* Mobile overlay */}
      {sidebarExpanded && (
        <div
          ref={overlayRef}
          className="sidebar-overlay fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'sidebar bg-white border-r border-gray-200 shadow-lg',
          'fixed lg:sticky top-0 h-screen z-50 lg:z-auto',
          'transition-transform duration-300 lg:transition-none',
          sidebarExpanded
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="sidebar-grid h-full flex">
          <SidebarRail
            onNewChat={startNewConversation}
            showMobileClose={window.innerWidth <= 768}
          />
          <SidebarPanel />
        </div>
      </aside>
    </>
  )
}