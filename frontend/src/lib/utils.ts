import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes with proper precedence */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format date to a readable string (locale-aware) */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return d.toLocaleString()
  }
}

/** Format relative time using Intl.RelativeTimeFormat when available */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()

  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  const rtf =
    (Intl as any)?.RelativeTimeFormat
      ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
      : null

  if (Math.abs(diffMs) < minute) return 'just now'
  if (Math.abs(diffMs) < hour) {
    const n = Math.round(diffMs / minute)
    return rtf ? rtf.format(-n, 'minute') : `${n}m ago`
  }
  if (Math.abs(diffMs) < day) {
    const n = Math.round(diffMs / hour)
    return rtf ? rtf.format(-n, 'hour') : `${n}h ago`
  }
  if (Math.abs(diffMs) < week) {
    const n = Math.round(diffMs / day)
    return rtf ? rtf.format(-n, 'day') : `${n}d ago`
  }
  return formatDate(d)
}

/** Truncate text to specified length (adds ellipsis) */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, Math.max(0, length)).trimEnd() + '…'
}

/** Generate initials from name (handles extra spaces & hyphenated names) */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.split('-')[0]?.[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Copy text to clipboard (falls back when Clipboard API is unavailable) */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to fallback
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** Debounce with cancel/flush helpers (trailing edge by default) */
export type Debounced<T extends (...args: any[]) => any> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void
  flush: () => void
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 300
): Debounced<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastThis: any

  const debounced = function (this: any, ...args: Parameters<T>) {
    lastArgs = args
    lastThis = this
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fn.apply(lastThis, lastArgs as Parameters<T>)
      lastArgs = null
      lastThis = null
    }, wait)
  } as Debounced<T>

  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    lastArgs = null
    lastThis = null
  }

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fn.apply(lastThis, lastArgs as Parameters<T>)
      lastArgs = null
      lastThis = null
    }
  }

  return debounced
}

/** Check if code is running in a browser */
export const isBrowser = typeof window !== 'undefined'

/** Local storage helpers with error handling */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (!isBrowser) return defaultValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set: <T>(key: string, value: T): void => {
    if (!isBrowser) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving to localStorage:', error)
    }
  },

  remove: (key: string): void => {
    if (!isBrowser) return
    try {
      window.localStorage.removeItem(key)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error removing from localStorage:', error)
    }
  },

  clear: (): void => {
    if (!isBrowser) return
    try {
      window.localStorage.clear()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error clearing localStorage:', error)
    }
  },
}
