import { curry, reduce } from 'ramda'
import { resolveConstantNode } from './constant.js'
import { resolveFunctionNode } from './functions.js'
// import graphInputs from './json/rental-math-inputs.json'
// import { graphFlow } from './dev-only/imports.mjs'

const resolveNode = (inputs, currentResults, node) => {
  if (node.type === 'function') {
    return resolveFunctionNode(inputs, currentResults, node)
  } else if (node.type === 'constant') {
    return resolveConstantNode(node)
  }
  return 'node type not found'
}

const resolveGraph = curry((inputs, currentResults, node) => ({
  ...currentResults,
  [node.name]: resolveNode(inputs, currentResults, node)
}))

export const computeGraph = (inputs, graph) => reduce(resolveGraph(inputs), {}, graph)

// console.log(computeGraph({}, graphFlow))
