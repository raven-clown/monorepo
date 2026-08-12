import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Diamond, Folder, FolderOpen, Plus } from 'lucide-react'
import type { Category, NewCategoryInput } from '@snippet/core'
import type { TranslationKey } from '../i18n'
import { buildTree, type CategoryNode } from '../lib/categoryTree'

interface ContextMenuState {
  id: string
  x: number
  y: number
}

interface Props {
  categories: Category[]
  activeId: string | null
  onSelect: (id: string | null) => void
  onAdd: (input: NewCategoryInput) => Promise<Category>
  onRename: (id: string, name: string) => Promise<void>
  onSetPinned: (id: string, pinned: boolean) => Promise<void>
  onReorder: (id: string, direction: 'up' | 'down') => Promise<void>
  onDelete: (id: string) => Promise<void>
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export function CategoryTree({
  categories,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onSetPinned,
  onReorder,
  onDelete,
  t,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [creatingParentId, setCreatingParentId] = useState<string | null | undefined>(undefined)
  const [createValue, setCreateValue] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const onClickAway = () => setMenu(null)
    document.addEventListener('click', onClickAway)
    return () => document.removeEventListener('click', onClickAway)
  }, [menu])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function startRename(category: Category) {
    setMenu(null)
    setRenamingId(category.id)
    setRenameValue(category.name)
  }

  async function commitRename() {
    if (renamingId && renameValue.trim()) {
      await onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  function startCreate(parentId: string | null) {
    setMenu(null)
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId))
    setCreatingParentId(parentId)
    setCreateValue('')
  }

  async function commitCreate() {
    if (createValue.trim()) {
      const created = await onAdd({ name: createValue.trim(), parentId: creatingParentId ?? null })
      onSelect(created.id)
    }
    setCreatingParentId(undefined)
  }

  const pinned = categories.filter((c) => c.pinned)
  const tree = buildTree(categories)

  function renderNode(node: CategoryNode, depth: number) {
    const isExpanded = expanded.has(node.id)
    const hasChildren = node.children.length > 0
    const isRenaming = renamingId === node.id

    return (
      <div key={node.id}>
        <div
          className="tree-row"
          style={{ paddingLeft: 8 + depth * 16 }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ id: node.id, x: e.clientX, y: e.clientY })
          }}
        >
          <button
            className="tree-disclosure"
            onClick={() => (hasChildren ? toggle(node.id) : undefined)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>

          {isRenaming ? (
            <input
              className="tree-rename-input"
              value={renameValue}
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setRenamingId(null)
              }}
            />
          ) : (
            <button
              className={`filter-item tree-label ${activeId === node.id ? 'active' : ''}`}
              onClick={() => onSelect(node.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ id: node.id, x: e.clientX, y: e.clientY })
              }}
            >
              {isExpanded ? <FolderOpen size={13} /> : <Folder size={13} />}
              <span className="tree-label-text">{node.name}</span>
              {node.pinned && <Diamond size={8} className="pin-dot" fill="currentColor" />}
            </button>
          )}
        </div>

        {creatingParentId === node.id && (
          <div className="tree-row" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
            <span className="tree-disclosure" style={{ visibility: 'hidden' }} />
            <input
              className="tree-rename-input"
              placeholder={t('newCategoryPlaceholder')}
              value={createValue}
              autoFocus
              onChange={(e) => setCreateValue(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate()
                if (e.key === 'Escape') setCreatingParentId(undefined)
              }}
            />
          </div>
        )}

        {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  const menuCategory = menu ? categories.find((c) => c.id === menu.id) : null

  return (
    <div className="category-tree">
      {pinned.length > 0 && (
        <div className="filter-group">
          <div className="filter-group-header static">
            <span className="filter-group-title">{t('pinned')}</span>
          </div>
          <div className="filter-list">
            {pinned.map((c) => (
              <button
                key={c.id}
                className={`filter-item ${activeId === c.id ? 'active' : ''}`}
                onClick={() => onSelect(c.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setMenu({ id: c.id, x: e.clientX, y: e.clientY })
                }}
              >
                <Diamond size={9} fill="currentColor" className="pin-dot" />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="filter-group">
        <div className="filter-group-header static">
          <span className="filter-group-title">{t('categoryFilter')}</span>
          <span className="filter-group-count">({categories.length})</span>
          <button className="icon-btn tree-add-btn" onClick={() => startCreate(null)} aria-label={t('newCategory')}>
            <Plus size={13} />
          </button>
        </div>
        <div className="filter-list">
          <button
            className={`filter-item ${activeId === null ? 'active' : ''}`}
            onClick={() => onSelect(null)}
          >
            {t('allCategories')}
          </button>
          {tree.map((node) => renderNode(node, 0))}
          {creatingParentId === null && (
            <div className="tree-row" style={{ paddingLeft: 8 }}>
              <span className="tree-disclosure" style={{ visibility: 'hidden' }} />
              <input
                className="tree-rename-input"
                placeholder={t('newCategoryPlaceholder')}
                value={createValue}
                autoFocus
                onChange={(e) => setCreateValue(e.target.value)}
                onBlur={commitCreate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCreate()
                  if (e.key === 'Escape') setCreatingParentId(undefined)
                }}
              />
            </div>
          )}
        </div>
      </div>

      {menu && menuCategory && (
        <div
          ref={menuRef}
          className="action-menu glass-strong tree-context-menu"
          style={{ position: 'fixed', top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="menu-item" onClick={() => startCreate(menuCategory.id)}>
            {t('newSubcategory')}
          </button>
          <button className="menu-item" onClick={() => startRename(menuCategory)}>
            {t('rename')}
          </button>
          <button
            className="menu-item"
            onClick={() => {
              setMenu(null)
              onSetPinned(menuCategory.id, !menuCategory.pinned)
            }}
          >
            {menuCategory.pinned ? t('unpinCategory') : t('pinCategory')}
          </button>
          <button
            className="menu-item"
            onClick={() => {
              setMenu(null)
              onReorder(menuCategory.id, 'up')
            }}
          >
            {t('moveUp')}
          </button>
          <button
            className="menu-item"
            onClick={() => {
              setMenu(null)
              onReorder(menuCategory.id, 'down')
            }}
          >
            {t('moveDown')}
          </button>
          <button
            className="menu-item menu-item-danger"
            onClick={() => {
              setMenu(null)
              if (window.confirm(t('confirmDeleteCategory', { name: menuCategory.name }))) {
                onDelete(menuCategory.id)
              }
            }}
          >
            {t('delete')}
          </button>
        </div>
      )}
    </div>
  )
}
