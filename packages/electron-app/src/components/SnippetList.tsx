import { Diamond } from 'lucide-react'
import type { Category, Snippet } from '@snippet/core'
import type { TranslationKey } from '../i18n'
import { getCategoryPath } from '../lib/categoryTree'

interface Props {
  snippets: Snippet[]
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export function SnippetList({ snippets, categories, selectedId, onSelect, t }: Props) {
  return (
    <div className="list-pane">
      {snippets.length === 0 ? (
        <div className="empty-state">{t('noSnippets')}</div>
      ) : (
        <ul className="snippet-list">
          {snippets.map((snippet) => {
            const categoryPath = getCategoryPath(categories, snippet.categoryId)
            return (
              <li key={snippet.id}>
                <button
                  className={`snippet-row ${snippet.id === selectedId ? 'selected' : ''}`}
                  onClick={() => onSelect(snippet.id)}
                >
                  <div className="snippet-row-title">
                    {snippet.pinned && <Diamond size={9} className="pin-dot" fill="currentColor" />}
                    {snippet.title}
                  </div>
                  <div className="snippet-row-meta">
                    {[snippet.language, categoryPath, `${snippet.tags.length} ${t('tags').toLowerCase()}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
