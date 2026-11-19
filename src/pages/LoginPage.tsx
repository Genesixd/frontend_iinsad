import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, FlaskConical, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { ROLES, ROLE_CODES, type RoleCode } from '../config/roles'

const DEMO_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO === 'true'

export function LoginPage() {
  const { session, signIn, signInDemo } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/inicio" replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate('/inicio', { replace: true })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  function enterDemo(role: RoleCode) {
    signInDemo(role)
    navigate('/inicio', { replace: true })
  }

  return <div className="login-layout">
    <section className="login-art">
      <div className="login-art-top"><span className="art-logo">I</span><span>IINSAD <span className="subtle">/ UMSA</span></span></div>
      <div className="login-art-content"><div className="art-icon"><FlaskConical size={30}/></div><p className="eyebrow">PLATAFORMA INSTITUCIONAL</p><h1>La investigación avanza con información organizada.</h1><p>Gestión, planificación y seguimiento de proyectos de investigación en un solo espacio.</p><div className="art-divider"/><div className="art-highlights"><span>01 · Transparencia</span><span>02 · Seguimiento</span><span>03 · Trazabilidad</span></div></div>
      <div className="login-art-bottom">Instituto de Investigación en Salud y Desarrollo<br/>Universidad Mayor de San Andrés</div>
    </section>
    <section className="login-form-side"><div className="login-card"><span className="login-card-tag"><ShieldCheck size={16}/> ACCESO INSTITUCIONAL</span><h2>Bienvenido al IINSAD</h2><p className="login-description">Ingresa con las credenciales de tu cuenta institucional.</p>
      <form onSubmit={event => void submit(event)}>
        <label htmlFor="email">Correo electrónico</label><input id="email" type="email" name="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@iinsad.umsa.bo" required />
        <label htmlFor="password">Contraseña</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" minLength={1} required />
        {error && <div className="alert-error" role="alert">{error}</div>}
        <button type="submit" className="primary-button full-width" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar al sistema'}<ArrowRight size={18}/></button>
      </form>
      <p className="security-hint"><LockKeyhole size={15}/> Tus permisos se verifican desde el servidor.</p>
      {DEMO_ENABLED && <div className="demo-box"><div className="demo-box-header"><strong>Explorar pantallas por rol</strong><span>SOLO DESARROLLO</span></div><p>Prueba el diseño sin levantar Django. Los registros son ficticios y el acceso no es real.</p><div className="demo-roles">{ROLE_CODES.map(role => <button type="button" key={role} onClick={() => enterDemo(role)}>{ROLES[role]} <ArrowRight size={13}/></button>)}</div></div>}
    </div></section>
  </div>
}
