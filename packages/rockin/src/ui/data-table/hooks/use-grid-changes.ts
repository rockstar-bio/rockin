"use client"

import * as React from "react"

import type { DataGridApi } from "../data-grid"

export function useGridChanges<TData extends Record<string, unknown>>(
  grid: DataGridApi<TData>,
  options: { initialRows?: TData[] } = {}
) {
  const initialRows = options.initialRows ?? []
  const [dirtyRowIds, setDirtyRowIds] = React.useState<Set<string>>(new Set())

  const updateCell = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      grid.updateCell(rowId, columnId, value as never)
      setDirtyRowIds((current) => new Set(current).add(rowId))
    },
    [grid]
  )

  const getChangeSet = React.useCallback(() => {
    const created: TData[] = []
    const updated: TData[] = []
    const initialById = new Map(
      initialRows.map((row, index) => [grid.getRowId(row, index), row])
    )

    for (const row of grid.rows) {
      const rowId = grid.getRowId(row, grid.rows.indexOf(row))
      if (!dirtyRowIds.has(rowId)) continue
      if (initialById.has(rowId)) updated.push(row)
      else created.push(row)
    }

    return { created, updated, deleted: [] as TData[] }
  }, [dirtyRowIds, grid, initialRows])

  const reset = React.useCallback(() => setDirtyRowIds(new Set()), [])

  return {
    dirtyRowIds,
    updateCell,
    getChangeSet,
    reset,
  }
}
