import { Copy, Minus, Square, X } from 'lucide-react'
import { useWindowControls } from '../hooks/useWindowControls'

interface Props {
  title: string
}

export function TitleBar({ title }: Props) {
  const { maximized, minimize, maximize, close } = useWindowControls()

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-mark">
          <img src="/icon.png" alt="" width={14} height={14} />
        </span>
        <span className="titlebar-text">{title}</span>
      </div>
      <div className="titlebar-controls">
        <button className="win-btn" onClick={minimize} aria-label="Minimize">
          <Minus size={13} />
        </button>
        <button className="win-btn" onClick={maximize} aria-label={maximized ? 'Restore' : 'Maximize'}>
          {maximized ? <Copy size={11} /> : <Square size={11} />}
        </button>
        <button className="win-btn win-btn-close" onClick={close} aria-label="Close">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
