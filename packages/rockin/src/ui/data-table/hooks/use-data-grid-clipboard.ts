"use client"

export function useDataGridClipboard() {
  return {
    copy: async (value: string) => navigator.clipboard?.writeText(value),
    read: async () => navigator.clipboard?.readText() ?? "",
  }
}
