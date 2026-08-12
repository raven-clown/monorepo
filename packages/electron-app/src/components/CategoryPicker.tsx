import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Category } from '@snippet/core'
import type { TranslationKey } from '../i18n'
import { flattenWithDepth } from '../lib/categoryTree'

interface Props {
  categories: Category[]
  value: string | null
  onChange: (categoryId: string | null) => void
  onCreate: (name: string, parentId: string | null) => Promise<Category>
  t: (key: TranslationKey) => string
}

export function CategoryPicker({ categories, value, onChange, onCreate, t }: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const flat = flattenWithDepth(categories)

  async function commitCreate() {
    if (newName.trim()) {
      const created = await onCreate(newName.trim(), null)
      onChange(created.id)
    }
    setCreating(false)
    setNewName('')
  }

  if (creating) {
    return (
      <div className="settings-row">
        <input
          autoFocus
          placeholder={t('newCategoryPlaceholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitCreate()
            if (e.key === 'Escape') setCreating(false)
          }}
        />
        <button className="primary" onClick={commitCreate}>
          {t('save')}
        </button>
        <button onClick={() => setCreating(false)}>{t('cancel')}</button>
      </div>
    )
  }

  return (
    <div className="settings-row">
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{t('uncategorized')}</option>
        {flat.map(({ category, depth }) => (
          <option key={category.id} value={category.id}>
            {'  '.repeat(depth)}
            {category.name}
          </option>
        ))}
      </select>
      <button type="button" className="icon-btn" onClick={() => setCreating(true)} aria-label={t('newCategory')}>
        <Plus size={14} />
      </button>
    </div>
  )
}
