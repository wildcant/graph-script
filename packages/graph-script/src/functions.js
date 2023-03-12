import { all, cond, curry, equals, ifElse, is, isNil, map, path, product, split, startsWith, sum } from 'ramda'

export const functions = {
  sum,
  product,
  ternary: ([test, pass, fail]) => (test ? pass : fail),
  isNil,
  and: (args) => all(equals(true))(args)
}

const getPath = split('.')
const resolveInputParamValue = curry((inputs, param) => path(getPath(param), { inputs }))
const resolveGraphResultsPropertyValue = curry((results, param) => path(getPath(param), results))
const resolveStringParam = (inputs, currentResults) =>
  ifElse(startsWith('inputs'), resolveInputParamValue(inputs), resolveGraphResultsPropertyValue(currentResults))

export const resolveFunctionNode = (inputs, currentResults, node) => {
  const resolveParam = cond([
    [is(Number) || is(Boolean), (param) => param],
    [is(String), resolveStringParam(inputs, currentResults)]
  ])

  if (node.fn === 'isNil') {
    const param = resolveParam(node.param)
    return functions[node.fn](param)
  } else {
    const resolveParams = map(resolveParam)
    const params = resolveParams(node.params)

    return functions[node.fn](params)
  }
}
