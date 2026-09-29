"use client"

import type { ReactNode } from "react"

import { cn } from "cn"
import { Skeleton } from "../../skeleton"
import { useDataTable } from "./data-table-root"
import { DataTableCell, DataTableRow, DataTableRows } from "./data-table"

export function DataTableHeader({ className }: { className?: string }) {
  const { columns } = useDataTable<unknown>()

  return (
    <thead className={cn("bg-muted/60", className)}>
      <DataTableRow>
        {columns.map((column, index) => (
          <th
            className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground"
            key={column.id ?? column.accessorKey ?? index}
          >
            {typeof column.header === "function"
              ? column.header(column)
              : column.header}
          </th>
        ))}
      </DataTableRow>
    </thead>
  )
}

export function DataTableBody({ children }: { children?: ReactNode }) {
  return (
    <>
      <DataTableRows />
      {children}
    </>
  )
}

export function DataTableSkeleton({ rows = 3 }: { rows?: number }) {
  const { columns, isLoading } = useDataTable<unknown>()
  if (!isLoading) return null

  return (
    <tbody aria-label="Loading rows">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <DataTableRow key={rowIndex}>
          {columns.map((column, columnIndex) => (
            <DataTableCell key={column.id ?? column.accessorKey ?? columnIndex}>
              <Skeleton className="h-4" />
            </DataTableCell>
          ))}
        </DataTableRow>
      ))}
    </tbody>
  )
}

export function DataTableEmptyBody({
  children = "No results found.",
}: {
  children?: ReactNode
}) {
  const { pageData, isLoading } = useDataTable<unknown>()
  if (isLoading || pageData.length > 0) return null

  return (
    <tbody>
      <DataTableRow>
        <DataTableCell
          className="h-24 text-center text-muted-foreground"
          colSpan={100}
        >
          {children}
        </DataTableCell>
      </DataTableRow>
    </tbody>
  )
}
