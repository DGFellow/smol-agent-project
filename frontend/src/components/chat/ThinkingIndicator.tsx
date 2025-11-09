import { useEffect, useState } from 'react'

interface ThinkingStep {
  content: string
  step: number
  timestamp: number
}

interface ThinkingIndicatorProps {
  steps?: ThinkingStep[]
  complete?: boolean
  duration?: number
}

export default function ThinkingIndicator({ 
  steps = [], 
  complete = false,
  duration 
}: ThinkingIndicatorProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (complete) return

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    return () => clearInterval(interval)
  }, [complete])

  if (complete && steps.length === 0) {
    return null
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800/30 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Animated thinking icon */}
      <div className="flex-shrink-0 mt-1">
        {complete ? (
          <svg 
            className="w-5 h-5 text-green-500 animate-in zoom-in duration-200" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        ) : (
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
            <div className="relative w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <svg 
                className="w-3 h-3 text-white animate-pulse" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Thinking content */}
      <div className="flex-1 min-w-0">
        {steps.length > 0 ? (
          <div className="space-y-1.5">
            {steps.map((step, index) => (
              <div
                key={step.step}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 animate-in slide-in-from-left duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                  {step.step}
                </span>
                <span>{step.content}</span>
                {index === steps.length - 1 && !complete && (
                  <span className="text-blue-500 font-medium">{dots}</span>
                )}
              </div>
            ))}
            {complete && duration !== undefined && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Completed in {duration.toFixed(1)}s
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Thinking{dots}</span>
          </div>
        )}
      </div>
    </div>
  )
}