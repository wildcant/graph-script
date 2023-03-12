import { html } from 'https://npm.reversehttp.com/@preact/signals-core,@preact/signals,htm/preact,preact,preact/hooks,preact/compat'
import { Workspace } from './components/workspace.mjs'

export function Dashboard() {
  return html`<${Workspace} />`
}
