import { useState } from 'react'
import { Building2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { LinesTab } from './catalogs/LinesTab'
import { UnitsTab } from './catalogs/UnitsTab'

type Tab = 'unidades' | 'lineas'

export function UnitsPage() {
  const { session } = useAuth()
  const allowed = session?.activeRole === 'ADMIN_TECNICO'
  const demo = session?.demo === true
  const token = session?.token ?? undefined
  const [tab, setTab] = useState<Tab>('unidades')

  if (!allowed) return <div className="content-area"><div className="message-panel"><h2>Acceso restringido</h2><p>Esta vista es exclusiva del administrador técnico.</p></div></div>

  return <div className="content-area">
    <div className="section-heading"><div><span className="page-eyebrow">M01 · CATÁLOGOS</span><h2>Unidades y líneas de investigación</h2><p>Administra las unidades del instituto y las líneas de investigación de cada una.</p></div><div className="heading-icon"><Building2 size={23}/></div></div>

    <div className="tabs" role="tablist" aria-label="Catálogos">
      <button type="button" role="tab" id="tab-unidades" aria-selected={tab === 'unidades'} aria-controls="panel-catalogo" className={`tab${tab === 'unidades' ? ' tab--active' : ''}`} onClick={() => setTab('unidades')}>Unidades</button>
      <button type="button" role="tab" id="tab-lineas" aria-selected={tab === 'lineas'} aria-controls="panel-catalogo" className={`tab${tab === 'lineas' ? ' tab--active' : ''}`} onClick={() => setTab('lineas')}>Líneas de investigación</button>
    </div>

    <div id="panel-catalogo" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {tab === 'unidades' ? <UnitsTab token={token} demo={demo}/> : <LinesTab token={token} demo={demo}/>}
    </div>

    <p className="note-below"><ShieldCheck size={12}/> Todos los datos se validan también en el servidor: aunque esta pantalla se manipule, Django solo acepta estas operaciones del administrador técnico y registra cada cambio en la auditoría.</p>
  </div>
}
