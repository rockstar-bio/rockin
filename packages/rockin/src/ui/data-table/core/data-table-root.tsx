"use client"

import * as React from "react"

import { cn } from "cn"
import type { DataTableColumn, DataTableRootProps } from "../types"

type DataTableContextValue<TData> = {
  data: TData[]
  columns: DataTableColumn<TData>[]
  filteredData: TData[]
  pageData: TData[]
  pageIndex: number
  pageSize: number
  pageCount: number
  globalFilter: string
  isLoading: boolean
  getRowId: (row: TData, index: number) => string
  setGlobalFilter: (value: string) => void
  setPageIndex: (value: number) => void
}

const DataTableContext = React.createContext<DataTableContextValue<any> | null>(
  null
)

export function useDataTable<TData>() {
  const context = React.useContext(DataTableContext)

  if (!context) {
    throw new Error(
      "DataTable components must be rendered inside DataTableRoot"
    )
  }

  return context as DataTableContextValue<TData>
}

export function DataTableRoot<TData>({
  data,
  columns,
  children,
  isLoading = false,
  pageSize = 10,
  getRowId = (_, index) => String(index),
  className,
}: DataTableRootProps<TData>) {
  const [globalFilter, setGlobalFilterState] = React.useState("")
  const [pageIndex, setPageIndexState] = React.useState(0)

  const filteredData = React.useMemo(() => {
    const query = globalFilter.trim().toLowerCase()

    if (!query) return data

    return data.filter((row) =>
      columns.some((column) => {
        if (column.enableSearch === false) return false
        const value = column.accessorFn
          ? column.accessorFn(row)
          : column.accessorKey
            ? row[column.accessorKey]
            : undefined

        return String(value ?? "")
          .toLowerCase()
          .includes(query)
      })
    )
  }, [columns, data, globalFilter])

  const safePageSize = Math.max(1, pageSize)
  const pageCount = Math.max(1, Math.ceil(filteredData.length / safePageSize))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const pageData = filteredData.slice(
    safePageIndex * safePageSize,
    (safePageIndex + 1) * safePageSize
  )

  React.useEffect(() => {
    setPageIndexState((current) => Math.min(current, pageCount - 1))
  }, [pageCount])

  const contextValue = React.useMemo<DataTableContextValue<TData>>(
    () => ({
      data,
      columns,
      filteredData,
      pageData,
      pageIndex: safePageIndex,
      pageSize: safePageSize,
      pageCount,
      globalFilter,
      isLoading,
      getRowId,
      setGlobalFilter: (value) => {
        setGlobalFilterState(value)
        setPageIndexState(0)
      },
      setPageIndex: (value) =>
        setPageIndexState(Math.max(0, Math.min(value, pageCount - 1))),
    }),
    [
      columns,
      filteredData,
      pageCount,
      pageData,
      safePageIndex,
      safePageSize,
      globalFilter,
      isLoading,
      getRowId,
    ]
  )

  return (
    <DataTableContext.Provider value={contextValue}>
      <div className={cn("w-full space-y-3", className)}>{children}</div>
    </DataTableContext.Provider>
  )
}
