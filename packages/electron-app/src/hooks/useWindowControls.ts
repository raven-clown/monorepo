import { useEffect, useState } from 'react'

export function useWindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.api.windowControls.isMaximized().then(setMaximized)
    return window.api.windowControls.onMaximizedChange(setMaximized)
  }, [])

  return {
    maximized,
    minimize: () => window.api.windowControls.minimize(),
    maximize: () => window.api.windowControls.maximize(),
    close: () => window.api.windowControls.close(),
  }
}
