/**
 * Debug component to verify streaming state
 * Remove this after debugging
 *
 * NOTE: useChat() has been removed from here.
 * All values are passed from ChatPage to avoid multiple hook instances.
 */

type Props = {
  isThinking: boolean
  isStreaming: boolean
  isSending: boolean
  thinkingStepsCount: number
  thinkingComplete: boolean
  streamingMessagePreview: string
}

export function StreamingDebug({
  isThinking,
  isStreaming,
  isSending,
  thinkingStepsCount,
  thinkingComplete,
  streamingMessagePreview,
}: Props) {
  return (
    <div className="fixed bottom-20 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50 border border-green-500">
      <div className="font-bold mb-2 text-green-400">🐛 Streaming Debug</div>
      <div className="space-y-1">
        <div>
          isThinking:{' '}
          <span className={isThinking ? 'text-green-400' : 'text-red-400'}>{String(isThinking)}</span>
        </div>
        <div>
          isStreaming:{' '}
          <span className={isStreaming ? 'text-green-400' : 'text-red-400'}>
            {String(isStreaming)}
          </span>
        </div>
        <div>
          isSending:{' '}
          <span className={isSending ? 'text-green-400' : 'text-red-400'}>{String(isSending)}</span>
        </div>
        <div>thinkingSteps: {thinkingStepsCount}</div>
        <div>thinkingComplete: {String(thinkingComplete)}</div>
        <div>streamingMessage length: {streamingMessagePreview.length}</div>
        {streamingMessagePreview && (
          <div className="mt-2 p-2 bg-gray-800 rounded max-h-20 overflow-y-auto">
            {streamingMessagePreview.substring(0, 100)}...
          </div>
        )}
      </div>
    </div>
  )
}
