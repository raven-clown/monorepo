import { useCallback, useEffect, useState } from 'react'
import type { NewSnippetInput, Snippet, SnippetUpdateInput } from '@snippet/core'

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([])

  useEffect(() => {
    window.api.snippets.getAll().then(setSnippets)
    return window.api.snippets.onChange(setSnippets)
  }, [])

  const add = useCallback(async (input: NewSnippetInput) => {
    const created = await window.api.snippets.add(input)
    setSnippets(await window.api.snippets.getAll())
    return created
  }, [])

  const update = useCallback(async (id: string, updates: SnippetUpdateInput) => {
    await window.api.snippets.update(id, updates)
    setSnippets(await window.api.snippets.getAll())
  }, [])

  const remove = useCallback(async (id: string) => {
    await window.api.snippets.delete(id)
    setSnippets(await window.api.snippets.getAll())
  }, [])

  const setPinned = useCallback(async (id: string, pinned: boolean) => {
    await window.api.snippets.setPinned(id, pinned)
    setSnippets(await window.api.snippets.getAll())
  }, [])

  return { snippets, add, update, remove, setPinned }
}
