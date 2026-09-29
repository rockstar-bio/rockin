"use client"

import { useDataTable } from "../core/data-table-root"

export function useDataTableRows<TData>() {
  const { data, filteredData, pageData, isLoading } = useDataTable<TData>()

  return {
    data,
    rows: pageData,
    pageRows: pageData,
    filteredRows: filteredData,
    totalRows: filteredData.length,
    isLoading,
  }
}
