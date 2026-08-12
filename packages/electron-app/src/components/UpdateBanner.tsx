import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useUpdater } from '../hooks/useUpdater'
import type { TranslationKey } from '../i18n'

interface Props {
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export function UpdateBanner({ t }: Props) {
  const { status, download, install } = useUpdater()
  const [dismissed, setDismissed] = useState(false)

  if (!status || dismissed || status.status === 'not-available' || status.status === 'error') {
    return null
  }

  let label: string
  let action: { label: string; onClick: () => void } | null = null
  let percent: number | null = null
  let spinning = false

  if (status.status === 'checking') {
    label = t('updateChecking')
    spinning = true
  } else if (status.status === 'available') {
    label = t('updateAvailable', { version: status.version })
    action = { label: t('downloadUpdate'), onClick: download }
  } else if (status.status === 'downloading') {
    label = t('updateDownloading', { percent: status.percent })
    percent = status.percent
  } else {
    label = t('updateReady', { version: status.version })
    action = { label: t('restartToUpdate'), onClick: install }
  }

  return (
    <div className="update-banner glass-strong">
      <div className="update-banner-text">
        {spinning && <Loader2 size={14} className="spin" />}
        <span>{label}</span>
        {percent !== null && (
          <span className="update-progress-track">
            <span className="update-progress-fill" style={{ width: `${percent}%` }} />
          </span>
        )}
      </div>
      <div className="update-banner-actions">
        {action && (
          <button className="primary" onClick={action.onClick}>
            {action.label}
          </button>
        )}
        <button className="icon-btn" onClick={() => setDismissed(true)} aria-label={t('dismiss')}>
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
