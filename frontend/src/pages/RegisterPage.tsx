import { useState, useEffect, useMemo, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Loader2, Check, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { debounce } from '@/lib/utils'
import type { RegisterData } from '@/types'

type Boolish = boolean | null

const emailLooksValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

const passwordRules = {
  minLen: (p: string) => p.length >= 8,
  upper: (p: string) => /[A-Z]/.test(p),
  number: (p: string) => /[0-9]/.test(p),
  symbol: (p: string) => /[^a-zA-Z0-9]/.test(p),
}

const strongPassword = (p: string) =>
  passwordRules.minLen(p) &&
  passwordRules.upper(p) &&
  passwordRules.number(p) &&
  passwordRules.symbol(p)

export function RegisterPage() {
  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  })

  const [validation, setValidation] = useState({
    username: { checking: false, available: null as Boolish },
    email: { checking: false, available: null as Boolish },
    password: {
      valid: false,
      minLen: false,
      upper: false,
      number: false,
      symbol: false,
    },
    confirm: { match: false },
  })

  const { register, checkUsername, checkEmail, isLoading } = useAuth()
  const { error, clearError } = useAuthStore()

  // -------- Debounced field checks (memoized) --------
  const debouncedCheckUsername = useMemo(
    () =>
      debounce(async (value: string) => {
        try {
          const res = await checkUsername(value)
          setValidation((v) => ({
            ...v,
            username: { checking: false, available: !!res.available },
          }))
        } catch {
          setValidation((v) => ({
            ...v,
            username: { checking: false, available: null },
          }))
        }
      }, 350),
    [checkUsername]
  )

  const debouncedCheckEmail = useMemo(
    () =>
      debounce(async (value: string) => {
        try {
          const res = await checkEmail(value)
          setValidation((v) => ({
            ...v,
            email: { checking: false, available: !!res.available },
          }))
        } catch {
          setValidation((v) => ({
            ...v,
            email: { checking: false, available: null },
          }))
        }
      }, 350),
    [checkEmail]
  )

  // -------- Username availability flow --------
  useEffect(() => {
    const u = formData.username.trim()
    if (u.length < 3) {
      setValidation((v) => ({ ...v, username: { checking: false, available: null } }))
      return
    }
    setValidation((v) => ({ ...v, username: { checking: true, available: null } }))
    debouncedCheckUsername(u)
  }, [formData.username, debouncedCheckUsername])

  // -------- Email availability flow --------
  useEffect(() => {
    const e = formData.email.trim()
    if (!emailLooksValid(e)) {
      setValidation((v) => ({ ...v, email: { checking: false, available: null } }))
      return
    }
    setValidation((v) => ({ ...v, email: { checking: true, available: null } }))
    debouncedCheckEmail(e)
  }, [formData.email, debouncedCheckEmail])

  // -------- Password + confirm local validation --------
  useEffect(() => {
    const p = formData.password
    const checks = {
      minLen: passwordRules.minLen(p),
      upper: passwordRules.upper(p),
      number: passwordRules.number(p),
      symbol: passwordRules.symbol(p),
    }
    setValidation((v) => ({
      ...v,
      password: { valid: strongPassword(p), ...checks },
      confirm: { match: !!formData.password && p === formData.password_confirm },
    }))
  }, [formData.password, formData.password_confirm])

  // -------- Handlers --------
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validation.password.valid || !validation.confirm.match) return
    if (validation.username.available !== true || validation.email.available !== true) return

    register(formData)
  }

  const handleChange =
    (field: keyof RegisterData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }))
      if (error) clearError()
    }

  const canSubmit =
    !!formData.username &&
    !!formData.email &&
    validation.password.valid &&
    validation.confirm.match &&
    validation.username.available === true &&
    validation.email.available === true &&
    !validation.username.checking &&
    !validation.email.checking &&
    !isLoading

  const RuleItem = ({
    ok,
    label,
  }: {
    ok: boolean
    label: string
  }) => (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <X className="w-4 h-4 text-gray-400" />
      )}
      <span className={ok ? 'text-green-600' : 'text-gray-500'}>{label}</span>
    </div>
  )

  return (
    <div className="card p-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
        <p className="text-gray-600">Join Smolagent and start building</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
            Username *
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={handleChange('username')}
              className="input pr-10"
              placeholder="Choose a username"
              required
              minLength={3}
              disabled={isLoading}
              autoComplete="username"
            />
            {validation.username.checking && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
            )}
            {validation.username.available === true && !validation.username.checking && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
            {validation.username.available === false && !validation.username.checking && (
              <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            )}
          </div>
          {validation.username.available === false && (
            <p className="text-xs text-red-600 mt-1">Username already taken</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
            Email *
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              className="input pr-10"
              placeholder="your@email.com"
              required
              disabled={isLoading}
              autoComplete="email"
            />
            {validation.email.checking && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
            )}
            {validation.email.available === true && !validation.email.checking && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
            {validation.email.available === false && !validation.email.checking && (
              <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            )}
          </div>
          {validation.email.available === false && (
            <p className="text-xs text-red-600 mt-1">Email already registered</p>
          )}
        </div>

        {/* First & Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 mb-2">
              First name
            </label>
            <input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleChange('first_name')}
              className="input"
              placeholder="John"
              disabled={isLoading}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 mb-2">
              Last name
            </label>
            <input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange('last_name')}
              className="input"
              placeholder="Doe"
              disabled={isLoading}
              autoComplete="family-name"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
            Password *
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            className="input"
            placeholder="Create a strong password"
            required
            minLength={8}
            disabled={isLoading}
            autoComplete="new-password"
          />
          {/* live password policy */}
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <RuleItem ok={validation.password.minLen} label="At least 8 characters" />
            <RuleItem ok={validation.password.upper} label="One uppercase letter" />
            <RuleItem ok={validation.password.number} label="One number" />
            <RuleItem ok={validation.password.symbol} label="One symbol" />
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="password_confirm"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Confirm password *
          </label>
          <input
            id="password_confirm"
            type="password"
            value={formData.password_confirm}
            onChange={handleChange('password_confirm')}
            className="input"
            placeholder="Confirm your password"
            required
            disabled={isLoading}
            autoComplete="new-password"
          />
          {formData.password_confirm && !validation.confirm.match && (
            <p className="text-xs text-red-600 mt-1">Passwords don't match</p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={!canSubmit}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              Create account
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account{' '}
        <Link
          to="/login"
          className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          Sign in here
        </Link>
      </div>
    </div>
  )
}
