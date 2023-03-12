import { useState } from 'preact/hooks'
import { Button } from './Button'
import { graphFlow } from '../dev-only/imports'
import { computeGraph } from '@graph-script/core/src/index'

export function Sidebar() {
  const [logs, setLogs] = useState([])
  const simulate = () => {
    setLogs((s) => s.concat([computeGraph({}, graphFlow)]))
  }
  return (
    <div class='sidebar-container'>
      <div class='flex justify-between items-center' style={{ gap: 10 }}>
        <h4>Debug</h4>
        <Button onClick={simulate}>Run</Button>
      </div>
      <div class='logs-container'>
        <div class='logs'>
          {logs.map((log, idx) => (
            <pre key={idx} class='log'>
              {JSON.stringify(log, null, 2)}
            </pre>
          ))}
        </div>
      </div>
    </div>
  )
}
