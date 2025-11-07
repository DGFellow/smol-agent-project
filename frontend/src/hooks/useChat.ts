// frontend/src/hooks/useChat.ts - Use isAnswering
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationApi, messageApi, getErrorMessage } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { useAppStore } from '@/store/appStore'
import { ChatService } from '@/services/ChatService'
import type { Message, MessageRequest, Conversation, ConversationResponse } from '@/types'

type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: string
  type: ToastType
  message: string
}

export function useChat(conversationId?: number | null) {
  const queryClient = useQueryClient()
  const [toasts, setToasts] = useState<Toast[]>([])

  const hasToken = !!localStorage.getItem('token')

  // ✅ Get unified state + sub-states
  const isAnswering = useAppStore((state) => state.isAnswering)
  const isThinking = useAppStore((state) => state.isThinking)
  const isStreaming = useAppStore((state) => state.isStreaming)
  const currentConversationId = useAppStore((state) => state.currentConversationId)
  const setCurrentConversationId = useAppStore((state) => state.setCurrentConversationId)
  const setViewMode = useAppStore((state) => state.setViewMode)
  const clearStreamingState = useAppStore((state) => state.clearStreamingState)

  const stateKey = conversationId ?? currentConversationId ?? 'pending'
  
  const streamingState = useAppStore(
    useCallback(
      (state) => state.streamingByConv[stateKey],
      [stateKey]
    )
  )

  const streaming = useMemo(() => {
    return streamingState || {
      streamingMessage: '',
      thinkingSteps: [],
      thinkingComplete: false,
      thinkingDuration: undefined,
    }
  }, [streamingState])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const {
    data: conversationsData,
    isLoading: isLoadingList,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: () => conversationApi.list({ limit: 50 }),
    enabled: hasToken,
  })

  const {
    data: conversationData,
    isLoading: isLoadingConversation,
    refetch: refetchConversation,
  } = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId || 0),
    queryFn: () => conversationApi.get(conversationId!),
    enabled: !!conversationId && hasToken,
  })

  const conversation = conversationData?.conversation || null
  const messages = conversation?.messages || []

  const sendMutation = useMutation({
    mutationFn: async (request: MessageRequest) => {
      return ChatService.send({
        conversationId: request.conversation_id ?? conversationId,
        content: request.message,
        files: request.files,
      })
    },
    onMutate: async (request: MessageRequest) => {
      if (!conversationId) {
        return { previous: undefined }
      }

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
    },
    onSuccess: (result) => {
      const effectiveId = result.newConversationId || conversationId
      if (effectiveId) {
        const assistantMessage: Message = {
          id: Date.now() + 1,
          content: result.content || streaming.streamingMessage,
          role: 'assistant',
          created_at: new Date().toISOString(),
          reaction: null,
          thinking: streaming.thinkingSteps.length > 0 ? {
            steps: streaming.thinkingSteps,
            duration: streaming.thinkingDuration || 0
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
        
        clearStreamingState(effectiveId)
        if (stateKey === 'pending') {
          clearStreamingState('pending')
        }
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
    },
    onError: (error: Error, _variables: MessageRequest, context?: { previous?: ConversationResponse }) => {
      showToast(getErrorMessage(error), 'error')

      if (context?.previous && conversationId) {
        queryClient.setQueryData(
          queryKeys.conversations.detail(conversationId),
          context.previous
        )
      }
      
      clearStreamingState(stateKey)
    },
  })

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

  const regenerateMessage = useCallback(
    async (messageId: number) => {
      if (!conversationId) return
      
      console.log('Regenerating message:', messageId)
      showToast('Regenerate feature coming soon!', 'info')
    }, [conversationId, showToast])

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
    
    // ✅ Unified + sub-states
    isAnswering,
    isThinking,
    isStreaming,
    streamingMessage: streaming.streamingMessage,
    thinkingSteps: streaming.thinkingSteps,
    thinkingComplete: streaming.thinkingComplete,
    thinkingDuration: streaming.thinkingDuration,
    
    sendMessage: sendMutation.mutate,
    sendMessageAsync: sendMutation.mutateAsync,
    
    deleteConversation: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    
    updateTitle: updateTitleMutation.mutate,
    isUpdatingTitle: updateTitleMutation.isPending,
    
    reactToMessage,
    regenerateMessage,
    
    searchQuery,
    setSearchQuery,
    searchResults,
    
    toasts,
    showToast,
    
    isLoading: isLoadingList || isLoadingConversation || sendMutation.isPending,
  }
}