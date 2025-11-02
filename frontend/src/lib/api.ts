import axios, { AxiosError, AxiosInstance } from 'axios'
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  MessageRequest,
  MessageResponse,
  ConversationListResponse,
  ConversationResponse,
  HealthResponse,
  FieldValidation,
} from '@/types'

// -------- baseURL resolution (dev-proxy first, prod override allowed) --------
const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

const envBaseRaw =
  (import.meta as any).env?.VITE_BACKEND_URL ??
  (import.meta as any).env?.VITE_API_URL

const normalizeBase = (s?: string) => {
  if (!s) return '/api'
  // strip trailing slash to avoid // when concatenating
  return s.endsWith('/') ? s.slice(0, -1) : s
}

const resolvedBaseURL = isDev ? '/api' : normalizeBase(envBaseRaw)

// -------- axios instance --------
const api: AxiosInstance = axios.create({
  baseURL: resolvedBaseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // keep cookies/session
  timeout: 30000,
})

// -------- interceptors --------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const status = error.response?.status
    if (status === 401 || status === 419) {
      // Clear auth state
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        // Prevent loop by doing single redirect
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

// ============================================
// Authentication API
// ============================================
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', userData)
    return data
  },

  verifyToken: async (): Promise<{ valid: boolean; user: any }> => {
    const { data } = await api.get('/auth/verify')
    return data
  },

  checkUsername: async (username: string): Promise<FieldValidation> => {
    const { data } = await api.post<FieldValidation>('/auth/check-username', { username })
    return data
  },

  checkEmail: async (email: string): Promise<FieldValidation> => {
    const { data } = await api.post<FieldValidation>('/auth/check-email', { email })
    return data
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  },
}

// ============================================
// Conversation API
// ============================================
export const conversationApi = {
  list: async (params?: {
    limit?: number
    offset?: number
  }): Promise<ConversationListResponse> => {
    const { data } = await api.get<ConversationListResponse>('/conversations', { params })
    return data
  },

  get: async (id: number): Promise<ConversationResponse> => {
    const { data } = await api.get<ConversationResponse>(`/conversations/${id}`)
    return data
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const { data } = await api.delete(`/conversations/${id}`)
    return data
  },

  updateTitle: async (
    id: number,
    title: string
  ): Promise<{ message: string; title: string }> => {
    const { data } = await api.put(`/conversations/${id}/title`, { title })
    return data
  },
}

// ============================================
// Message API
// ============================================
export const messageApi = {
  send: async (request: MessageRequest): Promise<MessageResponse> => {
    const { data } = await api.post<MessageResponse>('/message', request)
    return data
  },

  clear: async (conversationId: number): Promise<{ status: string }> => {
    const { data } = await api.post('/clear', { conversation_id: conversationId })
    return data
  },
}

// ============================================
// Health API
// ============================================
export const healthApi = {
  check: async (): Promise<HealthResponse> => {
    const { data } = await api.get<HealthResponse>('/health')
    return data
  },
}

// ============================================
// Error Helper
// ============================================
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serverMsg =
      (error.response?.data as any)?.error ||
      (error.response?.data as any)?.message
    return serverMsg || error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}

export default api
