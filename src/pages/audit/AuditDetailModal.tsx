import { Link2 } from 'lucide-react'
import type { AuditRecord } from '../../api/audit'
import { Modal } from '../../components/ui/Modal'
import { actionLabel, actorText, changedFields, entityLabel, formatDateTime } from '../../lib/auditLabels'
import { describeEvent, isAccessEvent } from '../../lib/auditSummary'

type Props = {
  record: AuditRecord
  onClose: () => void
  /** Filtra la lista por la operación (petición) a la que pertenece este registro. */
  onFilterByRequest: (requestId: string) => void
}

export function AuditDetailModal({ record, onClose, onFilterByRequest }: Props) {
  const rows = changedFields(record.antes, record.despues)
  const failed = record.resultado !== 'EXITOSO'
  const access = isAccessEvent(record.accion)
  return <Modal wide title={actionLabel(record.accion)}
    subtitle={`${entityLabel(record.entidad_tipo)}${record.entidad_id !== null ? ` #${record.entidad_id}` : ''} · ${formatDateTime(record.ocurrido_en)}`} onClose={onClose}>
    <p className="event-summary">{describeEvent(record)}</p>

    <dl className="detail-grid">
      <div><dt>Actor</dt><dd>{actorText(record.actor_email)}</dd></div>
      <div><dt>Resultado</dt><dd><span className={`small-tag ${failed ? 'tag-warning' : 'tag-positive'}`}>{failed ? 'Fallido' : 'Exitoso'}</span></dd></div>
      {!access && <div><dt>Rol al actuar</dt><dd>{record.rol_codigo_snapshot ? `${record.rol_codigo_snapshot} (${record.ambito_snapshot})` : '—'}</dd></div>}
      {record.motivo && <div className="detail-span"><dt>Motivo</dt><dd>{record.motivo}</dd></div>}
    </dl>

    <h4 className="modal-section">Qué cambió</h4>
    {rows.length > 0
      ? <div className="table-scroll"><table className="compact-table">
        <thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.field}><td>{row.field}</td><td>{row.before}</td><td>{row.after}</td></tr>)}</tbody>
      </table></div>
      : <div className="empty-state">{access
        ? 'Es un evento de acceso: no modifica datos, solo deja constancia de que ocurrió.'
        : 'Este registro no guardó datos de antes ni de después.'}</div>}

    <details className="tech-details">
      <summary>Datos técnicos</summary>
      <dl className="detail-grid">
        <div><dt>Código de acción</dt><dd><code>{record.accion}</code></dd></div>
        <div><dt>Dirección de red (IP de origen)</dt><dd>{record.direccion_red ?? '—'}</dd></div>
        <div className="detail-span"><dt>ID de la operación</dt><dd><code>{record.peticion_id ?? '—'}</code></dd></div>
        <div><dt>ID del registro</dt><dd>{record.id}</dd></div>
      </dl>
    </details>

    {record.peticion_id && <div className="form-actions">
      <button type="button" className="secondary-button" onClick={() => onFilterByRequest(record.peticion_id!)}>
        <Link2 size={13}/> Ver toda esta operación
      </button>
    </div>}
  </Modal>
}
