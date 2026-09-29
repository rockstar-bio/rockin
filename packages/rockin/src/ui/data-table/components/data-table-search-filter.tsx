"use client"

import { Search } from "lucide-react"

import { Input } from "../../input"
import { useDataTableSearch } from "../hooks/use-data-table-search"

export function DataTableSearchFilter({
  placeholder = "Search...",
  className,
}: {
  placeholder?: string
  className?: string
}) {
  const { search, setSearch } = useDataTableSearch()

  return (
    <div className={`relative w-full max-w-sm ${className ?? ""}`}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={placeholder}
        className="pl-8"
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
        value={search}
      />
    </div>
  )
}
