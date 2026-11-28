import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  addMember, changeMemberRole, removeMember, type Member, type MemberRole, type PersonOption, type ProjectDetail, type Version,
} from '../../api/projects'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { MEMBER_ROLE_LABELS } from '../../lib/proposal'
import { PersonPicker } from './PersonPicker'

type Props = {
  token: string
  project: ProjectDetail
  version: Version
  /** Solo el borrador admite cambios, y solo si el servidor lo permite a este usuario. */
  editable: boolean
  busy: boolean
  problems: string[]
  /** Ejecuta una operación, muestra su resultado y vuelve a leer el proyecto. */
  run: (action: () => Promise<unknown>, success: string) => Promise<boolean>
}

/** Funciones que se pueden asignar aquí: el principal solo lo cambia el administrador técnico. */
const ASSIGNABLE: MemberRole[] = ['COINVESTIGADOR', 'COLABORADOR']

export function TeamSection({ token, project, version, editable, busy, problems, run }: Props) {
  const [person, setPerson] = useState<PersonOption | null>(null)
  const [role, setRole] = useState<MemberRole>('COINVESTIGADOR')
  const [duties, setDuties] = useState('')
  const [origin, setOrigin] = useState('')
  const [missing, setMissing] = useState('')

  const principal = project.investigador_principal
  const isCurrentPrincipal = (member: Member) => member.funcion === 'INVESTIGADOR_PRINCIPAL' && member.persona.id === principal?.id
  const principalMissing = editable && !!principal && !version.integrantes.some(isCurrentPrincipal)

  async function add(event: FormEvent) {
    event.preventDefault()
    if (!person) { setMissing('Busca y elige a la persona que quieres agregar.'); return }
    setMissing('')
    const done = await run(() => addMember(token, project.id, version.id, {
      persona: person.id, funcion: role, funciones: duties.trim(), procedencia: origin.trim() || person.procedencia,
    }), `${person.nombre_completo} se agregó al equipo.`)
    if (done) { setPerson(null); setDuties(''); setOrigin('') }
  }

  function remove(member: Member) {
    if (!window.confirm(`¿Quitar a ${member.persona.nombre_completo} del equipo de este borrador?`)) return
    void run(() => removeMember(token, project.id, version.id, member.id), `${member.persona.nombre_completo} se quitó del equipo.`)
  }

  function changeRole(member: Member, next: MemberRole) {
    void run(() => changeMemberRole(token, project.id, version.id, member.id, next),
      `${member.persona.nombre_completo} ahora es ${MEMBER_ROLE_LABELS[next].toLowerCase()}.`)
  }

  const columns: Column<Member>[] = [
    { key: 'persona', title: 'Persona', cell: member => <><strong>{member.persona.nombre_completo}</strong>
      {member.procedencia && <small className="row-note">{member.procedencia}</small>}</> },
    { key: 'funcion', title: 'Función', cell: member => editable && member.funcion !== 'INVESTIGADOR_PRINCIPAL'
      ? <select className="table-select" value={member.funcion} disabled={busy} aria-label={`Función de ${member.persona.nombre_completo}`}
        onChange={event => changeRole(member, event.target.value as MemberRole)}>
        {ASSIGNABLE.map(value => <option key={value} value={value}>{MEMBER_ROLE_LABELS[value]}</option>)}
      </select>
      : member.funcion_texto },
    { key: 'funciones', title: 'Responsabilidades', cell: member => member.funciones || '—' },
    ...(editable ? [{ key: 'acciones', title: 'Acciones', cell: (member: Member) => isCurrentPrincipal(member)
      ? <span className="subtle-text">Principal vigente</span>
      : <button type="button" className="secondary-button danger-button" disabled={busy} onClick={() => remove(member)}
        aria-label={`Quitar a ${member.persona.nombre_completo}`}><Trash2 size={13}/> Quitar</button> }] : []),
  ]

  return <section className="data-card team-card" aria-label="Equipo de la propuesta">
    <div className="data-card-head"><div><h3>Equipo de la versión {version.numero_version}</h3>
      <p>{editable ? 'Cambios sobre el borrador. Las versiones enviadas conservan su equipo.' : 'Equipo tal como figura en esta versión.'}</p></div></div>
    {problems.length > 0 && <div className="alert-error alert-inline" role="alert">{problems.join(' ')}</div>}
    <DataTable columns={columns} rows={version.integrantes} rowKey={member => member.id} emptyText="Esta versión no tiene integrantes."/>

    {principalMissing && <div className="card-note">
      <span>El investigador principal vigente ({principal.nombre_completo}) no figura como principal en este borrador.</span>
      <button type="button" className="secondary-button" disabled={busy}
        onClick={() => void run(() => addMember(token, project.id, version.id, { persona: principal.id, funcion: 'INVESTIGADOR_PRINCIPAL' }),
          `${principal.nombre_completo} figura como investigador principal.`)}>Agregar como principal</button>
    </div>}

    {editable && <form className="member-form" onSubmit={event => void add(event)} noValidate>
      <h4>Agregar integrante</h4>
      <div className="form-grid">
        <div className="field form-span"><span>Persona</span>
          <PersonPicker token={token} label="Persona a agregar" value={person} onChange={value => { setPerson(value); setMissing('') }}/>
          {missing && <small className="field-error" role="alert">{missing}</small>}
        </div>
        <label className="field">Función en el proyecto
          <select value={role} onChange={event => setRole(event.target.value as MemberRole)}>
            {ASSIGNABLE.map(value => <option key={value} value={value}>{MEMBER_ROLE_LABELS[value]}</option>)}
          </select>
        </label>
        <label className="field">Procedencia (opcional)
          <input value={origin} maxLength={240} onChange={event => setOrigin(event.target.value)} placeholder={person?.procedencia || 'Ej.: UMSA, Facultad de Medicina'}/>
        </label>
        <label className="field form-span">Responsabilidades (opcional)
          <input value={duties} onChange={event => setDuties(event.target.value)} placeholder="Ej.: trabajo de campo"/>
        </label>
        <div className="form-actions form-span"><button type="submit" className="primary-button" disabled={busy}><Plus size={15}/> Agregar al equipo</button></div>
      </div>
    </form>}
  </section>
}
