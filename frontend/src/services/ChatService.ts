// frontend/src/services/ChatService.ts - WITH TOASTS
import { useAppStore } from '@/store/appStore'
import { useToastStore } from '@/store/toastStore'
import api from '@/lib/api'

interface SendMessageParams {
  conversationId?: number | null
  content: string
  files?: string[]
}

interface StreamEvent {
  type: 'thinking_start' | 'thinking_step' | 'thinking_complete' | 'response' | 'metadata' | 'error'
  content?: string
  step?: number
  timestamp?: number
  duration?: number
  conversation_id?: number
  message?: string
}

class ChatServiceClass {
  private currentAbortController: AbortController | null = null

  async send({ conversationId, content, files = [] }: SendMessageParams): Promise<{
    content: string
    newConversationId?: number
  }> {
    this.abort()

    const ctrl = new AbortController()
    this.currentAbortController = ctrl

    const store = useAppStore.getState()
    const {
      setIsAnswering,
      setThinking,
      setStreaming,
      upsertStreamingState,
      clearStreamingState,
      setCurrentConversationId,
      setViewMode,
      migrateStreamingState,
    } = store

    let stateKey: number | 'pending' = conversationId ?? 'pending'

    console.log('🚀 Starting stream')

    // ✅ START: Set isAnswering (entire cycle)
    setIsAnswering(true)
    setThinking(false)
    setStreaming(false)

    clearStreamingState(stateKey)

    let fullResponse = ''
    let newConversationId: number | undefined

    try {
      const response = await fetch(`${api.defaults.baseURL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: content,
          conversation_id: conversationId,
          files,
        }),
        signal: ctrl.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break

            try {
              const event: StreamEvent = JSON.parse(data)

              switch (event.type) {
                case 'metadata':
                  if (event.conversation_id && !conversationId) {
                    newConversationId = event.conversation_id
                    setCurrentConversationId(newConversationId)
                    setViewMode('chat')
                    
                    if (stateKey === 'pending') {
                      migrateStreamingState('pending', newConversationId)
                      stateKey = newConversationId
                    }
                  }
                  break

                case 'thinking_start':
                  console.log('🧠 Thinking started')
                  setThinking(true)
                  upsertStreamingState(stateKey, {
                    thinkingSteps: [],
                    thinkingComplete: false,
                    streamingMessage: ''
                  })
                  break

                case 'thinking_step':
                  if (event.content && event.step !== undefined && event.timestamp !== undefined) {
                    upsertStreamingState(stateKey, (prev) => ({
                      ...prev,
                      thinkingSteps: [
                        ...prev.thinkingSteps,
                        {
                          content: event.content!,
                          step: event.step!,
                          timestamp: event.timestamp!,
                        },
                      ],
                    }))
                  }
                  break

                case 'thinking_complete':
                  console.log('✅ Thinking complete:', event.duration, 's')
                  setThinking(false)
                  upsertStreamingState(stateKey, {
                    thinkingComplete: true,
                    thinkingDuration: event.duration,
                  })
                  break

                case 'response':
                  // First response token - start streaming
                  if (fullResponse.length === 0) {
                    console.log('📡 Streaming started')
                    setStreaming(true)
                  }
                  
                  if (event.content !== undefined) {
                    fullResponse += event.content
                    upsertStreamingState(stateKey, (prev) => ({
                      ...prev,
                      streamingMessage: prev.streamingMessage + event.content!,
                    }))
                  }
                  break

                case 'error':
                  console.error('❌ Stream error:', event.message)
                  throw new Error(event.message || 'Stream error')
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Stream error') {
                console.error('Failed to parse SSE:', e)
              } else {
                throw e
              }
            }
          }
        }
      }

      return {
        content: fullResponse.trim(),
        newConversationId,
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('❌ Stream error:', error)
        
        // Show toast notification
        const { addToast } = useToastStore.getState()
        addToast({
          type: 'error',
          message: error.message || 'Failed to send message',
          duration: 5000
        })
      }
      throw error
    } finally {
      // ✅ END: Clear all flags
      console.log('✅ Stream finished')
      setIsAnswering(false)
      setThinking(false)
      setStreaming(false)
      this.currentAbortController = null
    }
  }

  abort() {
    if (this.currentAbortController) {
      console.log('🛑 Aborting stream')
      this.currentAbortController.abort()
      this.currentAbortController = null

      const { setIsAnswering, setThinking, setStreaming } = useAppStore.getState()
      setIsAnswering(false)
      setThinking(false)
      setStreaming(false)
    }
  }

  isCurrentlyAnswering(): boolean {
    return useAppStore.getState().isAnswering
  }
}

export const ChatService = new ChatServiceClass()