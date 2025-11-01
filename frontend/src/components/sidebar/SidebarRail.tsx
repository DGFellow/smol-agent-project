import React from 'react'
import { useAppStore } from '@/store/appStore'

const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className = '', children, ...props }) => (
  <button
    {...props}
    className={
      'w-10 h-10 grid place-items-center rounded-xl hover:bg-white/10 transition-colors ' +
      'focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
      className
    }
  >
    {children}
  </button>
)

const SidebarRail: React.FC = () => {
  const sidebarExpanded = useAppStore((s) => s.sidebarExpanded)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  return (
    <div
      className="
        hidden md:flex
        sticky top-0
        h-screen w-16 shrink-0
        flex-col items-center gap-3
        border-r border-white/10
        bg-gradient-to-b from-slate-900/40 to-slate-900/10
        backdrop-blur
        p-3
      "
    >
      {/* Hamburger toggles the expandable panel */}
      <IconButton
        aria-label="Toggle sidebar panel"
        aria-expanded={sidebarExpanded}
        onClick={toggleSidebar}
        title={sidebarExpanded ? 'Collapse' : 'Expand'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" />
        </svg>
      </IconButton>

      {/* Example placeholder for other rail actions */}
      <IconButton aria-label="Chat">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 5h16v10H7l-3 3V5z" stroke="currentColor" strokeWidth="2" />
        </svg>
      </IconButton>
    </div>
  )
}

export default SidebarRail
