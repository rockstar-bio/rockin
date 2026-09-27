import { isNativeApp } from "#lib/index"
import { useEffect, useState } from "react"

export function useNative() {
  const [native, setNative] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    setNative(isNativeApp())
  }, [])

  return native
}
