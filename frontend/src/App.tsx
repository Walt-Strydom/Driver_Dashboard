import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from './ui/layout'
import Overview from './views/Overview'
import Jobs from './views/Jobs'
import Drivers from './views/Drivers'
import Vehicles from './views/Vehicles'
import Alerts from './views/Alerts'
import AuditLog from './views/AuditLog'
import Placeholder from './views/Placeholder'
import { WS_URL } from './ui/api'

export default function App() {
  useEffect(() => {
    // Basic websocket connection for live toasts (Phase 1)
    const ws = new WebSocket(WS_URL)
    ws.onopen = () => ws.send('ping')
    ws.onmessage = (ev) => {
      // eslint-disable-next-line no-console
      console.log('[ws]', ev.data)
    }
    const t = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping')
    }, 15000)
    return () => { clearInterval(t); ws.close() }
  }, [])

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/dispatch" element={<Placeholder title="Dispatch" />} />
        <Route path="/reports" element={<Placeholder title="Reports" />} />
        <Route path="/admin" element={<Placeholder title="Admin" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
