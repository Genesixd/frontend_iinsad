import { ArrowUpRight, ChartNoAxesCombined, ClipboardCheck, Clock3, FolderOpen, Shield, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { menuForRole } from '../config/navigation'
import { ROLES, ROLE_DESCRIPTIONS } from '../config/roles'

const ICONS = [FolderOpen, ClipboardCheck, Users, Clock3]

export function DashboardPage() {
  const { session } = useAuth()
  if (!session) return null
  const { activeRole } = session
  const items = menuForRole(activeRole).filter(item => item.path !== '/inicio')
  return <div className="content-area">
    <div className="welcome-panel"><div><span className="welcome-kicker">PANEL DE TRABAJO</span><h2>Bienvenido a tu espacio de investigación</h2><p>{ROLE_DESCRIPTIONS[activeRole]}</p><span className="welcome-role">{ROLES[activeRole]}</span></div><div className="welcome-illustration"><ChartNoAxesCombined size={74} strokeWidth={1.1}/></div></div>
    <div className="section-heading"><div><h3>Accesos a tus funciones</h3><p>Opciones visibles según el rol seleccionado.</p></div><span className="section-counter">{items.length} opciones</span></div>
    <div className="tiles-grid">{items.map((item, i) => {
      const Icon = ICONS[i % ICONS.length]!
      return <Link key={item.path} to={item.path} className="feature-tile"><span className="tile-icon"><Icon size={24}/></span><div><span className="tile-label">{item.phase === 'proximo' ? 'MÓDULO EN PREPARACIÓN' : 'DISPONIBLE PARA PRUEBAS'}</span><h4>{item.label}</h4><p>{item.phase === 'proximo' ? 'Vista inicial: se integrará en las próximas iteraciones.' : 'Accede al módulo de administración institucional.'}</p></div><ArrowUpRight className="tile-arrow" size={20}/></Link>
    })}</div>
    <div className="info-banner"><Shield size={19}/><div><strong>Sobre la seguridad del sistema</strong><p>Este menú facilita la navegación, pero no concede permisos. El backend Django debe verificar cada petición y cada recurso.</p></div></div>
  </div>
}
