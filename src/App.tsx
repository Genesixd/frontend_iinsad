import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { NAVIGATION } from './config/navigation'
import { DashboardPage } from './pages/DashboardPage'
import { AuditPage } from './pages/AuditPage'
import { LoginPage } from './pages/LoginPage'
import { ModulePage } from './pages/ModulePage'
import { UnitsPage } from './pages/UnitsPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route element={<ProtectedRoute/>}>
      <Route element={<AppShell/>}>
        <Route path="/inicio" element={<DashboardPage/>}/>
        <Route path="/usuarios" element={<UsersPage/>}/>
        <Route path="/unidades" element={<UnitsPage/>}/>
        <Route path="/auditoria" element={<AuditPage/>}/>
        {NAVIGATION.filter(item => !['/inicio', '/usuarios', '/unidades', '/auditoria'].includes(item.path)).map(item => <Route key={item.path} path={item.path} element={<ModulePage path={item.path}/>}/>)}
        <Route path="*" element={<Navigate to="/inicio" replace/>}/>
      </Route>
    </Route>
    <Route path="/" element={<Navigate to="/inicio" replace/>}/>
  </Routes>
}
