import { forwardRef } from 'preact/compat'
import { useEffect, useRef, useState } from 'preact/hooks'
import { graphFlow } from '../dev-only/imports'
import * as R from 'ramda'

const PORT_SIZE = 10
const PORT_PADDING_TOP = 3
const getPortYPos = (ports, nodeHeight, inputPortIndex) =>
  ports === 1 ? (nodeHeight - PORT_SIZE) / 2 : PORT_PADDING_TOP + ((nodeHeight / ports) * inputPortIndex + 1)

const FlowNodeShell = forwardRef((props, ref) => {
  const { id, x, y, position = { x, y }, icon, label, bg, inputs, outputs, width, height } = props
  return (
    <g ref={ref} id={id} class='node' transform={`translate(${position?.x ?? x}, ${position?.y ?? y})`}>
      <rect class='node-background' rx='5' ry='5' fill={bg} width={width} height={height} />

      <g id='node-icon-group' x='0' y='0'>
        <rect x='0' y='0' class='node-icon-background' fill='black' fillOpacity='0.05' height={height} width='30' />
        <image href={icon} width='20' height='36' x='5' y={(height - 36) / 2} />
        <path d='M 29.5 0.5 l 0 29' class='node-icon-divider' />
      </g>

      <g class='node-label' transform='translate(38,20)'>
        <text class='node-label-text' x='0' y={(height - 36) / 2}>
          {label}{' '}
        </text>
      </g>

      <g id='node-input-ports'>
        {R.range(0, inputs).map((input, idx) => (
          <g key={input} class='node-port-input' transform={`translate(-5, ${getPortYPos(inputs, height, idx)})`}>
            <rect class='node-port' rx='3' ry='3' width={PORT_SIZE} height={PORT_SIZE} data-node-id={id} />
          </g>
        ))}
      </g>

      <g id='node-output-ports'>
        {R.range(0, outputs).map((output, idx) => (
          <g key={output} class='node-port-output' transform={`translate(95,${getPortYPos(outputs, height, idx)})`}>
            <rect class='node-port' rx='3' ry='3' width={PORT_SIZE} height={PORT_SIZE} data-node-id={id} />
          </g>
        ))}
      </g>
    </g>
  )
})

const FlowNode = forwardRef((props, ref) => {
  switch (props.type) {
    case 'function':
      return (
        <FlowNodeShell
          ref={ref}
          bg='#fdd0a2'
          icon='/public/assets/icons/function.svg'
          label={props.name}
          type='function'
          {...props}
        />
      )
    case 'constant':
      return (
        <FlowNodeShell
          ref={ref}
          bg='#a6bbcf'
          icon='/public/assets/icons/constant.svg'
          label={props.name}
          type='constant'
          {...props}
        />
      )
    case 'debug':
      return (
        <FlowNodeShell
          ref={ref}
          bg='#4B8400'
          icon='/public/assets/icons/debug.svg'
          label={props.name}
          type='debug'
          {...props}
        />
      )
    default:
      throw new Error('Unknown node type.')
  }
})

/**
 * A link is an svg path that goes from an output port (output node) to an input port (input node).
 * TODO: Use curve instead of line.
 */
const FlowLink = forwardRef((props, ref) => {
  const { id, inputNode, outputNode, inputPortIndex, outputPortIndex } = props
  const computeMoveTo = (node) =>
    `${node.x + node.width} ${node.y + getPortYPos(node.outputs, node.height, outputPortIndex) + PORT_SIZE / 2}`
  const computeLineTo = (node) =>
    `${node.x} ${node.y + getPortYPos(node.inputs, node.height, inputPortIndex) + PORT_SIZE / 2}`

  return (
    <g class='flow-link' ref={ref} id={id}>
      <path class='flow-link-line' d={`M ${computeMoveTo(outputNode)} L ${computeLineTo(inputNode)}`} />
    </g>
  )
})

const GRID_CELL_WIDTH = 20
function Grid() {
  const rows = R.range(0, 250).map((_, idx) => (
    <line key={`row-${idx}`} x1='0' x2='5000' y1={idx * GRID_CELL_WIDTH} y2={idx * GRID_CELL_WIDTH} />
  ))
  const columns = R.range(0, 250).map((_, idx) => (
    <line key={`col-${idx}`} x1={idx * GRID_CELL_WIDTH} x2={idx * GRID_CELL_WIDTH} y1='0' y2='5000' />
  ))

  return (
    <g class='workspace-grid'>
      {rows}
      {columns}{' '}
    </g>
  )
}

export function Workspace() {
  const nodesRefs = useRef(null)
  const linksRefs = useRef(null)
  const eventsLayer = useRef(null)
  const focusedElement = useRef(null)
  const dragging = useRef({ nodeId: null, offset: new Map() })

  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])

  const getNodesRefs = () => {
    if (!nodesRefs.current) {
      nodesRefs.current = new Map()
    }

    return nodesRefs.current
  }

  const initializeNode = (node, nodeRef) => {
    const nodesMap = getNodesRefs()
    if (nodeRef) {
      nodesMap.set(node.id, nodeRef)
    } else {
      nodesMap.delete(node.id)
    }
  }

  const getLinksRefs = () => {
    if (!linksRefs.current) {
      linksRefs.current = new Map()
    }

    return linksRefs.current
  }

  const initializeLink = (link, linkRef) => {
    const linksMap = getLinksRefs()
    if (linkRef) {
      linksMap.set(link.id, linkRef)
    } else {
      linksMap.delete(link.id)
    }
  }

  const resolveLinksFromNodes = (loadedNodes) => {
    return loadedNodes
      .map((outputNode) =>
        outputNode.wires?.map((wire, wireIndex) => {
          const inputNode = loadedNodes.find((n) => n.id === wire)
          if (!inputNode) return null

          return {
            id: `${inputNode.id}-${outputNode.id}`,
            inputNode,
            outputNode,
            inputPortIndex: inputNode.wiresIn.findIndex((wi) => wi === outputNode.id),
            outputPortIndex: wireIndex
          }
        })
      )
      .flat()
      .filter(Boolean)
  }

  const loadGraph = (graph) => {
    const loadedNodes = graph.map((node) => ({
      ...node,
      wiresIn: graph.filter((n) => n.wires?.includes(node.id)).map((n) => n.id)
    }))
    setNodes(loadedNodes)
    setLinks(resolveLinksFromNodes(loadedNodes))
  }

  useEffect(() => {
    loadGraph(graphFlow)

    // Focus/unfocus nodes or links on click.
    window.addEventListener('mousedown', (e) => {
      const flowNodes = Object.values(Object.fromEntries(getNodesRefs()))
      const flowLinks = Object.values(Object.fromEntries(getLinksRefs()))
      const clickableElements = flowNodes.concat(flowLinks)
      const selectedElement = clickableElements.find((el) => el.contains(e.target))
      console.log({ selectedElement })
      clickableElements.forEach((el) => {
        if (el.classList.contains('focus') && el !== selectedElement) {
          el.classList.remove('focus')
        }
      })

      if (selectedElement) {
        selectedElement.classList.add('focus')
        focusedElement.current = {
          type: selectedElement.classList.contains('node') ? 'node' : 'link',
          id: selectedElement.getAttribute('id')
        }
      } else {
        focusedElement.current = null
      }
    })

    // Remove node and link on back press when focused.
    window.addEventListener('keydown', (e) => {
      const el = focusedElement.current
      console.log(el)
      if (el?.id && e.key === 'Backspace') {
        if (el.type === 'node') {
          setNodes((s) => s.filter((n) => n.id !== el.id))
          setLinks((s) => s.filter((l) => !l.id.includes(el.id)))
        } else if (el.type === 'link') {
          setLinks((s) => s.filter((l) => l.id !== el.id))
        }
      }
    })

    /** Mouse position within the eventsLayer. */
    const getMousePosition = (e) => {
      const containerDomMatrix = eventsLayer.current.getScreenCTM()

      if (R.isNil(containerDomMatrix)) return { x: e.clientX, y: e.clientY }

      return {
        x: (e.clientX - containerDomMatrix.e) / containerDomMatrix.a,
        y: (e.clientY - containerDomMatrix.f) / containerDomMatrix.d
      }
    }

    const handleMouseMove = (e) => {
      const { nodeId, offset } = dragging.current
      if (!nodeId) return

      const mousePosition = getMousePosition(e)
      const dx = mousePosition.x - offset.get('x')
      const dy = mousePosition.y - offset.get('y')

      // Allow dragging only withing the container boundaries.
      const boundaries = { x: eventsLayer.current.offsetHeight, y: eventsLayer.current.offsetWidth }
      if (dx < 0 || dx > boundaries.x || dy < 0 || dy > boundaries.y) return

      setNodes((ns) => {
        const nodeIndex = ns.findIndex((n) => n.id === nodeId)
        const node = ns[nodeIndex]
        if (!node) return ns

        const updatedNode = { ...node, x: dx, y: dy }

        // Update node's links position.
        setLinks((ls) =>
          ls
            .filter((l) => l.inputNode.id !== nodeId && l.outputNode.id !== nodeId)
            .concat(ls.filter((l) => l.inputNode.id === nodeId).map((l) => ({ ...l, inputNode: updatedNode })))
            .concat(ls.filter((l) => l.outputNode.id === nodeId).map((l) => ({ ...l, outputNode: updatedNode })))
        )

        // Update node position.
        return ns
          .slice(0, nodeIndex)
          .concat([updatedNode])
          .concat(ns.slice(nodeIndex + 1, ns.length))
      })
    }

    // Enable nodes dragging.
    eventsLayer.current.addEventListener('mousedown', (e) => {
      const flowNodes = Object.values(Object.fromEntries(getNodesRefs()))
      const activeNode = flowNodes.find((el) => el.contains(e.target))
      if (activeNode) {
        // Set the current offset of the mouse in the screen.
        const mousePosition = getMousePosition(e)
        const transform = activeNode.transform.baseVal.getItem(0)
        dragging.current.nodeId = activeNode.getAttribute('id')
        dragging.current.offset.set('x', mousePosition.x - transform.matrix.e)
        dragging.current.offset.set('y', mousePosition.y - transform.matrix.f)

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', () => window.removeEventListener('mousemove', handleMouseMove), {
          once: true
        })
      }
    })
  }, [])

  return (
    <div className='workspace-container'>
      <svg width='5000' height='5000' class='workspace'>
        <g ref={eventsLayer} id='workspace-event-layer'>
          <Grid />
          <g>
            {nodes.map((node) => (
              <FlowNode key={node.id} ref={(ref) => initializeNode(node, ref)} {...node} />
            ))}
          </g>
          <g>
            {links.map((link) => (
              <FlowLink key={link.id} ref={(ref) => initializeLink(link, ref)} {...link} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  )
}
