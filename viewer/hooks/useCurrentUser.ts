'use client'

import { useState, useEffect } from 'react'

export interface CurrentUser {
  id?: string
  display_name?: string
  discord_avatar?: string
  is_admin?: boolean
  is_moderator?: boolean
}

interface UseCurrentUserReturn {
  user: CurrentUser | null
  loading: boolean
  isAdmin: boolean
  isModerator: boolean
  canEdit: boolean
  sessionToken: string | null
}

/**
 * Hook to get the current user from cookies/localStorage
 * Uses the same auth pattern as the middleware:
 * - User info stored in `530_user` cookie (JSON encoded)
 * - Session token in `530_session` cookie or `530_session_token` localStorage
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  useEffect(() => {
    // Read user from cookie
    const getUserFromCookie = (): CurrentUser | null => {
      if (typeof document === 'undefined') return null

      const cookies = document.cookie.split(';')
      const userCookie = cookies.find((c) => c.trim().startsWith('530_user='))

      if (!userCookie) return null

      try {
        const value = userCookie.split('=')[1]
        return JSON.parse(decodeURIComponent(value))
      } catch {
        return null
      }
    }

    // Read session token from cookie or localStorage
    const getSessionToken = (): string | null => {
      if (typeof document === 'undefined') return null

      // Try cookie first
      const cookies = document.cookie.split(';')
      const sessionCookie = cookies.find((c) => c.trim().startsWith('530_session='))

      if (sessionCookie) {
        return sessionCookie.split('=')[1]?.trim() || null
      }

      // Fall back to localStorage (used by extension)
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('530_session_token')
      }

      return null
    }

    const currentUser = getUserFromCookie()
    const token = getSessionToken()

    setUser(currentUser)
    setSessionToken(token)
    setLoading(false)
  }, [])

  const isAdmin = user?.is_admin ?? false
  const isModerator = user?.is_moderator ?? false
  const canEdit = isAdmin || isModerator

  return {
    user,
    loading,
    isAdmin,
    isModerator,
    canEdit,
    sessionToken,
  }
}

export default useCurrentUser
