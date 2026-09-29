"use client"

import * as React from "react"

import { cn } from "cn"
import { useDataTable } from "./data-table-root"

export function DataTable({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("overflow-x-auto rounded-lg border", className)}
      {...props}
    >
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function DataTableTable({
  className,
  ...props
}: React.ComponentProps<"table">) {
  return <table className={cn("w-full text-sm", className)} {...props} />
}

export function DataTableCell({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />
}

export function DataTableRow({
  className,
  ...props
}: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b last:border-0", className)} {...props} />
}

export function DataTableRows() {
  const { columns, pageData, getRowId } =
    useDataTable<Record<string, unknown>>()

  return (
    <tbody>
      {pageData.map((row, rowIndex) => (
        <DataTableRow key={getRowId(row, rowIndex)}>
          {columns.map((column, columnIndex) => {
            const value = column.accessorFn
              ? column.accessorFn(row)
              : column.accessorKey
                ? row[column.accessorKey]
                : undefined

            return (
              <DataTableCell
                key={column.id ?? column.accessorKey ?? columnIndex}
              >
                {column.cell
                  ? column.cell(value, row, rowIndex)
                  : String(value ?? "—")}
              </DataTableCell>
            )
          })}
        </DataTableRow>
      ))}
    </tbody>
  )
}
