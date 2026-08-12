import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { CategoryTree } from './CategoryTree'
import type { ComponentProps } from 'react'

export interface FilterGroupData {
  key: string
  title: string
  allLabel: string
  options: string[]
  active: string | null
  onSelect: (value: string | null) => void
}

function FilterGroup({ group }: { group: FilterGroupData }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="filter-group">
      <button className="filter-group-header" onClick={() => setExpanded((e) => !e)}>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="filter-group-title">{group.title}</span>
        <span className="filter-group-count">({group.options.length})</span>
      </button>
      {expanded && (
        <div className="filter-list">
          <button
            className={`filter-item ${group.active === null ? 'active' : ''}`}
            onClick={() => group.onSelect(null)}
          >
            {group.allLabel}
          </button>
          {group.options.map((option) => (
            <button
              key={option}
              className={`filter-item ${group.active === option ? 'active' : ''}`}
              onClick={() => group.onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  languageGroup: FilterGroupData
  tagGroup: FilterGroupData
  categoryTreeProps: ComponentProps<typeof CategoryTree>
  variant: 'panel' | 'drawer'
  open?: boolean
  onClose?: () => void
}

function SidebarContent({ languageGroup, tagGroup, categoryTreeProps }: Omit<Props, 'variant' | 'open' | 'onClose'>) {
  return (
    <>
      <FilterGroup group={languageGroup} />
      <CategoryTree {...categoryTreeProps} />
      <FilterGroup group={tagGroup} />
    </>
  )
}

export function Sidebar({ languageGroup, tagGroup, categoryTreeProps, variant, open, onClose }: Props) {
  if (variant === 'drawer') {
    return (
      <>
        {open && <div className="drawer-backdrop" onClick={onClose} />}
        <aside className={`sidebar drawer ${open ? 'open' : ''}`}>
          <SidebarContent languageGroup={languageGroup} tagGroup={tagGroup} categoryTreeProps={categoryTreeProps} />
        </aside>
      </>
    )
  }

  return (
    <aside className="sidebar panel">
      <SidebarContent languageGroup={languageGroup} tagGroup={tagGroup} categoryTreeProps={categoryTreeProps} />
    </aside>
  )
}
