import React, { useEffect, useMemo, useState } from 'react'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { apiGet } from '../ui/api'
import { Panel, ToolbarRow, inputStyle, btnStyle, Pill } from '../ui/table'

type Page<T> = { items: T[]; total: number; page: number; page_size: number }
type Audit = {
  id: string
  timestamp: string
  entity_type: string
  entity_id?: string | null
  action: string
  source: string
  correlation_id?: string | null
}

export default function AuditLog() {
  const [page, setPage] = useState(1)
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [data, setData] = useState<Page<Audit> | null>(null)

  const columns = useMemo<ColumnDef<Audit>[]>(() => [
    { header: 'Time', accessorKey: 'timestamp', cell: ({row}) => new Date(row.original.timestamp).toLocaleString() },
    { header: 'Entity', accessorKey: 'entity_type', cell: ({row}) => <Pill tone="muted" text={row.original.entity_type} /> },
    { header: 'Action', accessorKey: 'action' },
    { header: 'Source', accessorKey: 'source', cell: ({row}) => <span style={{color:'var(--muted)'}}>{row.original.source}</span> },
    { header: 'Entity ID', accessorKey: 'entity_id', cell: ({row}) => <span style={{color:'var(--muted)'}}>{row.original.entity_id || '-'}</span> },
  ], [])

  const table = useReactTable({ data: data?.items ?? [], columns, getCoreRowModel: getCoreRowModel() })

  async function load() {
    const res = await apiGet<Page<Audit>>('/audit', {
      page,
      page_size: 100,
      entity_type: entityType || undefined,
      action: action || undefined,
    })
    setData(res)
  }

  useEffect(() => { load().catch(console.error) }, [page, entityType, action])

  return (
    <div style={{padding:12, height:'100%', minHeight:0}}>
      <Panel title="Audit log" right={<span style={{color:'var(--muted)'}}>{data ? `${data.total} total` : '...'}</span>}>
        <ToolbarRow>
          <input value={entityType} onChange={(e)=>setEntityType(e.target.value)} placeholder="Entity type (job, alert...)" style={inputStyle} />
          <input value={action} onChange={(e)=>setAction(e.target.value)} placeholder="Action contains" style={inputStyle} />
          <button style={btnStyle} onClick={()=>{ setPage(1); load().catch(console.error) }}>Refresh</button>
        </ToolbarRow>

        <div style={{overflow:'auto', border:'1px solid var(--border)', borderRadius:10, maxHeight:'calc(100vh - 220px)'}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
            <thead style={{position:'sticky', top:0, background:'var(--panel2)', zIndex:1}}>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id} style={{textAlign:'left', padding:'10px 10px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap'}}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(r => (
                <tr key={r.id}>
                  {r.getVisibleCells().map(c => (
                    <td key={c.id} style={{padding:'10px 10px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap'}}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{display:'flex', justifyContent:'space-between', marginTop:10}}>
          <button style={btnStyle} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <button style={btnStyle} onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
      </Panel>
    </div>
  )
}
