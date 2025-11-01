import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export function StatusIndicator() {
  const { isThinking } = useAppStore()

  const status = isThinking ? 'Thinking...' : 'Ready'
  const statusType = isThinking ? 'loading' : 'ready'

  return (
    <div
      id="header-status"
      className="status-chip inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-gray-700 text-gray-200 font-semibold text-sm"
    >
      <span
        className={cn(
          'status-dot w-2.5 h-2.5 rounded-full',
          statusType === 'loading' && 'bg-yellow-500 status-pulse',
          statusType === 'ready' && 'bg-green-500',
          statusType === 'error' && 'bg-red-500'
        )}
      />
      <span id="status-text">{status}</span>
    </div>
  )
}