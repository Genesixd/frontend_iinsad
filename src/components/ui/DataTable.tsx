import type { ReactNode } from 'react'

export type Column<T> = { key: string; title: string; cell: (row: T) => ReactNode }

export function DataTable<T>({ columns, rows, rowKey, emptyText = 'Todavía no hay registros.' }:
  { columns: Column<T>[]; rows: T[]; emptyText?: string; rowKey: (row: T) => string | number }) {
  if (rows.length === 0) return <div className="empty-state">{emptyText}</div>
  return <div className="table-scroll"><table>
    <thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.title}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={rowKey(row)}>{columns.map(column => <td key={column.key}>{column.cell(row)}</td>)}</tr>)}</tbody>
  </table></div>
}
