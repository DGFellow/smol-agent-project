// frontend/src/services/ChatService.ts
import { useAppStore } from '@/store/appStore'
import api from '@/lib/api'
import type { ThinkingStep } from '@/types'

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

/**
 * ChatService - Singleton for managing streaming chat
 * 
 * This service:
 * - Decouples streaming logic from React component lifecycle
 * - Manages global streaming flags in Zustand store
 * - Handles conversation bootstrap (null → new ID) without state resets
 * - Emits lifecycle events that update the store
 */
class ChatServiceClass {
  private currentAbortController: AbortController | null = null

  /**
   * Send a message and stream the response
   * This is the single source of truth for streaming state
   */
  async send({ conversationId, content, files = [] }: SendMessageParams): Promise<{
    content: string
    newConversationId?: number
  }> {
    // Abort any existing stream
    this.abort()

    const ctrl = new AbortController()
    this.currentAbortController = ctrl

    const store = useAppStore.getState()
    const {
      setIsStreaming,
      setIsSending,
      setThinking,
      upsertStreamingState,
      clearStreamingState,
      setCurrentConversationId,
      setViewMode,
      migrateStreamingState,
    } = store

    // Determine the key for storing streaming state
    let stateKey: number | 'pending' = conversationId ?? 'pending'

    console.log('🚀 Starting stream for message:', content.substring(0, 50))
    console.log('📍 Conversation ID:', conversationId, '| State key:', stateKey)

    // ✅ SET FLAGS BEFORE ANY AWAITS
    console.log('🔥🔥🔥 SETTING isStreaming TO TRUE')
    setIsStreaming(true)
    setIsSending(true)

    // Clear any existing streaming state for this conversation
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
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('✅ Stream complete')
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              console.log('✅ Received [DONE] signal')
              break
            }

            try {
              const event: StreamEvent = JSON.parse(data)
              console.log('📦 SSE Event:', event.type)

              switch (event.type) {
                case 'thinking_start':
                  console.log('🧠 Thinking started')
                  setThinking(true)
                  upsertStreamingState(stateKey, {
                    thinkingSteps: [],
                    thinkingComplete: false,
                  })
                  break

                case 'thinking_step':
                  console.log('💭 Thinking step:', event.step)
                  if (event.content !== undefined && event.step !== undefined && event.timestamp !== undefined) {
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
                  console.log('💬 Response token')
                  if (event.content !== undefined) {
                    fullResponse += event.content
                    upsertStreamingState(stateKey, (prev) => ({
                      ...prev,
                      streamingMessage: prev.streamingMessage + event.content!,
                    }))
                  }
                  break

                case 'metadata':
                  if (event.conversation_id && !conversationId) {
                    console.log('🆔 New conversation ID:', event.conversation_id)
                    newConversationId = event.conversation_id
                    
                    // ✅ UPDATE ID WITHOUT RESETTING STREAMING FLAGS
                    setCurrentConversationId(newConversationId)
                    setViewMode('chat')
                    
                    // ✅ MIGRATE STATE FROM 'pending' TO NEW ID
                    if (stateKey === 'pending') {
                      migrateStreamingState('pending', newConversationId)
                      stateKey = newConversationId
                    }
                  }
                  break

                case 'error':
                  console.error('❌ Stream error:', event.message)
                  throw new Error(event.message || 'Stream error')
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Stream error') {
                console.error('Failed to parse SSE data:', e)
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
      // Only log if it's not an abort
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('❌ Stream error:', error)
      }
      throw error
    } finally {
      // ✅ ALWAYS RESET FLAGS IN FINALLY
      console.log('🔥🔥🔥 SETTING isStreaming TO FALSE')
      setIsStreaming(false)
      setIsSending(false)
      setThinking(false)
      this.currentAbortController = null
    }
  }

  /**
   * Abort the current stream
   */
  abort() {
    if (this.currentAbortController) {
      console.log('🛑 Aborting current stream')
      this.currentAbortController.abort()
      this.currentAbortController = null

      // Reset flags immediately
      const { setIsStreaming, setIsSending, setThinking } = useAppStore.getState()
      setIsStreaming(false)
      setIsSending(false)
      setThinking(false)
    }
  }

  /**
   * Check if currently streaming
   */
  isCurrentlyStreaming(): boolean {
    return useAppStore.getState().isStreaming
  }
}

// Export singleton instance
export const ChatService = new ChatServiceClass()