import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Bell, BookOpen, CalendarDays, ChevronDown, ClipboardCheck, FileText, FolderKanban, History, House, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { menuForRole } from '../../config/navigation'
import { ROLES, type RoleCode } from '../../config/roles'
import { useAuth } from '../../auth/useAuth'
import logo from '../../assets/logo-iinsad.jpg'

const ICONS: Record<string, LucideIcon> = {
  home: House, users: Users, building: BookOpen, folders: FolderKanban,
  reviews: ClipboardCheck, plan: Activity, files: FileText, calendar: CalendarDays, reports: LayoutDashboard, audit: History,
}

export function AppShell() {
  const { session, setActiveRole, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  if (!session) return null
  const items = menuForRole(session.activeRole)
  const title = items.find(item => item.path === location.pathname)?.label ?? 'Sistema IINSAD'

  async function leave() {
    try { await signOut() } catch { /* la sesión local se borra incluso si falla el servidor */ }
    navigate('/login', { replace: true })
  }

  return <div className="app-layout">
    {sidebarOpen && <button aria-label="Cerrar menú" className="drawer-backdrop" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
      <div className="brand">
        <img className="logo-img logo-img--side" src={logo} alt="Logo del IINSAD"/>
        <div><strong>IINSAD</strong><small>UMSA · Investigación</small></div>
        <button className="close-sidebar" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)}><X size={19} /></button>
      </div>
      <div className="sidebar-subheading">GESTIÓN INSTITUCIONAL</div>
      <nav aria-label="Navegación principal" className="side-nav">
        {items.map(item => {
          const Icon = ICONS[item.icon] ?? House
          return <NavLink key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Icon size={19} strokeWidth={1.8} />
            <span>{item.label}</span>
            {item.phase === 'proximo' && <small className="nav-soon">Próx.</small>}
          </NavLink>
        })}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><ShieldCheck size={19}/><span>Acceso según rol<br/><small>Los permisos reales se validan en Django.</small></span></div></div>
    </aside>

    <main className="main-area">
      {session.demo && <div className="demo-strip"><strong>Modo demostración</strong> · Navegación visual sin autenticación ni datos reales.</div>}
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Abrir menú" onClick={() => setSidebarOpen(true)}><Menu size={22}/></button><div className="breadcrumb"><span>Panel institucional</span><span className="breadcrumb-divider">/</span><strong>{title}</strong></div></div>
        <div className="topbar-right"><span className="topbar-role">{ROLES[session.activeRole]}</span><Bell size={19} aria-label="Notificaciones: próximamente" className="muted-icon"/><div className="avatar" title={session.profile.email}>{session.profile.persona?.nombres?.charAt(0).toUpperCase() ?? 'U'}</div></div>
      </header>
      <div className="page-container">
        <div className="page-topline"><span>SISTEMA DE GESTIÓN Y SEGUIMIENTO DE INVESTIGACIONES</span><span className="status-chip">● Entorno de desarrollo</span></div>
        <div className="role-controls">
          <div className="identity"><span className="identity-overline">SESIÓN ACTUAL</span><strong>{session.profile.persona?.nombre_completo || session.profile.email}</strong><small>{session.profile.email}</small></div>
          <div className="role-select-wrap"><label htmlFor="activeRole">Rol de trabajo</label><div className="select-icon"><select id="activeRole" value={session.activeRole} onChange={event => { setActiveRole(event.target.value as RoleCode); navigate('/inicio') }} disabled={session.roles.length === 1}>
            {session.roles.map(role => <option key={role} value={role}>{ROLES[role]}</option>)}
          </select><ChevronDown size={16}/></div></div>
          <button className="secondary-button signout" onClick={() => void leave()}><LogOut size={16}/> Salir</button>
        </div>
        <Outlet />
        <footer className="footer">IINSAD · Universidad Mayor de San Andrés <span>Frontend v0.1 · Desarrollo académico</span></footer>
      </div>
    </main>
  </div>
}
