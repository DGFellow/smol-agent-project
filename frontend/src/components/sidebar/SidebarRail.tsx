import React from 'react'
import { useAppStore } from '@/store/appStore'

/**
 * Always-visible narrow rail (md+). The panel width/visibility is controlled by
 * `.app-shell.expanded` via index.css; this rail only toggles that state.
 *
 * CSS hooks used here (see index.css):
 * - .sidebar-rail       container
 * - .nav-item           button style
 * - .nav-icon           icon wrapper
 * - .nav-label          hover/expanded label (revealed when .app-shell.expanded)
 */
export function SidebarRail() {
  const sidebarExpanded = useAppStore((s) => s.sidebarExpanded)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  return (
    <div className="sidebar-rail">
      {/* Hamburger / menu toggle */}
      <button
        type="button"
        className="nav-item"
        aria-label="Toggle sidebar panel"
        aria-expanded={sidebarExpanded}
        onClick={toggleSidebar}
        title={sidebarExpanded ? 'Collapse' : 'Expand'}
      >
        <span className="nav-icon" aria-hidden>
          {/* hamburger icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        <span className="nav-label">Menu</span>
      </button>

      {/* Example: Chats (clicking could also open the panel if you want) */}
      <button
        type="button"
        className="nav-item"
        aria-label="Chats"
        onClick={() => {
          // Optional: opening the panel when a tool is selected feels nice
          if (!sidebarExpanded) useAppStore.getState().openSidebar?.()
        }}
      >
        <span className="nav-icon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 5h16v10H8l-4 4V5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="nav-label">Chats</span>
      </button>

      {/* Add more rail actions as needed */}
      {/* <button className="nav-item" aria-label="Search"> ... </button> */}
    </div>
  )
}
