import type { ReactNode } from "react"

export type DataTableColumn<TData> = {
  id?: string
  accessorKey?: keyof TData & string
  accessorFn?: (row: TData) => unknown
  header: ReactNode | ((column: DataTableColumn<TData>) => ReactNode)
  cell?: (value: unknown, row: TData, rowIndex: number) => ReactNode
  enableSearch?: boolean
}

export type DataTableColumnDef<TData> = DataTableColumn<TData>

export type DataTableRootProps<TData> = {
  data: TData[]
  columns: DataTableColumn<TData>[]
  children: ReactNode
  isLoading?: boolean
  pageSize?: number
  getRowId?: (row: TData, index: number) => string
  className?: string
}
