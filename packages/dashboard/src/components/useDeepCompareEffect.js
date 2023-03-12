import { useMemo, useRef, useEffect } from 'preact/hooks'
import * as R from 'ramda'

function isPrimitive(val) {
  return val == null || /^[sbn]/.test(typeof val)
}

function checkDeps(deps) {
  if (!deps || !deps.length) {
    throw new Error('useDeepCompareEffect should not be used with no dependencies. Use React.useEffect instead.')
  }
  if (deps.every(isPrimitive)) {
    throw new Error(
      'useDeepCompareEffect should not be used with dependencies that are all primitive values. Use React.useEffect instead.'
    )
  }
}

/**
 * @param value the value to be memoized (usually a dependency list)
 * @returns a memoized version of the value as long as it remains deeply equal
 */
function useDeepCompareMemoize(value) {
  const ref = useRef(value)
  const signalRef = useRef(0)

  if (!R.equals(value, ref.current)) {
    ref.current = value
    signalRef.current += 1
  }

  return useMemo(() => ref.current, [signalRef.current])
}

export function useDeepCompareEffect(callback, dependencies) {
  // if (process.env.NODE_ENV !== 'production') {
  checkDeps(dependencies)
  // }

  return useEffect(callback, useDeepCompareMemoize(dependencies))
}
