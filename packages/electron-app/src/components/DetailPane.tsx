import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Copy as CopyIcon, Diamond, MoreHorizontal } from 'lucide-react'
import type { Category, Snippet } from '@snippet/core'
import type { TranslationKey } from '../i18n'
import { buildCodeLines } from '../lib/highlightCode'
import { getCategoryPath } from '../lib/categoryTree'

interface Props {
  snippet: Snippet | null
  categories: Category[]
  isCompact: boolean
  onBack: () => void
  onTogglePin: (snippet: Snippet) => void
  onEdit: (snippet: Snippet) => void
  onExport: (snippet: Snippet) => void
  onToggleHidden: (snippet: Snippet) => void
  onDelete: (snippet: Snippet) => void
  onUpdateCode: (snippet: Snippet, code: string) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export function DetailPane({
  snippet,
  categories,
  isCompact,
  onBack,
  onTogglePin,
  onEdit,
  onExport,
  onToggleHidden,
  onDelete,
  onUpdateCode,
  t,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingCode, setEditingCode] = useState(false)
  const [codeValue, setCodeValue] = useState(snippet?.code ?? '')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onClickAway)
    return () => document.removeEventListener('click', onClickAway)
  }, [menuOpen])

  if (!snippet) {
    return (
      <div className="detail-pane">
        <div className="select-prompt">{t('selectSnippet')}</div>
      </div>
    )
  }

  async function copy() {
    await navigator.clipboard.writeText(snippet!.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function commitCode() {
    setEditingCode(false)
    if (snippet && codeValue !== snippet.code) {
      onUpdateCode(snippet, codeValue)
    }
  }

  const lines = buildCodeLines(snippet.code)
  const categoryPath = getCategoryPath(categories, snippet.categoryId)

  return (
    <div className="detail-pane">
      {isCompact && (
        <button className="back-to-list" onClick={onBack}>
          <ArrowLeft size={14} />
          {t('back')}
        </button>
      )}
      <div className="detail-header-row">
        <div className="detail-title-wrap">
          <button
            className={`pin-btn ${snippet.pinned ? 'active' : ''}`}
            onClick={() => onTogglePin(snippet)}
            aria-label={snippet.pinned ? t('unpinSnippet') : t('pinSnippet')}
            title={snippet.pinned ? t('unpinSnippet') : t('pinSnippet')}
          >
            <Diamond size={15} fill={snippet.pinned ? 'currentColor' : 'none'} />
          </button>
          <h2 className="detail-title">{snippet.title}</h2>
        </div>

        <div className="detail-actions" ref={menuRef}>
          {confirmingDelete ? (
            <div className="confirm-wrap">
              <span className="confirm-text">{t('confirmDelete')}</span>
              <button className="danger" onClick={() => onDelete(snippet)}>
                {t('yes')}
              </button>
              <button onClick={() => setConfirmingDelete(false)}>{t('no')}</button>
            </div>
          ) : (
            <>
              <button className={copied ? 'primary' : ''} onClick={copy} aria-label={copied ? t('copied') : t('copy')}>
                {copied ? <Check size={13} /> : <CopyIcon size={13} />}
                {!isCompact && (copied ? t('copied') : t('copy'))}
              </button>
              <div className="action-menu-wrap">
                <button className="icon-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="More actions">
                  <MoreHorizontal size={15} />
                </button>
                {menuOpen && (
                  <div className="action-menu glass-strong">
                    <button className="menu-item" onClick={() => { setMenuOpen(false); onEdit(snippet) }}>
                      {t('edit')}
                    </button>
                    <button className="menu-item" onClick={() => { setMenuOpen(false); onExport(snippet) }}>
                      {t('exportThisSnippet')}
                    </button>
                    <button className="menu-item" onClick={() => { setMenuOpen(false); onToggleHidden(snippet) }}>
                      {snippet.hiddenInVscode ? t('showInVscode') : t('hideFromVscode')}
                    </button>
                    <button
                      className="menu-item menu-item-danger"
                      onClick={() => { setMenuOpen(false); setConfirmingDelete(true) }}
                    >
                      {t('delete')}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="detail-meta">
        <span className="meta-chip">{snippet.language}</span>
        {categoryPath && <span className="meta-chip">{categoryPath}</span>}
        {snippet.tags.map((tag) => (
          <span className="tag-chip" key={tag}>
            {tag}
          </span>
        ))}
        {snippet.hiddenInVscode && <span className="tag-chip">{t('hiddenBadge')}</span>}
      </div>

      {editingCode ? (
        <textarea
          className="code-block code-edit-area"
          value={codeValue}
          autoFocus
          spellCheck={false}
          onChange={(e) => setCodeValue(e.target.value)}
          onBlur={commitCode}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setCodeValue(snippet.code)
              setEditingCode(false)
            }
          }}
        />
      ) : (
        <pre className="code-block code-block-editable" onClick={() => setEditingCode(true)} tabIndex={0}>
          {lines.map((line) => (
            <div className="code-line" key={line.num}>
              <span className="line-num">{line.num}</span>
              <span className="line-content">
                {line.tokens.map((tok) => (
                  <span key={tok.key} className={`tok-${tok.kind}`}>
                    {tok.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </pre>
      )}
    </div>
  )
}
