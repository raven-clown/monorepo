import { useState } from 'react'
import { useUpdater } from '../hooks/useUpdater'
import type { TranslationKey } from '../i18n'

interface Props {
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export function UpdateBanner({ t }: Props) {
  const { status, download, install } = useUpdater()
  const [dismissed, setDismissed] = useState(false)

  if (!status || dismissed || status.status === 'checking' || status.status === 'not-available') {
    return null
  }
  if (status.status === 'error') {
    return null
  }

  let label: string
  let action: { label: string; onClick: () => void } | null = null

  if (status.status === 'available') {
    label = t('updateAvailable', { version: status.version })
    action = { label: t('downloadUpdate'), onClick: download }
  } else if (status.status === 'downloading') {
    label = t('updateDownloading', { percent: status.percent })
  } else {
    label = t('updateReady', { version: status.version })
    action = { label: t('restartToUpdate'), onClick: install }
  }

  return (
    <div className="update-banner">
      <span>{label}</span>
      <div className="update-banner-actions">
        {action && (
          <button className="primary" onClick={action.onClick}>
            {action.label}
          </button>
        )}
        <button onClick={() => setDismissed(true)}>{t('dismiss')}</button>
      </div>
    </div>
  )
}
