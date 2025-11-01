import { useState, useRef, useEffect } from 'react'
import { LogOut, Settings, User, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import { getInitials, cn } from '@/lib/utils'

export function AccountButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const popupRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        buttonRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  if (!user) return null

  const displayName = user.first_name || user.username
  const initials = getInitials(user.username)

  return (
    <div className="account-btn mt-auto relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="rail-btn p-0 overflow-visible"
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        <div className="account-avatar w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white flex items-center justify-center font-bold text-sm">
          {initials}
        </div>
      </button>

      {/* Popup menu */}
      {isOpen && (
        <div
          ref={popupRef}
          className={cn(
            'account-popup fixed bottom-16 left-16',
            'w-80 bg-white rounded-2xl shadow-hard',
            'border border-gray-200 overflow-hidden',
            'animate-fade-in z-50'
          )}
          aria-hidden={!isOpen}
        >
          {/* Header */}
          <div className="account-popup-header flex items-center gap-3 p-5 bg-gradient-to-br from-primary-50 to-secondary-50">
            <div className="account-popup-avatar w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
              {initials}
            </div>
            <div className="account-popup-info flex-1 min-w-0">
              <div className="account-popup-name font-semibold text-gray-900 truncate">
                {displayName}
              </div>
              <div className="account-popup-email text-sm text-gray-600 truncate">
                {user.email}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="account-popup-divider h-px bg-gray-200 my-2" />

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false)
                // TODO: Navigate to profile
              }}
              className="account-popup-item w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <User className="w-5 h-5 text-gray-600" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                // TODO: Navigate to settings
              }}
              className="account-popup-item w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <span>Settings</span>
            </button>
          </div>

          {/* Divider */}
          <div className="account-popup-divider h-px bg-gray-200 my-2" />

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false)
                logout()
              }}
              className="account-popup-item w-full flex items-center gap-3 px-5 py-3 hover:bg-red-50 text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Log out</span>
            </button>
          </div>

          {/* Footer */}
          <div className="account-popup-footer flex items-center gap-3 p-4 bg-gray-50 border-t border-gray-200">
            <div className="account-popup-footer-avatar w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="account-popup-footer-info flex-1 min-w-0">
              <div className="account-popup-footer-name font-semibold text-sm text-gray-900 truncate">
                {displayName}
              </div>
              <div className="account-popup-footer-plan text-xs text-gray-600">
                Free Plan
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="account-popup-footer-toggle w-8 h-8 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}