// frontend/src/services/ChatService.ts - IMPROVED ERROR HANDLING
import { useAppStore } from '@/store/appStore'
import { useToastStore } from '@/store/toastStore'
import api from '@/lib/api'

interface SendMessageParams {
  conversationId?: number | null
  content: string
  files?: string[]
}

interface StreamEvent {
  type: 'thinking_start' | 'thinking_step' | 'thinking_complete' | 'response' | 'metadata' | 'complete' | 'error'
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
    // Cancel any existing request
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

    // ✅ Initialize state immediately
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
        const errorText = await response.text()
        throw new Error(`Server error (${response.status}): ${errorText}`)
      }
      
      if (!response.body) {
        throw new Error('No response body from server')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        // Keep last incomplete line in buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue
          
          const data = line.slice(6).trim()
          if (data === '[DONE]') break

          try {
            const event: StreamEvent = JSON.parse(data)

            switch (event.type) {
              case 'metadata':
                if (event.conversation_id && !conversationId) {
                  newConversationId = event.conversation_id
                  setCurrentConversationId(newConversationId)
                  setViewMode('chat')
                  
                  // Migrate pending state to real conversation
                  if (stateKey === 'pending') {
                    migrateStreamingState('pending', newConversationId)
                    stateKey = newConversationId
                  }
                }
                break

              case 'thinking_start':
                setThinking(true)
                upsertStreamingState(stateKey, {
                  thinkingSteps: [],
                  thinkingComplete: false,
                  streamingMessage: ''
                })
                break

              case 'thinking_step':
                if (event.content && event.step !== undefined) {
                  upsertStreamingState(stateKey, (prev) => ({
                    ...prev,
                    thinkingSteps: [
                      ...prev.thinkingSteps,
                      {
                        content: event.content!,
                        step: event.step!,
                        timestamp: event.timestamp || Date.now(),
                      },
                    ],
                  }))
                }
                break

              case 'thinking_complete':
                setThinking(false)
                setStreaming(true)  // About to start streaming response
                upsertStreamingState(stateKey, {
                  thinkingComplete: true,
                  thinkingDuration: event.duration,
                })
                break

              case 'response':
                if (event.content !== undefined) {
                  fullResponse += event.content
                  upsertStreamingState(stateKey, (prev) => ({
                    ...prev,
                    streamingMessage: prev.streamingMessage + event.content!,
                  }))
                }
                break

              case 'complete':
                // Stream completed successfully
                break

              case 'error':
                throw new Error(event.message || 'Stream error from server')
            }
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message.startsWith('Stream error')) {
              throw parseError
            }
            console.warn('Failed to parse SSE line:', line, parseError)
          }
        }
      }

      // Ensure we got a response
      if (!fullResponse.trim()) {
        throw new Error('Empty response from server')
      }

      return {
        content: fullResponse.trim(),
        newConversationId,
      }

    } catch (error) {
      // Don't show error for user-initiated aborts
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream aborted by user')
        return { content: '' }
      }

      // Show error toast for real errors
      const { addToast } = useToastStore.getState()
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to send message'
      
      addToast({
        type: 'error',
        message: errorMessage,
        duration: 5000
      })

      console.error('Stream error:', error)
      throw error

    } finally {
      // ✅ Always clean up state
      setIsAnswering(false)
      setThinking(false)
      setStreaming(false)
      this.currentAbortController = null
    }
  }

  abort() {
    if (this.currentAbortController) {
      this.currentAbortController.abort()
      this.currentAbortController = null

      // Clean up state immediately
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