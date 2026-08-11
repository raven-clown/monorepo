import { useEffect, useState } from 'react'

type UpdateStatus =
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'not-available' }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => window.api.updates.onStatus(setStatus), [])

  return {
    status,
    download: () => window.api.updates.download(),
    install: () => window.api.updates.install(),
    recheck: () => window.api.updates.check(),
  }
}
