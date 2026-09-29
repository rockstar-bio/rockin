"use client"

import * as React from "react"

import { cn } from "cn"

export type CellState = "valid" | "invalid" | "pending"

export type DataGridColumn<TData = Record<string, unknown>> = {
  id: string
  header?: React.ReactNode
  accessorKey?: keyof TData & string
  width?: number
}

type DataGridValue = string | number | boolean | null | undefined

export type DataGridApi<TData extends Record<string, unknown>> = {
  rows: TData[]
  columns: DataGridColumn<TData>[]
  getRowId: (row: TData, index: number) => string
  getRow: (rowId: string) => TData | undefined
  getCellValue: (rowId: string, columnId: string) => DataGridValue
  updateCell: (rowId: string, columnId: string, value: DataGridValue) => void
  updateRows: (updater: (rows: TData[]) => TData[]) => void
}

export type UseDataGridOptions<TData extends Record<string, unknown>> = {
  columnIds?: string[]
  columns?: DataGridColumn<TData>[]
  initialRows?: TData[]
  createEmptyRow?: () => TData
  getRowId?: (row: TData, index: number) => string
}

export function useDataGrid<TData extends Record<string, unknown>>({
  columnIds = [],
  columns,
  initialRows = [],
  getRowId = (row, index) => String(row.id ?? index),
}: UseDataGridOptions<TData> = {}): DataGridApi<TData> {
  const [rows, setRows] = React.useState(initialRows)
  const resolvedColumns = React.useMemo(
    () =>
      columns ??
      columnIds.map((id) => ({
        id,
        accessorKey: id as keyof TData & string,
        header: id,
      })),
    [columnIds, columns]
  )

  const getRow = React.useCallback(
    (rowId: string) =>
      rows.find((row, index) => getRowId(row, index) === rowId),
    [getRowId, rows]
  )

  const getCellValue = React.useCallback(
    (rowId: string, columnId: string) => {
      const row = getRow(rowId)
      return row?.[columnId] as DataGridValue
    },
    [getRow]
  )

  const updateCell = React.useCallback(
    (rowId: string, columnId: string, value: DataGridValue) => {
      setRows((current) =>
        current.map((row, index) =>
          getRowId(row, index) === rowId ? { ...row, [columnId]: value } : row
        )
      )
    },
    [getRowId]
  )

  const updateRows = React.useCallback(
    (updater: (rows: TData[]) => TData[]) => setRows(updater),
    []
  )

  return React.useMemo(
    () => ({
      rows,
      columns: resolvedColumns,
      getRowId,
      getRow,
      getCellValue,
      updateCell,
      updateRows,
    }),
    [
      getCellValue,
      getRow,
      getRowId,
      resolvedColumns,
      rows,
      updateCell,
      updateRows,
    ]
  )
}

type DataGridContextValue = DataGridApi<Record<string, unknown>>
const DataGridContext = React.createContext<DataGridContextValue | null>(null)

function useDataGridContext<TData extends Record<string, unknown>>() {
  const context = React.useContext(DataGridContext)
  if (!context) throw new Error("DataGrid components must be inside DataGrid")
  return context as DataGridApi<TData>
}

const DataGridCellContext = React.createContext<{
  rowId: string
  columnId: string
  value: DataGridValue
} | null>(null)

export function DataGrid<TData extends Record<string, unknown>>({
  grid,
  children,
  className,
}: {
  grid: DataGridApi<TData>
  children?: React.ReactNode
  className?: string
}) {
  return (
    <DataGridContext.Provider value={grid as DataGridContextValue}>
      <div className={cn("w-full space-y-2 outline-none", className)}>
        {children}
      </div>
    </DataGridContext.Provider>
  )
}

export function DataGridRow({
  row,
  rowId,
  children,
  className,
}: {
  row?: Record<string, unknown>
  rowId?: string
  children?: React.ReactNode
  className?: string
}) {
  const grid = useDataGridContext<Record<string, unknown>>()
  const resolvedRowId = rowId ?? (row ? grid.getRowId(row, 0) : "")
  const resolvedRow = row ?? grid.getRow(resolvedRowId)

  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(var(--data-grid-columns),minmax(9rem,1fr))]",
        className
      )}
    >
      {resolvedRow && children}
    </div>
  )
}

export function DataGridColumn({
  column,
  children,
  className,
}: {
  column: DataGridColumn
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>{children ?? column.header}</div>
  )
}

export function DataGridCell({
  row,
  rowId,
  columnId,
  children,
  state = "valid",
  className,
}: {
  row?: Record<string, unknown>
  rowId?: string
  columnId: string
  children?: React.ReactNode
  state?: CellState
  className?: string
}) {
  const grid = useDataGridContext<Record<string, unknown>>()
  const resolvedRowId = rowId ?? (row ? grid.getRowId(row, 0) : "")
  const value = grid.getCellValue(resolvedRowId, columnId)

  return (
    <DataGridCellContext.Provider
      value={{ rowId: resolvedRowId, columnId, value }}
    >
      <div
        aria-invalid={state === "invalid" || undefined}
        className={cn(
          "min-h-9 border-r border-b px-2 py-1.5",
          state === "invalid" && "border-destructive/60 bg-destructive/10",
          state === "pending" && "opacity-70",
          className
        )}
      >
        {children}
      </div>
    </DataGridCellContext.Provider>
  )
}

function useGridCell() {
  const cell = React.useContext(DataGridCellContext)
  const grid = useDataGridContext<Record<string, unknown>>()
  if (!cell) throw new Error("Grid cell components must be inside DataGridCell")
  return { ...cell, grid }
}

export function GridTextCell({
  value,
  onChange,
  placeholder,
}: {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}) {
  const cell = useGridCell()
  const currentValue = value ?? String(cell.value ?? "")

  return (
    <input
      className="h-7 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      onChange={(event) => {
        const nextValue = event.target.value
        onChange?.(nextValue)
        cell.grid.updateCell(cell.rowId, cell.columnId, nextValue)
      }}
      placeholder={placeholder}
      value={currentValue}
    />
  )
}

export function GridNumberCell({
  value,
  onChange,
}: {
  value?: number
  onChange?: (value: number) => void
}) {
  const cell = useGridCell()
  const currentValue =
    value ?? (typeof cell.value === "number" ? cell.value : "")

  return (
    <input
      className="h-7 w-full min-w-0 bg-transparent text-sm outline-none"
      onChange={(event) => {
        const nextValue = event.target.valueAsNumber
        if (Number.isNaN(nextValue)) return
        onChange?.(nextValue)
        cell.grid.updateCell(cell.rowId, cell.columnId, nextValue)
      }}
      type="number"
      value={currentValue}
    />
  )
}

export function GridComboboxCell({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[]
  value?: string
  onChange?: (value: string) => void
}) {
  const cell = useGridCell()
  const currentValue = value ?? String(cell.value ?? "")

  return (
    <select
      className="h-7 w-full min-w-0 bg-transparent text-sm outline-none"
      onChange={(event) => {
        const nextValue = event.target.value
        onChange?.(nextValue)
        cell.grid.updateCell(cell.rowId, cell.columnId, nextValue)
      }}
      value={currentValue}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function DataTableColumnResize() {
  return <span aria-hidden className="absolute inset-y-0 right-0 w-px" />
}

export function DataGridClipboard({
  children,
}: {
  children?: React.ReactNode
}) {
  return <>{children}</>
}

export function DataGridFillHandle({
  children,
}: {
  children?: React.ReactNode
}) {
  return <>{children}</>
}

export function DataGridMove({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}
