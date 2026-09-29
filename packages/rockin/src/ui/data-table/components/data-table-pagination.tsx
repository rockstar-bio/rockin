"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "../../button"
import { useDataTablePagination } from "../hooks/use-data-table-pagination"
import { useDataTableRows } from "../hooks/use-data-table-rows"

export function DataTablePagination() {
  const { totalRows } = useDataTableRows()
  const {
    pageIndex,
    pageSize,
    pageCount,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
  } = useDataTablePagination()
  const first = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const last = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {totalRows ? `${first}–${last} of ${totalRows}` : "0 results"}
      </span>
      <div className="flex items-center gap-1">
        <Button
          aria-label="Previous page"
          disabled={!canPreviousPage}
          onClick={previousPage}
          size="icon-sm"
          variant="outline"
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-16 text-center text-xs">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <Button
          aria-label="Next page"
          disabled={!canNextPage}
          onClick={nextPage}
          size="icon-sm"
          variant="outline"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
