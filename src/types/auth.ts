export type UserRole = 'EMPLOYEE' | 'ADMIN'

export interface LoginRequest {
  role: UserRole
  accessCode: string
}

export interface AuthUser {
  id: string
  name: string
  role: UserRole
  expiresAt: string
}

export interface LoginResponse {
  user: AuthUser
  expiresAt: string
}
