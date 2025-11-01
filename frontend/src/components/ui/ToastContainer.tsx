import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'toast flex items-start gap-3 p-4 rounded-lg shadow-hard',
            'bg-white border animate-slide-in',
            toast.type === 'success' && 'border-green-500',
            toast.type === 'error' && 'border-red-500',
            toast.type === 'info' && 'border-blue-500',
            toast.type === 'warning' && 'border-yellow-500'
          )}
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {toast.type === 'error' && (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-blue-500" />
            )}
            {toast.type === 'warning' && (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            )}
          </div>

          {/* Message */}
          <div className="flex-1 text-sm text-gray-900">
            {toast.message}
          </div>

          {/* Close button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ))}
    </div>
  )
}