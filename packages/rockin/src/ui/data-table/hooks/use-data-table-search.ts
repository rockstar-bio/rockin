"use client"

import { useDataTable } from "../core/data-table-root"

export function useDataTableSearch() {
  const { globalFilter, setGlobalFilter } = useDataTable<unknown>()

  return {
    search: globalFilter,
    setSearch: setGlobalFilter,
    clearSearch: () => setGlobalFilter(""),
  }
}
