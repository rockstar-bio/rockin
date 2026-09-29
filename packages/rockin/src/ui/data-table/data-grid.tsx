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
  insertRows: (rows: TData[], index?: number) => void
  deleteRows: (rowIds: string[]) => void
  moveRow: (rowId: string, toIndex: number) => void
}

export type UseDataGridOptions<TData extends Record<string, unknown>> = {
  columnIds?: string[]
  columns?: DataGridColumn<TData>[]
  initialRows?: TData[]
  createEmptyRow?: () => TData
  getRowId?: (row: TData, index: number) => string
  maxRows?: number
}

export function useDataGrid<TData extends Record<string, unknown>>({
  columnIds = [],
  columns,
  initialRows = [],
  getRowId = (row, index) => String(row.id ?? index),
  maxRows = 200,
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
    (updater: (rows: TData[]) => TData[]) =>
      setRows((current) => updater(current).slice(0, maxRows)),
    [maxRows]
  )

  const insertRows = React.useCallback(
    (nextRows: TData[], index = rows.length) => {
      setRows((current) => {
        const safeIndex = Math.max(0, Math.min(index, current.length))
        return [
          ...current.slice(0, safeIndex),
          ...nextRows,
          ...current.slice(safeIndex),
        ].slice(0, maxRows)
      })
    },
    [maxRows, rows.length]
  )

  const deleteRows = React.useCallback(
    (rowIds: string[]) => {
      const ids = new Set(rowIds)
      setRows((current) =>
        current.filter((row, index) => !ids.has(getRowId(row, index)))
      )
    },
    [getRowId]
  )

  const moveRow = React.useCallback(
    (rowId: string, toIndex: number) => {
      setRows((current) => {
        const fromIndex = current.findIndex(
          (row, index) => getRowId(row, index) === rowId
        )
        if (fromIndex < 0) return current
        const next = [...current]
        const [row] = next.splice(fromIndex, 1)
        next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, row)
        return next
      })
    },
    [getRowId]
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
      insertRows,
      deleteRows,
      moveRow,
    }),
    [
      getCellValue,
      getRow,
      getRowId,
      resolvedColumns,
      rows,
      updateCell,
      updateRows,
      insertRows,
      deleteRows,
      moveRow,
      maxRows,
    ]
  )
}

type GridPosition = {
  rowId: string
  columnId: string
}

type DataGridContextValue = DataGridApi<Record<string, unknown>> & {
  activeCell: GridPosition | null
  selection: { anchor: GridPosition; focus: GridPosition } | null
  setActiveCell: (cell: GridPosition) => void
  setSelection: (
    selection: { anchor: GridPosition; focus: GridPosition } | null
  ) => void
  rootRef: React.RefObject<HTMLDivElement | null>
}
const DataGridContext = React.createContext<DataGridContextValue | null>(null)

function useDataGridContext<TData extends Record<string, unknown>>() {
  const context = React.useContext(DataGridContext)
  if (!context) throw new Error("DataGrid components must be inside DataGrid")
  return context as DataGridContextValue & DataGridApi<TData>
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
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [activeCell, setActiveCell] = React.useState<GridPosition | null>(null)
  const [selection, setSelection] = React.useState<{
    anchor: GridPosition
    focus: GridPosition
  } | null>(null)

  const contextValue = React.useMemo(
    () => ({
      ...(grid as DataGridContextValue),
      activeCell,
      selection,
      setActiveCell,
      setSelection,
      rootRef,
    }),
    [activeCell, grid, selection]
  )

  function selectedCoordinates() {
    if (!selection) return null
    const rowIndexes = [
      grid.rows.findIndex((row, index) => grid.getRowId(row, index) === selection.anchor.rowId),
      grid.rows.findIndex((row, index) => grid.getRowId(row, index) === selection.focus.rowId),
    ].sort((a, b) => a - b)
    const columnIndexes = [
      grid.columns.findIndex((column) => column.id === selection.anchor.columnId),
      grid.columns.findIndex((column) => column.id === selection.focus.columnId),
    ].sort((a, b) => a - b)
    if (rowIndexes.some((index) => index < 0) || columnIndexes.some((index) => index < 0)) return null
    return { rowIndexes, columnIndexes }
  }

  function focusCell(rowIndex: number, columnIndex: number) {
    const row = grid.rows[rowIndex]
    const column = grid.columns[columnIndex]
    if (!row || !column) return
    const rowId = grid.getRowId(row, rowIndex)
    const cell = rootRef.current?.querySelector<HTMLElement>(
      `[data-grid-row-id="${CSS.escape(rowId)}"] [data-grid-column-id="${CSS.escape(column.id)}"]`
    )
    cell?.focus()
  }

  function handleCopy(event: React.ClipboardEvent<HTMLDivElement>) {
    const coordinates = selectedCoordinates()
    if (!coordinates) return
    const value = coordinates.rowIndexes
      .map((rowIndex) =>
        coordinates.columnIndexes
          .map((columnIndex) =>
            String(grid.getCellValue(grid.getRowId(grid.rows[rowIndex], rowIndex), grid.columns[columnIndex].id) ?? "")
          )
          .join("\t")
      )
      .join("\n")
    event.preventDefault()
    event.clipboardData.setData("text/plain", value)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (!activeCell) return
    const startRow = grid.rows.findIndex(
      (row, index) => grid.getRowId(row, index) === activeCell.rowId
    )
    const startColumn = grid.columns.findIndex(
      (column) => column.id === activeCell.columnId
    )
    if (startRow < 0 || startColumn < 0) return
    const matrix = event.clipboardData
      .getData("text/plain")
      .split(/\r?\n/)
      .map((row) => row.split("\t"))
    event.preventDefault()
    grid.updateRows((rows) =>
      rows.map((row, rowIndex) => {
        const values = matrix[rowIndex - startRow]
        if (!values) return row
        const next = { ...row }
        values.forEach((value, columnOffset) => {
          const column = grid.columns[startColumn + columnOffset]
          if (column) Object.assign(next, { [column.id]: value })
        })
        return next
      })
    )
  }

  const childArray = React.Children.toArray(children)
  const headerRows = childArray.filter(
    (child) =>
      React.isValidElement(child) &&
      Boolean((child.props as { header?: boolean }).header)
  )
  const bodyRows = childArray.filter(
    (child) =>
      !React.isValidElement(child) ||
      !(child.props as { header?: boolean }).header
  )

  return (
    <DataGridContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        className={cn("w-full space-y-2 outline-none", className)}
        onCopy={handleCopy}
        onPaste={handlePaste}
      >
        <table className="w-full border-collapse text-sm">
          {headerRows.length > 0 && <thead>{headerRows}</thead>}
          <tbody>{bodyRows}</tbody>
        </table>
      </div>
    </DataGridContext.Provider>
  )
}

export function DataGridRow({
  row,
  rowId,
  children,
  header = false,
  className,
}: {
  row?: Record<string, unknown>
  rowId?: string
  children?: React.ReactNode
  header?: boolean
  className?: string
}) {
  const grid = useDataGridContext<Record<string, unknown>>()
  const resolvedRowId = rowId ?? (row ? grid.getRowId(row, 0) : "")
  const resolvedRow = row ?? grid.getRow(resolvedRowId)

  return (
    <tr
      data-grid-row-id={resolvedRowId}
      data-grid-header={header || undefined}
      className={cn("border-b last:border-0", className)}
    >
      {resolvedRow && children}
    </tr>
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
  return <th className={cn("min-w-0 px-3 py-2 text-left", className)}>{children ?? column.header}</th>
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
  const rowIndex = grid.rows.findIndex(
    (currentRow, index) => grid.getRowId(currentRow, index) === resolvedRowId
  )
  const columnIndex = grid.columns.findIndex((column) => column.id === columnId)
  const isActive =
    grid.activeCell?.rowId === resolvedRowId && grid.activeCell.columnId === columnId
  const isSelected = (() => {
    if (!grid.selection) return false
    const anchorRow = grid.rows.findIndex(
      (currentRow, index) => grid.getRowId(currentRow, index) === grid.selection?.anchor.rowId
    )
    const focusRow = grid.rows.findIndex(
      (currentRow, index) => grid.getRowId(currentRow, index) === grid.selection?.focus.rowId
    )
    const anchorColumn = grid.columns.findIndex(
      (column) => column.id === grid.selection?.anchor.columnId
    )
    const focusColumn = grid.columns.findIndex(
      (column) => column.id === grid.selection?.focus.columnId
    )
    return (
      rowIndex >= Math.min(anchorRow, focusRow) &&
      rowIndex <= Math.max(anchorRow, focusRow) &&
      columnIndex >= Math.min(anchorColumn, focusColumn) &&
      columnIndex <= Math.max(anchorColumn, focusColumn)
    )
  })()

  function focusCell(nextRowIndex: number, nextColumnIndex: number) {
    const nextRow = grid.rows[nextRowIndex]
    const nextColumn = grid.columns[nextColumnIndex]
    if (!nextRow || !nextColumn) return
    const nextRowId = grid.getRowId(nextRow, nextRowIndex)
    grid.setActiveCell({ rowId: nextRowId, columnId: nextColumn.id })
    const nextPosition = { rowId: nextRowId, columnId: nextColumn.id }
    if (grid.activeCell && grid.selection?.anchor && pendingShift.current) {
      grid.setSelection({ anchor: grid.selection.anchor, focus: nextPosition })
    } else {
      grid.setSelection({ anchor: nextPosition, focus: nextPosition })
    }
    const target = grid.rootRef.current?.querySelector<HTMLElement>(
      `[data-grid-row-id="${CSS.escape(nextRowId)}"] [data-grid-column-id="${CSS.escape(nextColumn.id)}"]`
    )
    target?.focus()
  }

  const pendingShift = React.useRef(false)

  function fillSelection() {
    if (!grid.selection) return
    const anchorRow = grid.rows.findIndex(
      (currentRow, index) => grid.getRowId(currentRow, index) === grid.selection?.anchor.rowId
    )
    const focusRow = grid.rows.findIndex(
      (currentRow, index) => grid.getRowId(currentRow, index) === grid.selection?.focus.rowId
    )
    const anchorColumn = grid.columns.findIndex(
      (column) => column.id === grid.selection?.anchor.columnId
    )
    const focusColumn = grid.columns.findIndex(
      (column) => column.id === grid.selection?.focus.columnId
    )
    if (anchorRow < 0 || focusRow < 0 || anchorColumn < 0 || focusColumn < 0) return
    const source = grid.getCellValue(
      grid.getRowId(grid.rows[anchorRow], anchorRow),
      grid.columns[anchorColumn].id
    )
    const minRow = Math.min(anchorRow, focusRow)
    const maxRow = Math.max(anchorRow, focusRow)
    const minColumn = Math.min(anchorColumn, focusColumn)
    const maxColumn = Math.max(anchorColumn, focusColumn)
    grid.updateRows((rows) =>
      rows.map((row, rowIndex) => {
        if (rowIndex < minRow || rowIndex > maxRow) return row
        const next = { ...row }
        for (let columnIndex = minColumn; columnIndex <= maxColumn; columnIndex += 1) {
          Object.assign(next, { [grid.columns[columnIndex].id]: source })
        }
        return next
      })
    )
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTableCellElement>) {
    const target = event.target as HTMLElement
    const isEditor = target.tagName === "INPUT" || target.tagName === "TEXTAREA"
    if (isEditor && ["ArrowLeft", "ArrowRight"].includes(event.key)) return
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault()
      grid.moveRow(resolvedRowId, rowIndex + (event.key === "ArrowUp" ? -1 : 1))
      return
    }
    let nextRowIndex = rowIndex
    let nextColumnIndex = columnIndex
    if (event.key === "ArrowUp") nextRowIndex -= 1
    if (event.key === "ArrowDown" || event.key === "Enter") nextRowIndex += 1
    if (event.key === "ArrowLeft") nextColumnIndex -= 1
    if (event.key === "ArrowRight" || event.key === "Tab") nextColumnIndex += event.shiftKey ? -1 : 1
    if (event.key === "Home") nextColumnIndex = 0
    if (event.key === "End") nextColumnIndex = grid.columns.length - 1
    if (event.key === "PageUp") nextRowIndex = 0
    if (event.key === "PageDown") nextRowIndex = grid.rows.length - 1
    if (nextRowIndex === rowIndex && nextColumnIndex === columnIndex) return
    event.preventDefault()
    pendingShift.current = event.shiftKey
    focusCell(nextRowIndex, nextColumnIndex)
    pendingShift.current = false
  }

  const selectionBounds = grid.selection
    ? {
        minRow: Math.min(
          grid.rows.findIndex((row, index) => grid.getRowId(row, index) === grid.selection?.anchor.rowId),
          grid.rows.findIndex((row, index) => grid.getRowId(row, index) === grid.selection?.focus.rowId)
        ),
        maxRow: Math.max(
          grid.rows.findIndex((row, index) => grid.getRowId(row, index) === grid.selection?.anchor.rowId),
          grid.rows.findIndex((row, index) => grid.getRowId(row, index) === grid.selection?.focus.rowId)
        ),
        minColumn: Math.min(
          grid.columns.findIndex((column) => column.id === grid.selection?.anchor.columnId),
          grid.columns.findIndex((column) => column.id === grid.selection?.focus.columnId)
        ),
        maxColumn: Math.max(
          grid.columns.findIndex((column) => column.id === grid.selection?.anchor.columnId),
          grid.columns.findIndex((column) => column.id === grid.selection?.focus.columnId)
        ),
      }
    : null
  const showFillHandle =
    selectionBounds &&
    (selectionBounds.minRow !== selectionBounds.maxRow ||
      selectionBounds.minColumn !== selectionBounds.maxColumn) &&
    rowIndex === selectionBounds.maxRow &&
    columnIndex === selectionBounds.maxColumn

  return (
    <DataGridCellContext.Provider
      value={{ rowId: resolvedRowId, columnId, value }}
    >
      <td
        data-grid-row-id={resolvedRowId}
        data-grid-column-id={columnId}
        tabIndex={0}
        onFocus={() => {
          grid.setActiveCell({ rowId: resolvedRowId, columnId })
          if (!grid.selection) {
            grid.setSelection({
              anchor: { rowId: resolvedRowId, columnId },
              focus: { rowId: resolvedRowId, columnId },
            })
          }
        }}
        onClick={(event) => {
          if (event.shiftKey && grid.activeCell) {
            grid.setSelection({ anchor: grid.activeCell, focus: { rowId: resolvedRowId, columnId } })
          } else {
            grid.setSelection({
              anchor: { rowId: resolvedRowId, columnId },
              focus: { rowId: resolvedRowId, columnId },
            })
          }
          grid.setActiveCell({ rowId: resolvedRowId, columnId })
        }}
        onKeyDown={onKeyDown}
        aria-invalid={state === "invalid" || undefined}
        className={cn(
          "relative min-h-9 border-r border-b px-2 py-1.5 align-middle outline-none",
          isSelected && "bg-accent/40",
          isActive && "ring-2 ring-inset ring-primary",
          state === "invalid" && "border-destructive/60 bg-destructive/10",
          state === "pending" && "opacity-70",
          className
        )}
      >
        {children}
        {showFillHandle && (
          <button
            type="button"
            aria-label="Fill selected cells"
            className="absolute right-0 bottom-0 z-10 size-2 cursor-crosshair border border-background bg-primary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={fillSelection}
          />
        )}
      </td>
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
  min,
  max,
  step = "any",
  allowEmpty = true,
}: {
  value?: number | string
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number | "any"
  allowEmpty?: boolean
}) {
  const cell = useGridCell()
  const currentValue = value ?? (typeof cell.value === "number" ? cell.value : String(cell.value ?? ""))
  const [invalid, setInvalid] = React.useState(false)

  return (
    <Input
      aria-invalid={invalid || undefined}
      className={cn(
        "h-7 w-full min-w-0 bg-transparent text-sm outline-none",
        invalid && "border-destructive ring-2 ring-destructive/20"
      )}
      onChange={(event) => {
        const rawValue = event.target.value
        if (!rawValue && allowEmpty) {
          setInvalid(false)
          cell.grid.updateCell(cell.rowId, cell.columnId, "")
          return
        }
        const nextValue = event.target.valueAsNumber
        if (Number.isNaN(nextValue)) return
        const nextInvalid =
          (min !== undefined && nextValue < min) ||
          (max !== undefined && nextValue > max)
        setInvalid(nextInvalid)
        onChange?.(nextValue)
        cell.grid.updateCell(cell.rowId, cell.columnId, nextValue)
      }}
      min={min}
      max={max}
      step={step}
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
  const [selectedOption, setSelectedOption] =
    React.useState<GridComboboxOption | null>(null)
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

  const selectedItem =
    options.find((option) => option.value === selectedValue) ??
    (selectedOption?.value === selectedValue ? selectedOption : null)

  return (
    <Combobox
      items={options}
      itemToStringLabel={(item) => item?.label ?? ""}
      itemToStringValue={(item) => item?.value ?? ""}
      onValueChange={(nextOption) => {
        if (nextOption === null) return
        setSelectedOption(nextOption)
        onChange?.(nextOption.value, nextOption)
        cell.grid.updateCell(cell.rowId, cell.columnId, nextOption.value)
        setQuery(nextOption.label)
      }}
      value={selectedItem}
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
            <ComboboxItem key={option.value} value={option}>
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
