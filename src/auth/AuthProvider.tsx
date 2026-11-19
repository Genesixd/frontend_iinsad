import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { authenticate, revokeSession } from '../api/auth'
import type { RoleCode } from '../config/roles'
import { AuthContext, type Session } from './auth-context'

const DEMO_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO === 'true'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  const signIn = useCallback(async (email: string, password: string) => {
    const { accessToken, profile, roles } = await authenticate(email, password)
    setSession({ profile, roles, activeRole: roles[0]!, token: accessToken, demo: false })
  }, [])

  const signInDemo = useCallback((role: RoleCode) => {
    if (!DEMO_ENABLED) return
    setSession({
      profile: {
        id: 0, email: `demo.${role.toLowerCase()}@ejemplo.test`,
        persona: { id: 0, nombres: 'Usuario', apellido_paterno: 'Demostración', apellido_materno: '', nombre_completo: 'Usuario de demostración' },
        roles: [role], asignaciones: [],
      }, roles: [role], activeRole: role, token: null, demo: true,
    })
  }, [])

  const setActiveRole = useCallback((role: RoleCode) => {
    setSession(current => current && current.roles.includes(role) ? { ...current, activeRole: role } : current)
  }, [])

  const signOut = useCallback(async () => {
    const token = session?.token
    try { if (token) await revokeSession(token) }
    finally { setSession(null) }
  }, [session?.token])

  const value = useMemo(() => ({ session, signIn, signInDemo, setActiveRole, signOut }),
    [session, signIn, signInDemo, setActiveRole, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
