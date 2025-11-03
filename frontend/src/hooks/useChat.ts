// frontend/src/hooks/useChat.ts
/**
 * Consolidated Chat Hook
 * Features: Optimistic updates, streaming, reactions, search
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { conversationApi, messageApi, getErrorMessage } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { useAppStore } from '@/store/appStore'
import axios from 'axios'
import type { Message, MessageRequest, Conversation } from '@/types'

// Toast notification helper
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

export function useChat(conversationId?: number | null) {
  const queryClient = useQueryClient()
  const { setCurrentConversationId, setViewMode, setThinking } = useAppStore()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [thinkingDuration, setThinkingDuration] = useState<number>()
  const [thinkingComplete, setThinkingComplete] = useState(false)
  const streamingRef = useRef<boolean>(false)

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  // ============================================
  // CONVERSATIONS LIST
  // ============================================
  
  const {
    data: conversationsData,
    isLoading: isLoadingList,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: () => conversationApi.list({ limit: 50 }),
  })

  // ============================================
  // CURRENT CONVERSATION
  // ============================================
  
  const {
    data: conversationData,
    isLoading: isLoadingConversation,
    refetch: refetchConversation,
  } = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId || 0),
    queryFn: () => conversationApi.get(conversationId!),
    enabled: !!conversationId,
    onError: (error) => {
      if (axios.isAxiosError(error) && [403, 404].includes(error.response?.status || 0)) {
        setCurrentConversationId(null)
        setViewMode('hero')
        showToast('Conversation not found or access denied', 'error')
      }
    },
  })

  const conversation = conversationData?.conversation || null
  const messages = conversation?.messages || []

  // ============================================
  // SEND MESSAGE (with streaming support)
  // ============================================
  
  const sendMutation = useMutation({
    mutationFn: async (request: MessageRequest) => {
      console.log('mutationFn started with request:', request);
      try {
        console.log('API base URL:', api.defaults.baseURL);
        const response = await fetch(`${api.defaults.baseURL}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(request)
        });
        console.log('Fetch response:', response.status, response.ok);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // ... rest of the code
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''
        let newConversationId: number | undefined;

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
                const event = JSON.parse(data)

                switch (event.type) {
                  case 'thinking_start':
                    setThinking(true)
                    setThinkingSteps([])
                    break

                  case 'thinking_step':
                    setThinkingSteps(prev => [...prev, {
                      content: event.content,
                      step: event.step,
                      timestamp: event.timestamp
                    }])
                    break

                  case 'thinking_complete':
                    setThinking(false)
                    setThinkingComplete(true)
                    setThinkingDuration(event.duration)
                    break

                  case 'response':
                    setStreamingMessage(prev => prev + event.content)
                    fullResponse += event.content
                    break

                  case 'metadata':
                    if (event.conversation_id && !conversationId) {
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

        // Parse the full response to extract only the final assistant message
        // Assuming the response is formatted with Human: and Assistant: prefixes
        const assistantParts = fullResponse.split('Assistant:')
        const finalContent = assistantParts.length > 1 
          ? assistantParts[assistantParts.length - 1].trim() 
          : fullResponse.trim()

        return { content: finalContent, newConversationId }
      } catch (error) {
        console.error('Fetch error:', error);
        throw error; // to trigger onError
      }
    },
    onMutate: async (request) => {
      if (conversationId) {
        // Optimistic update for existing conversation
        const optimisticMessage: Message = {
          id: Date.now(),
          content: request.message,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          reaction: null,
        }

        await queryClient.cancelQueries({ queryKey: queryKeys.conversations.detail(conversationId) })

        const previous = queryClient.getQueryData<ConversationResponse>(
          queryKeys.conversations.detail(conversationId)
        )

        queryClient.setQueryData<ConversationResponse>(
          queryKeys.conversations.detail(conversationId),
          (old) => ({
            conversation: {
              ...old?.conversation,
              messages: [...(old?.conversation.messages || []), optimisticMessage],
            },
          })
        )

        return { previous }
      }
    },
    onSuccess: (result, request, context) => {
      const effectiveId = result.newConversationId || conversationId
      if (effectiveId) {
        // Add assistant message optimistically
        const assistantMessage: Message = {
          id: Date.now() + 1,
          content: result.content || streamingMessage,
          role: 'assistant',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          reaction: null,
          thinking: thinkingSteps.length > 0 ? {
            steps: thinkingSteps,
            duration: thinkingDuration || 0
          } : undefined
        }

        queryClient.setQueryData<ConversationResponse>(
          queryKeys.conversations.detail(effectiveId),
          (old) => ({
            conversation: {
              ...old?.conversation,
              messages: [...(old?.conversation.messages || []), assistantMessage],
            },
          })
        )

        // Invalidate to fetch latest
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(effectiveId) })
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })

      setStreamingMessage('')
      setThinkingSteps([])
      setThinkingComplete(false)
      setThinkingDuration(undefined)
      setThinking(false)
    },
    onError: (error, variables, context) => {
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

  // ============================================
  // DELETE CONVERSATION
  // ============================================

  const deleteMutation = useMutation({
    mutationFn: (id: number) => conversationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null)
        setViewMode('hero')
      }
      showToast('Conversation deleted', 'success')
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  })

  // ============================================
  // UPDATE TITLE
  // ============================================

  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      conversationApi.update(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(conversationId) })
      }
      showToast('Title updated', 'success')
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  })

  // ============================================
  // REACT TO MESSAGE
  // ============================================

  const reactToMessage = useCallback(
    async (messageId: number, reaction: 'like' | 'dislike' | null) => {
      queryClient.setQueryData<ConversationResponse>(
        queryKeys.conversations.detail(conversationId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            conversation: {
              ...old.conversation,
              messages: old.conversation.messages.map((msg: Message) =>
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

  // ============================================
  // CONVERSATION SEARCH
  // ============================================
  
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

  // ============================================
  // RETURN API
  // ============================================
  
  return {
    // Conversations
    conversations: conversationsData?.conversations || [],
    isLoadingConversations: isLoadingList,
    refetchConversations,
    
    // Current conversation
    conversation,
    messages,
    isLoadingConversation,
    refetchConversation,
    
    // Streaming
    isStreaming: streamingRef.current,
    streamingMessage,
    
    // Thinking
    thinkingSteps,
    thinkingComplete,
    thinkingDuration,
    
    // Send message
    sendMessage: sendMutation.mutate,
    sendMessageAsync: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    
    // Delete conversation
    deleteConversation: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    
    // Update title
    updateTitle: updateTitleMutation.mutate,
    isUpdatingTitle: updateTitleMutation.isPending,
    
    // Reactions
    reactToMessage,
    
    // Search
    searchQuery,
    setSearchQuery,
    searchResults,
    
    // Toasts
    toasts,
    showToast,
    
    // Utils
    isLoading: isLoadingList || isLoadingConversation || sendMutation.isPending,
  }
}