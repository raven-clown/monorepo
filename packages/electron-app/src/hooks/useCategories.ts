import { useCallback, useEffect, useState } from 'react'
import type { Category, CategoryUpdateInput, NewCategoryInput } from '@snippet/core'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    window.api.categories.getAll().then(setCategories)
    return window.api.categories.onChange(setCategories)
  }, [])

  const add = useCallback(async (input: NewCategoryInput) => {
    const created = await window.api.categories.add(input)
    setCategories(await window.api.categories.getAll())
    return created
  }, [])

  const rename = useCallback(async (id: string, name: string) => {
    await window.api.categories.update(id, { name })
    setCategories(await window.api.categories.getAll())
  }, [])

  const update = useCallback(async (id: string, updates: CategoryUpdateInput) => {
    await window.api.categories.update(id, updates)
    setCategories(await window.api.categories.getAll())
  }, [])

  const setPinned = useCallback(async (id: string, pinned: boolean) => {
    await window.api.categories.setPinned(id, pinned)
    setCategories(await window.api.categories.getAll())
  }, [])

  const move = useCallback(async (id: string, parentId: string | null, index?: number) => {
    setCategories(await window.api.categories.move(id, parentId, index))
  }, [])

  const reorder = useCallback(async (id: string, direction: 'up' | 'down') => {
    setCategories(await window.api.categories.reorder(id, direction))
  }, [])

  const remove = useCallback(async (id: string) => {
    await window.api.categories.delete(id)
    setCategories(await window.api.categories.getAll())
  }, [])

  return { categories, add, rename, update, setPinned, move, reorder, remove }
}
