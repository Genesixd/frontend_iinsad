import { createContext } from 'react'
import type { RoleCode } from '../config/roles'
import type { UserProfile } from '../api/auth'

export type Session = {
  profile: UserProfile
  roles: RoleCode[]
  activeRole: RoleCode
  token: string | null
  demo: boolean
}

export type AuthContextValue = {
  session: Session | null
  signIn: (email: string, password: string) => Promise<void>
  signInDemo: (role: RoleCode) => void
  setActiveRole: (role: RoleCode) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
