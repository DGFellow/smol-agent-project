import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationApi, getErrorMessage } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { useAppStore } from '@/store/appStore'
import { toast } from '@/hooks/useToast'

export function useConversations(params?: { limit?: number; offset?: number }) {
  const queryClient = useQueryClient()

  // List conversations
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.conversations.list(params),
    queryFn: () => conversationApi.list(params),
  })

  return {
    conversations: data?.conversations || [],
    total: data?.total || 0,
    isLoading,
    error: error ? getErrorMessage(error) : null,
  }
}

export function useConversation(id: number | null) {
  // Get single conversation
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.conversations.detail(id!),
    queryFn: () => conversationApi.get(id!),
    enabled: !!id,
  })

  return {
    conversation: data?.conversation || null,
    isLoading,
    error: error ? getErrorMessage(error) : null,
  }
}

export function useConversationActions() {
  const queryClient = useQueryClient()
  const { setCurrentConversationId, resetToHero } = useAppStore()

  // Delete conversation
  const deleteMutation = useMutation({
    mutationFn: conversationApi.delete,
    onSuccess: (_, deletedId) => {
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
      
      // If current conversation was deleted, reset to hero
      const currentId = useAppStore.getState().currentConversationId
      if (currentId === deletedId) {
        resetToHero()
      }
      
      toast.success('Conversation deleted')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  // Update title
  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      conversationApi.updateTitle(id, title),
    onSuccess: (_, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(variables.id),
      })
      toast.success('Title updated')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  // Load conversation
  const loadConversation = (id: number) => {
    setCurrentConversationId(id)
    useAppStore.getState().setViewMode('chat')
  }

  // Start new conversation
  const startNewConversation = () => {
    resetToHero()
  }

  return {
    deleteConversation: deleteMutation.mutate,
    updateTitle: updateTitleMutation.mutate,
    loadConversation,
    startNewConversation,
    isDeleting: deleteMutation.isPending,
    isUpdating: updateTitleMutation.isPending,
  }
}