import type { LoginRequest, LoginResponse } from '../types/auth'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  '/api'

export async function login(request: LoginRequest): Promise<LoginResponse> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Cannot reach the login service. Ensure the backend is running and try again.')
    }

    throw error
  }

  let payload: { message?: string; user?: LoginResponse['user']; expiresAt?: string } | null = null

  try {
    payload = (await response.json()) as { message?: string }
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Unable to sign in. Please try again.')
  }

  if (!payload?.user || !payload.expiresAt) {
    throw new Error('The login service returned an invalid response.')
  }

  return { user: payload.user, expiresAt: payload.expiresAt }
}

export async function getSession(): Promise<LoginResponse | null> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/auth/session`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Cannot reach the login service. Ensure the backend is running and try again.')
    }

    throw error
  }

  if (response.status === 401 || response.status === 403) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to verify the current login session.')
  }

  const payload = (await response.json()) as LoginResponse
  if (!payload.user || !payload.expiresAt) {
    throw new Error('The login service returned an invalid session.')
  }

  return payload
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}
