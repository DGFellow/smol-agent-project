import { useMutation, useQueryClient } from '@tanstack/react-query'
import { messageApi, getErrorMessage } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { useAppStore } from '@/store/appStore'
import type { MessageRequest } from '@/types'

export function useMessages() {
  const queryClient = useQueryClient()
  const { setCurrentConversationId, setViewMode, setThinking } = useAppStore()

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (request: MessageRequest) => messageApi.send(request),
    onMutate: () => {
      setThinking(true)
    },
    onSuccess: (data) => {
      setThinking(false)
      
      // Update current conversation ID if new conversation
      if (data.is_new_conversation) {
        setCurrentConversationId(data.conversation_id)
      }
      
      // Switch to chat view if in hero mode
      const currentMode = useAppStore.getState().viewMode
      if (currentMode === 'hero') {
        setViewMode('chat')
      }
      
      // Invalidate conversations list to show updated preview AND title
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
      
      // Invalidate current conversation to show new messages AND updated title
      if (data.conversation_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(data.conversation_id),
        })
      }
    },
    onError: () => {
      setThinking(false)
    },
  })

  return {
    sendMessage: sendMutation.mutate,
    sendMessageAsync: sendMutation.mutateAsync,
    isLoading: sendMutation.isPending,
    error: sendMutation.error ? getErrorMessage(sendMutation.error) : null,
    data: sendMutation.data, // Expose the response data including title
  }
}