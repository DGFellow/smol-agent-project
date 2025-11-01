import { Menu, MessageSquarePlus, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { AccountButton } from './AccountButton'
import { cn } from '@/lib/utils'

interface SidebarRailProps {
  onNewChat: () => void
  showMobileClose?: boolean
}

export function SidebarRail({ onNewChat, showMobileClose }: SidebarRailProps) {
  const { toggleSidebar, sidebarExpanded } = useAppStore()

  return (
    <div className="sidebar-rail flex flex-col items-center gap-2 p-2 bg-white">
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="rail-btn"
        aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={sidebarExpanded}
      >
        {showMobileClose && sidebarExpanded ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </button>

      {/* New Chat - morphing button */}
      <button
        onClick={onNewChat}
        className={cn(
          'nav-item',
          'relative overflow-visible'
        )}
        aria-label="New chat"
      >
        <span className="nav-icon">
          <MessageSquarePlus className="w-5 h-5" />
        </span>
        <span className="nav-label">
          New chat
        </span>
      </button>

      {/* Account button at bottom */}
      <AccountButton />
    </div>
  )
}