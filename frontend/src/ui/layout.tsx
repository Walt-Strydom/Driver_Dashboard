import React, { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppStore } from '../ui/store'

const navItems = [
  { to: '/', label: 'Overview' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/dispatch', label: 'Dispatch' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/reports', label: 'Reports' },
  { to: '/admin', label: 'Admin' },
  { to: '/audit', label: 'Audit log' },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { globalQuery, setGlobalQuery } = useAppStore()

  const quickHint = useMemo(() => {
    if (location.pathname.startsWith('/jobs')) return 'Search jobs, customers, sites'
    if (location.pathname.startsWith('/drivers')) return 'Search drivers, staff IDs'
    if (location.pathname.startsWith('/vehicles')) return 'Search vehicles, fleet IDs'
    return 'Search jobs, drivers, vehicles'
  }, [location.pathname])

  return (
    <div style={{display:'grid', gridTemplateColumns:'260px 1fr', height:'100%'}}>
      <aside style={{borderRight:'1px solid var(--border)', background:'var(--panel2)', padding:'14px 10px'}}>
        <div style={{padding:'10px 10px', fontWeight:700, letterSpacing:0.3}}>Ops Console</div>
        <nav style={{display:'flex', flexDirection:'column', gap:2, padding:'6px'}}>
          {navItems.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              style={({isActive})=>({
                padding:'10px 10px',
                borderRadius:10,
                background: isActive ? 'rgba(96,165,250,0.16)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--muted)',
              })}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div style={{display:'grid', gridTemplateRows:'56px 1fr', minWidth:0}}>
        <header style={{display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--panel)'}}>
          <div style={{display:'flex', gap:10, alignItems:'center', minWidth:0, flex:1}}>
            <div style={{fontWeight:700, whiteSpace:'nowrap'}}>Command</div>
            <div style={{flex:1, minWidth:0}}>
              <input
                value={globalQuery}
                onChange={(e)=>setGlobalQuery(e.target.value)}
                placeholder={quickHint}
                style={{
                  width:'100%',
                  padding:'10px 12px',
                  borderRadius:10,
                  border:'1px solid var(--border)',
                  outline:'none',
                  background:'#0b1220',
                  color:'var(--text)',
                }}
              />
            </div>
            <div className="kbd">Ctrl K</div>
          </div>

          <button style={btnStyle}>Create</button>
          <button style={iconBtnStyle} title="Notifications">🔔</button>
          <button style={iconBtnStyle} title="User">👤</button>
        </header>

        <main style={{minWidth:0, minHeight:0}}>
          {children}
        </main>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding:'9px 12px',
  borderRadius:10,
  border:'1px solid var(--border)',
  background:'rgba(96,165,250,0.18)',
  color:'var(--text)',
  cursor:'pointer',
}

const iconBtnStyle: React.CSSProperties = {
  padding:'9px 10px',
  borderRadius:10,
  border:'1px solid var(--border)',
  background:'#0b1220',
  color:'var(--text)',
  cursor:'pointer',
}
