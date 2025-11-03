import { useChat } from '@/hooks/useChat'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ToastContainer() {
  const { toasts } = useChat()

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className="toast-container fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'toast flex items-center gap-3 bg-white rounded-lg shadow-xl border px-4 py-3 min-w-[300px] max-w-[400px] animate-slide-in pointer-events-auto',
            toast.type === 'success' && 'border-green-500',
            toast.type === 'error' && 'border-red-500',
            toast.type === 'info' && 'border-blue-500'
          )}
        >
          {getIcon(toast.type)}
          <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
        </div>
      ))}
    </div>
  )
}