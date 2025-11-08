// frontend/src/components/ui/ToastContainer.tsx - FIXED
import { useToastStore } from '@/store/toastStore'
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  return (
    <div className="toast-container fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'toast flex items-center gap-3 bg-gray-800 rounded-lg shadow-xl border px-4 py-3 min-w-[300px] max-w-[400px] pointer-events-auto cursor-pointer',
              toast.type === 'success' && 'border-green-500/50',
              toast.type === 'error' && 'border-red-500/50',
              toast.type === 'warning' && 'border-yellow-500/50',
              toast.type === 'info' && 'border-blue-500/50'
            )}
            onClick={() => removeToast(toast.id)}
          >
            {getIcon(toast.type)}
            <p className="flex-1 text-sm text-white">{toast.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}