import { useEffect, useState } from 'react'

export type WidthMode = 'compact' | 'medium' | 'wide'

function getWidthMode(width: number): WidthMode {
  if (width < 900) return 'compact'
  if (width < 1400) return 'medium'
  return 'wide'
}

export function useWindowWidth(): WidthMode {
  const [mode, setMode] = useState<WidthMode>(() => getWidthMode(window.innerWidth))

  useEffect(() => {
    const onResize = () => setMode(getWidthMode(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return mode
}
