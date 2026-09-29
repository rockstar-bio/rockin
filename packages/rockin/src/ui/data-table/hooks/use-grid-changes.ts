"use client"

import * as React from "react"

import type { DataGridApi } from "../data-grid"

export function useGridChanges<TData extends Record<string, unknown>>(
  grid: DataGridApi<TData>,
  options: { initialRows?: TData[] } = {}
) {
  const initialRows = options.initialRows ?? []
  const [dirtyRowIds, setDirtyRowIds] = React.useState<Set<string>>(new Set())
  const [deletedRowIds, setDeletedRowIds] = React.useState<Set<string>>(
    new Set()
  )

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

    const currentIds = new Set(
      grid.rows.map((row, index) => grid.getRowId(row, index))
    )
    const deleted = initialRows.filter((row, index) => {
      const rowId = grid.getRowId(row, index)
      return deletedRowIds.has(rowId) || !currentIds.has(rowId)
    })

    return { created, updated, deleted }
  }, [deletedRowIds, dirtyRowIds, grid, initialRows])

  const insertRows = React.useCallback(
    (rows: TData[], index?: number) => {
      grid.insertRows(rows, index)
      setDirtyRowIds((current) => {
        const next = new Set(current)
        rows.forEach((row, rowIndex) => next.add(grid.getRowId(row, rowIndex)))
        return next
      })
    },
    [grid]
  )

  const deleteRows = React.useCallback(
    (rowIds: string[]) => {
      grid.deleteRows(rowIds)
      setDeletedRowIds((current) => new Set([...current, ...rowIds]))
    },
    [grid]
  )

  const reset = React.useCallback(
    (rows = initialRows) => {
      grid.updateRows(() => rows)
      setDirtyRowIds(new Set())
      setDeletedRowIds(new Set())
    },
    [grid, initialRows]
  )

  const reconcile = React.useCallback(
    (succeededIds: string[], failedIds: string[] = []) => {
      const succeeded = new Set(succeededIds)
      setDirtyRowIds((current) =>
        new Set([...current].filter((rowId) => !succeeded.has(rowId)))
      )
      setDeletedRowIds((current) =>
        new Set([...current].filter((rowId) => !succeeded.has(rowId)))
      )
      if (failedIds.length > 0) {
        setDirtyRowIds((current) => new Set([...current, ...failedIds]))
      }
    },
    []
  )

  return {
    dirtyRowIds,
    deletedRowIds,
    updateCell,
    insertRows,
    deleteRows,
    getChangeSet,
    reset,
    reconcile,
  }
}
