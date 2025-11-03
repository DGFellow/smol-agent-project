// frontend/src/hooks/useChat.ts
/**
 * Consolidated Chat Hook - FIXED STREAMING
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { conversationApi, messageApi, getErrorMessage } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { useAppStore } from '@/store/appStore'
import type { Message, MessageRequest, Conversation, ConversationResponse } from '@/types'

type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ThinkingStep {
  content: string
  step: number
  timestamp: number
}

interface StreamResult {
  content: string
  newConversationId?: number
}

export function useChat(conversationId?: number | null) {
  const queryClient = useQueryClient()
  const { setCurrentConversationId, setViewMode, setThinking } = useAppStore()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [thinkingDuration, setThinkingDuration] = useState<number>()
  const [thinkingComplete, setThinkingComplete] = useState(false)
  const streamingRef = useRef<boolean>(false)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  // Conversations list
  const {
    data: conversationsData,
    isLoading: isLoadingList,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: () => conversationApi.list({ limit: 50 }),
  })

  // Current conversation
  const {
    data: conversationData,
    isLoading: isLoadingConversation,
    refetch: refetchConversation,
  } = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId || 0),
    queryFn: () => conversationApi.get(conversationId!),
    enabled: !!conversationId,
  })

  const conversation = conversationData?.conversation || null
  const messages = conversation?.messages || []

  // SEND MESSAGE WITH STREAMING - FIXED!
  const sendMutation = useMutation({
    mutationFn: async (request: MessageRequest): Promise<StreamResult> => {
      console.log('🚀 Starting stream for message:', request.message)
      
      // RESET STATE
      setStreamingMessage('')
      setThinkingSteps([])
      setThinkingComplete(false)
      setThinkingDuration(undefined)
      streamingRef.current = true // ✅ SET TO TRUE HERE!
      
      try {
        const response = await fetch(`${api.defaults.baseURL}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(request)
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''
        let newConversationId: number | undefined

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                console.log('✅ Stream complete')
                break
              }

              try {
                const event = JSON.parse(data)
                console.log('📦 SSE Event:', event.type)

                switch (event.type) {
                  case 'thinking_start':
                    console.log('🧠 Thinking started')
                    setThinking(true)
                    setThinkingSteps([])
                    break

                  case 'thinking_step':
                    console.log('💭 Thinking step:', event.content)
                    setThinkingSteps(prev => [...prev, {
                      content: event.content,
                      step: event.step,
                      timestamp: event.timestamp
                    }])
                    break

                  case 'thinking_complete':
                    console.log('✅ Thinking complete:', event.duration + 's')
                    setThinking(false)
                    setThinkingComplete(true)
                    setThinkingDuration(event.duration)
                    break

                  case 'response':
                    console.log('💬 Response chunk:', event.content)
                    setStreamingMessage(prev => prev + event.content)
                    fullResponse += event.content
                    break

                  case 'metadata':
                    if (event.conversation_id && !conversationId) {
                      console.log('🆔 New conversation ID:', event.conversation_id)
                      newConversationId = event.conversation_id
                      setCurrentConversationId(newConversationId)
                      setViewMode('chat')
                    }
                    break

                  case 'error':
                    throw new Error(event.message)
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }
        }

        streamingRef.current = false
        console.log('✅ Stream ended, full response length:', fullResponse.length)

        return { content: fullResponse.trim(), newConversationId }
      } catch (error) {
        streamingRef.current = false
        console.error('❌ Stream error:', error)
        throw error
      }
    },
    onMutate: async (request: MessageRequest) => {
      if (conversationId) {
        const optimisticMessage: Message = {
          id: Date.now(),
          content: request.message,
          role: 'user',
          created_at: new Date().toISOString(),
          reaction: null,
        }

        await queryClient.cancelQueries({ queryKey: queryKeys.conversations.detail(conversationId) })

        const previous = queryClient.getQueryData<ConversationResponse>(
          queryKeys.conversations.detail(conversationId)
        )

        queryClient.setQueryData<ConversationResponse>(
          queryKeys.conversations.detail(conversationId),
          (old: ConversationResponse | undefined) => ({
            conversation: {
              ...old!.conversation,
              messages: [...(old?.conversation.messages || []), optimisticMessage],
            },
          })
        )

        return { previous }
      }
    },
    onSuccess: (result: StreamResult) => {
      const effectiveId = result.newConversationId || conversationId
      if (effectiveId) {
        const assistantMessage: Message = {
          id: Date.now() + 1,
          content: result.content || streamingMessage,
          role: 'assistant',
          created_at: new Date().toISOString(),
          reaction: null,
          thinking: thinkingSteps.length > 0 ? {
            steps: thinkingSteps,
            duration: thinkingDuration || 0
          } : undefined
        }

        queryClient.setQueryData<ConversationResponse>(
          queryKeys.conversations.detail(effectiveId),
          (old: ConversationResponse | undefined) => ({
            conversation: {
              ...old!.conversation,
              messages: [...(old?.conversation.messages || []), assistantMessage],
            },
          })
        )

        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(effectiveId) })
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })

      setStreamingMessage('')
      setThinkingSteps([])
      setThinkingComplete(false)
      setThinkingDuration(undefined)
      setThinking(false)
    },
    onError: (error: Error, _variables: MessageRequest, context?: { previous?: ConversationResponse }) => {
      streamingRef.current = false
      setThinking(false)
      setStreamingMessage('')
      setThinkingSteps([])
      showToast(getErrorMessage(error), 'error')

      if (context?.previous && conversationId) {
        queryClient.setQueryData(
          queryKeys.conversations.detail(conversationId),
          context.previous
        )
      }
    },
  })

  // Delete conversation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => conversationApi.delete(id),
    onSuccess: (_data: unknown, deletedId: number) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
      if (conversationId === deletedId) {
        setCurrentConversationId(null)
        setViewMode('hero')
      }
      showToast('Conversation deleted', 'success')
    },
    onError: (error: Error) => showToast(getErrorMessage(error), 'error'),
  })

  // Update title
  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      conversationApi.updateTitle(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(conversationId) })
      }
      showToast('Title updated', 'success')
    },
    onError: (error: Error) => showToast(getErrorMessage(error), 'error'),
  })

  // React to message
  const reactToMessage = useCallback(
    async (messageId: number, reaction: 'like' | 'dislike' | null) => {
      if (!conversationId) return

      queryClient.setQueryData<ConversationResponse>(
        queryKeys.conversations.detail(conversationId),
        (old: ConversationResponse | undefined) => {
          if (!old) return old
          return {
            ...old,
            conversation: {
              ...old.conversation,
              messages: old.conversation.messages?.map((msg: Message) =>
                msg.id === messageId ? { ...msg, reaction } : msg
              ),
            },
          }
        }
      )

      try {
        await messageApi.react(messageId, reaction)
      } catch (error) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(conversationId),
        })
        showToast('Failed to save reaction', 'error')
      }
    }, [conversationId, queryClient, showToast])

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Conversation[]>([])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const conversations = conversationsData?.conversations || []
    const query = searchQuery.toLowerCase()
    
    const filtered = conversations.filter(conv => {
      const titleMatch = conv.title?.toLowerCase().includes(query)
      const previewMatch = conv.preview?.toLowerCase().includes(query)
      return titleMatch || previewMatch
    })
    
    setSearchResults(filtered)
  }, [searchQuery, conversationsData])

  return {
    conversations: conversationsData?.conversations || [],
    isLoadingConversations: isLoadingList,
    refetchConversations,
    
    conversation,
    messages,
    isLoadingConversation,
    refetchConversation,
    
    isStreaming: streamingRef.current, // ✅ Now properly tracked!
    streamingMessage,
    
    thinkingSteps,
    thinkingComplete,
    thinkingDuration,
    
    sendMessage: sendMutation.mutate,
    sendMessageAsync: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    
    deleteConversation: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    
    updateTitle: updateTitleMutation.mutate,
    isUpdatingTitle: updateTitleMutation.isPending,
    
    reactToMessage,
    
    searchQuery,
    setSearchQuery,
    searchResults,
    
    toasts,
    showToast,
    
    isLoading: isLoadingList || isLoadingConversation || sendMutation.isPending,
  }
}