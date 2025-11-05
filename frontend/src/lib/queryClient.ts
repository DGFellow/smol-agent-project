// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (auth errors)
        if (error?.response?.status === 401) {
          return false
        }
        // Don't retry on 403 (forbidden)
        if (error?.response?.status === 403) {
          return false
        }
        // Retry other errors up to 2 times
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false, // Never retry mutations
    },
  },
})

export const queryKeys = {
  conversations: {
    all: ['conversations'] as const,
    detail: (id: number) => ['conversations', id] as const,
  },
  messages: {
    list: (conversationId: number) => ['messages', conversationId] as const,
  },
}