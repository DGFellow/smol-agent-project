import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { queryClient, queryKeys } from '@/lib/queryClient'
import type { LoginCredentials, RegisterData } from '@/types'

export function useAuth() {
  const navigate = useNavigate()
  const { login: setAuth, logout: clearAuth, setError, setLoading } = useAuthStore()

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onMutate: () => {
      setLoading(true)
      setError(null)
    },
    onSuccess: (data) => {
      if (data.requires_2fa) {
        // Handle 2FA flow
        setError(null)
        setLoading(false)
        // You could navigate to a 2FA page or show modal
        return
      }
      
      setAuth(data.token, data.user)
      setLoading(false)
      navigate('/')
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      setError(message)
      setLoading(false)
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onMutate: () => {
      setLoading(true)
      setError(null)
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      setLoading(false)
      navigate('/')
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      setError(message)
      setLoading(false)
    },
  })

  // Check username availability
  const checkUsername = useMutation({
    mutationFn: authApi.checkUsername,
  })

  // Check email availability
  const checkEmail = useMutation({
    mutationFn: authApi.checkEmail,
  })

  // Verify token on mount
  const { data: verifyData, isLoading: isVerifying } = useQuery({
    queryKey: queryKeys.auth.verify,
    queryFn: authApi.verifyToken,
    enabled: !!useAuthStore.getState().token,
    retry: false,
  })

  const logout = () => {
    clearAuth()
    queryClient.clear()
    navigate('/login')
  }

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    checkUsername: checkUsername.mutateAsync,
    checkEmail: checkEmail.mutateAsync,
    isLoading: loginMutation.isPending || registerMutation.isPending || isVerifying,
    isVerifying,
  }
}