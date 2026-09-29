"use client"

import { useDataTable } from "../core/data-table-root"

export function useDataTablePagination() {
  const { pageIndex, pageSize, pageCount, setPageIndex } =
    useDataTable<unknown>()

  return {
    pageIndex,
    pageSize,
    pageCount,
    canPreviousPage: pageIndex > 0,
    canNextPage: pageIndex < pageCount - 1,
    goToPage: setPageIndex,
    previousPage: () => setPageIndex(pageIndex - 1),
    nextPage: () => setPageIndex(pageIndex + 1),
    firstPage: () => setPageIndex(0),
    lastPage: () => setPageIndex(pageCount - 1),
  }
}
