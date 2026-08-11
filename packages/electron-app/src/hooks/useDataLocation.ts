import { useCallback, useEffect, useState } from 'react'

interface DataLocation {
  path: string
  isCustom: boolean
}

export function useDataLocation() {
  const [location, setLocation] = useState<DataLocation | null>(null)

  useEffect(() => {
    window.api.dataLocation.get().then(setLocation)
  }, [])

  const pick = useCallback(async () => {
    const next = await window.api.dataLocation.pick()
    if (next) setLocation(next)
    return next
  }, [])

  const reset = useCallback(async () => {
    setLocation(await window.api.dataLocation.reset())
  }, [])

  return { location, pick, reset }
}
