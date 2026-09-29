"use client"

import * as React from "react"

import { cn } from "cn"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../combobox"
import { Input } from "../input"

export type CellState = "valid" | "invalid" | "pending"

export type GridComboboxOption = {
  label: string
  value: string
}

export type GridAsyncComboboxCellProps = {
  value?: string
  onChange?: (value: string, option?: GridComboboxOption) => void
  loadOptions: (query: string) => Promise<GridComboboxOption[]>
  placeholder?: string
  minQueryLength?: number
  debounceMs?: number
}

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
    <Input
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
    <Input
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
  options: GridComboboxOption[]
  value?: string
  onChange?: (value: string) => void
}) {
  const cell = useGridCell()
  const currentValue = value ?? String(cell.value ?? "")

  return (
    <Combobox
      onValueChange={(nextValue) => {
        if (nextValue === null) return
        onChange?.(nextValue)
        cell.grid.updateCell(cell.rowId, cell.columnId, nextValue)
      }}
      value={currentValue}
    >
      <ComboboxInput
        className="h-7 w-full min-w-0 border-0 bg-transparent px-0 shadow-none"
        showClear={false}
      />
      <ComboboxContent>
        <ComboboxList>
          {options.map((option) => (
            <ComboboxItem key={option.value} value={option.value}>
              {option.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function GridAsyncComboboxCell({
  value,
  onChange,
  loadOptions,
  placeholder = "Search...",
  minQueryLength = 0,
  debounceMs = 250,
}: GridAsyncComboboxCellProps) {
  const cell = useGridCell()
  const selectedValue = value ?? String(cell.value ?? "")
  const [query, setQuery] = React.useState("")
  const [options, setOptions] = React.useState<GridComboboxOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const requestId = React.useRef(0)
  const loadOptionsRef = React.useRef(loadOptions)

  React.useEffect(() => {
    loadOptionsRef.current = loadOptions
  }, [loadOptions])

  const stableLoadOptions = React.useCallback(
    (search: string) => loadOptionsRef.current(search),
    []
  )

  React.useEffect(() => {
    const currentRequestId = ++requestId.current
    const normalizedQuery = query.trim()

    if (normalizedQuery.length < minQueryLength) {
      setOptions([])
      setIsLoading(false)
      return
    }

    const timeout = window.setTimeout(async () => {
      setIsLoading(true)

      try {
        const nextOptions = await stableLoadOptions(normalizedQuery)
        if (currentRequestId === requestId.current) {
          setOptions(nextOptions)
        }
      } catch {
        if (currentRequestId === requestId.current) {
          setOptions([])
        }
      } finally {
        if (currentRequestId === requestId.current) {
          setIsLoading(false)
        }
      }
    }, debounceMs)

    return () => {
      window.clearTimeout(timeout)
      if (requestId.current === currentRequestId) {
        requestId.current += 1
      }
    }
  }, [debounceMs, minQueryLength, query, stableLoadOptions])

  return (
    <Combobox
      items={options}
      itemToStringLabel={(item) =>
        options.find((option) => option.value === item)?.label ??
        String(item ?? "")
      }
      onValueChange={(nextValue) => {
        if (nextValue === null) return
        const option = options.find((item) => item.value === nextValue)
        onChange?.(nextValue, option)
        cell.grid.updateCell(cell.rowId, cell.columnId, nextValue)
        setQuery(option?.label ?? nextValue)
      }}
      value={selectedValue}
    >
      <ComboboxInput
        className="h-7 w-full min-w-0 border-0 bg-transparent px-0 shadow-none"
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        showClear={false}
        value={query}
      />
      <ComboboxContent>
        {isLoading && <ComboboxEmpty>Loading...</ComboboxEmpty>}
        {!isLoading &&
          query.trim().length >= minQueryLength &&
          options.length === 0 && (
            <ComboboxEmpty>No results found.</ComboboxEmpty>
          )}
        <ComboboxList>
          {options.map((option) => (
            <ComboboxItem key={option.value} value={option.value}>
              {option.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
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
