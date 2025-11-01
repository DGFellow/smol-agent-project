import { useState, useCallback } from 'react'
import { authApi } from '@/lib/api'
import type { RegisterData, AuthResponse, FieldValidation } from '@/types'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)

  // Zustand selectors (keeps components from over-subscribing)
  const setError = useAuthStore((s) => s.setError)
  const clearError = useAuthStore((s) => s.clearError)
  const setUser = useAuthStore((s) => s.setUser)
  const setToken = useAuthStore((s) => s.setToken)

  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    setIsLoading(true)
    clearError()
    try {
      const res = await authApi.register(data)
      setUser(res.user)
      setToken(res.token)
      return res
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Registration failed')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [clearError, setError, setUser, setToken])

  const login = useCallback(async (creds: { username: string; password: string }) => {
    setIsLoading(true)
    clearError()
    try {
      const res = await authApi.login(creds)
      setUser(res.user)
      setToken(res.token)
      return res
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Login failed')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [clearError, setError, setUser, setToken])

  const logout = useCallback(() => {
    authApi.logout()
  }, [])

  // IMPORTANT: These must proxy the API *verbatim* so UI can read `available`
  const checkUsername = useCallback(async (username: string): Promise<FieldValidation> => {
    return authApi.checkUsername(username) // => { available: boolean, message? }
  }, [])

  const checkEmail = useCallback(async (email: string): Promise<FieldValidation> => {
    return authApi.checkEmail(email) // => { available: boolean, message? }
  }, [])

  return { register, login, logout, checkUsername, checkEmail, isLoading }
}
