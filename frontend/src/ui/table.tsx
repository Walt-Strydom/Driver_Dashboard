import React from 'react'

export function Pill({ tone, text }: { tone: 'ok'|'warn'|'danger'|'muted'|'info', text: string }) {
  const bg = tone === 'ok' ? 'rgba(52,211,153,0.18)'
    : tone === 'warn' ? 'rgba(251,191,36,0.18)'
    : tone === 'danger' ? 'rgba(248,113,113,0.18)'
    : tone === 'info' ? 'rgba(96,165,250,0.18)'
    : 'rgba(156,163,175,0.12)'
  const border = tone === 'ok' ? 'rgba(52,211,153,0.35)'
    : tone === 'warn' ? 'rgba(251,191,36,0.35)'
    : tone === 'danger' ? 'rgba(248,113,113,0.35)'
    : tone === 'info' ? 'rgba(96,165,250,0.35)'
    : 'rgba(156,163,175,0.25)'

  return (
    <span style={{padding:'2px 8px', borderRadius:999, border:`1px solid ${border}`, background:bg, fontSize:12, color:'var(--text)'}}>
      {text}
    </span>
  )
}

export function Panel({ title, children, right }: { title: string, children: React.ReactNode, right?: React.ReactNode }) {
  return (
    <div style={{background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', minHeight:0}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderBottom:'1px solid var(--border)'}}>
        <div style={{fontWeight:700}}>{title}</div>
        <div>{right}</div>
      </div>
      <div style={{padding:12, minHeight:0}}>
        {children}
      </div>
    </div>
  )
}

export function SplitPane({ left, right }: { left: React.ReactNode, right: React.ReactNode }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:12, padding:12, height:'100%', minHeight:0}}>
      <div style={{minWidth:0, minHeight:0}}>{left}</div>
      <div style={{minWidth:0, minHeight:0}}>{right}</div>
    </div>
  )
}

export function ToolbarRow({ children }: { children: React.ReactNode }) {
  return <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:10}}>{children}</div>
}

export const inputStyle: React.CSSProperties = {
  padding:'9px 10px',
  borderRadius:10,
  border:'1px solid var(--border)',
  background:'#0b1220',
  color:'var(--text)',
  outline:'none',
}

export const btnStyle: React.CSSProperties = {
  padding:'9px 10px',
  borderRadius:10,
  border:'1px solid var(--border)',
  background:'#0b1220',
  color:'var(--text)',
  cursor:'pointer',
}

export const btnPrimaryStyle: React.CSSProperties = {
  ...btnStyle,
  background:'rgba(96,165,250,0.18)',
}
