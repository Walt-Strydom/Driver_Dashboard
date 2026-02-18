import React from 'react'
import { Panel } from '../ui/table'

export default function Placeholder({ title }: { title: string }) {
  return (
    <div style={{padding:12}}>
      <Panel title={title}>
        <div style={{color:'var(--muted)', lineHeight:1.5}}>
          Phase 1 scaffold.
          <br />
          This module is planned for Phase 2+.
        </div>
      </Panel>
    </div>
  )
}
