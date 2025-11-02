import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.response?.status === 401 || error?.response?.status === 419) {
          return false
        }
        // Retry other errors once
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

// Query keys for type safety and easy invalidation
export const queryKeys = {
  auth: {
    verify: ['auth', 'verify'] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    list: (params?: { limit?: number; offset?: number }) =>
      ['conversations', 'list', params] as const,
    detail: (id: number) => ['conversations', 'detail', id] as const,
  },
  health: {
    status: ['health', 'status'] as const,
  },
} as const