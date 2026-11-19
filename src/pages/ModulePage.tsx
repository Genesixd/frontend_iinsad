import { Clock3, Construction, Database, Link2 } from 'lucide-react'
import { NAVIGATION, roleCanAccess } from '../config/navigation'
import { useAuth } from '../auth/useAuth'

export function ModulePage({ path }: { path: string }) {
  const { session } = useAuth()
  const item = NAVIGATION.find(entry => entry.path === path)
  if (!session || !item) return null
  if (!roleCanAccess(session.activeRole, path)) return <div className="content-area"><div className="message-panel"><h2>Acceso restringido</h2><p>Esta opción no está disponible para el rol seleccionado.</p></div></div>
  return <div className="content-area"><div className="section-heading"><div><span className="page-eyebrow">MÓDULO FUNCIONAL</span><h2>{item.label}</h2><p>Estructura visual inicial, preparada para conectar con la API.</p></div><span className="badge-warning">Pendiente de integración</span></div>
    <div className="placeholder-panel"><div className="placeholder-icon"><Construction size={34}/></div><h3>Pantalla preparada para su desarrollo</h3><p>Se implementará el listado, las acciones y las validaciones específicas de este módulo en su iteración correspondiente. No estamos mostrando datos institucionales inexistentes.</p><div className="placeholder-steps"><span><Database size={17}/> Modelos y datos</span><span><Link2 size={17}/> API y permisos</span><span><Clock3 size={17}/> Pruebas e integración</span></div></div>
  </div>
}
