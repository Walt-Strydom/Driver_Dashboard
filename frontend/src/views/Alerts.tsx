import React, { useEffect, useMemo, useState } from 'react'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { apiGet, apiPost } from '../ui/api'
import { Panel, SplitPane, ToolbarRow, inputStyle, btnStyle, btnPrimaryStyle, Pill } from '../ui/table'

type Page<T> = { items: T[]; total: number; page: number; page_size: number }
type Alert = {
  id: string
  severity: string
  alert_type: string
  entity_type: string
  entity_id?: string | null
  description: string
  owner_user_id?: string | null
  status: string
  created_at: string
  due_by?: string | null
}

function tone(sev: string) {
  if (sev === 'critical') return 'danger'
  if (sev === 'high') return 'warn'
  if (sev === 'medium') return 'info'
  return 'muted'
}

export default function Alerts() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('open')
  const [severity, setSeverity] = useState('')
  const [data, setData] = useState<Page<Alert> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Alert | null>(null)

  const columns = useMemo<ColumnDef<Alert>[]>(() => [
    { header: 'Severity', accessorKey: 'severity', cell: ({row}) => <Pill tone={tone(row.original.severity) as any} text={row.original.severity} /> },
    { header: 'Type', accessorKey: 'alert_type' },
    { header: 'Entity', accessorKey: 'entity_type', cell: ({row}) => <span style={{color:'var(--muted)'}}>{row.original.entity_type}</span> },
    { header: 'Description', accessorKey: 'description' },
    { header: 'Owner', accessorKey: 'owner_user_id', cell: ({row}) => <span style={{color:'var(--muted)'}}>{row.original.owner_user_id ? 'assigned' : '-'}</span> },
    { header: 'Created', accessorKey: 'created_at', cell: ({row}) => new Date(row.original.created_at).toLocaleString() },
    { header: 'Due', accessorKey: 'due_by', cell: ({row}) => <span style={{color:'var(--muted)'}}>{row.original.due_by ? new Date(row.original.due_by).toLocaleString() : '-'}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({row}) => <Pill tone={row.original.status === 'open' ? 'warn' : row.original.status === 'resolved' ? 'ok' : 'info'} text={row.original.status} /> },
  ], [])

  const table = useReactTable({ data: data?.items ?? [], columns, getCoreRowModel: getCoreRowModel() })

  async function load() {
    const res = await apiGet<Page<Alert>>('/alerts', { page, page_size: 80, status: status || undefined, severity: severity || undefined })
    setData(res)
    if (!selectedId && res.items.length) setSelectedId(res.items[0].id)
  }

  useEffect(() => { load().catch(console.error) }, [page, status, severity])

  useEffect(() => {
    if (!selectedId || !data) return
    const found = data.items.find(a => a.id === selectedId) || null
    setDetail(found)
  }, [selectedId, data])

  async function ack() {
    if (!detail) return
    await apiPost(`/alerts/${detail.id}/ack`)
    await load()
  }
  async function resolve() {
    if (!detail) return
    await apiPost(`/alerts/${detail.id}/resolve`, { reason_code: 'resolved' })
    await load()
  }

  const left = (
    <Panel title="Alerts" right={<span style={{color:'var(--muted)'}}>{data ? `${data.total} total` : '...'}</span>}>
      <ToolbarRow>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={inputStyle}>
          <option value="">All</option>
          {['open','acknowledged','resolved'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={severity} onChange={(e)=>setSeverity(e.target.value)} style={inputStyle}>
          <option value="">Severity</option>
          {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button style={btnStyle} onClick={()=>{ setPage(1); load().catch(console.error) }}>Refresh</button>
      </ToolbarRow>

      <div style={{overflow:'auto', border:'1px solid var(--border)', borderRadius:10}}>
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
              <tr key={r.id} onClick={()=>setSelectedId(r.original.id)} style={{cursor:'pointer', background: r.original.id === selectedId ? 'rgba(96,165,250,0.12)' : 'transparent'}}>
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
  )

  const right = (
    <Panel title="Alert details">
      {!detail ? <div style={{color:'var(--muted)'}}>Select an alert</div> : (
        <div style={{display:'grid', gap:10}}>
          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <Pill tone={tone(detail.severity) as any} text={detail.severity} />
            <div style={{fontWeight:800}}>{detail.alert_type}</div>
            <Pill tone={detail.status === 'open' ? 'warn' : detail.status === 'resolved' ? 'ok' : 'info'} text={detail.status} />
          </div>
          <div style={{color:'var(--muted)'}}>{detail.description}</div>
          <div style={{color:'var(--muted)'}}>Entity: <span style={{color:'var(--text)'}}>{detail.entity_type}</span></div>
          <div style={{color:'var(--muted)'}}>Entity ID: <span style={{color:'var(--text)'}}>{detail.entity_id || '-'}</span></div>
          <hr />
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button style={btnPrimaryStyle} onClick={ack} disabled={detail.status !== 'open'}>Acknowledge</button>
            <button style={btnPrimaryStyle} onClick={resolve} disabled={detail.status === 'resolved'}>Resolve</button>
          </div>
        </div>
      )}
    </Panel>
  )

  return <SplitPane left={left} right={right} />
}
