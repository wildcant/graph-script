import { render } from 'preact'
import { Workspace } from './components/Workspace'
import { Sidebar } from './components/Sidebar'

function App() {
  return (
    <main>
      <Workspace />
      <Sidebar />
    </main>
  )
}

render(<App />, document.getElementById('app'))
