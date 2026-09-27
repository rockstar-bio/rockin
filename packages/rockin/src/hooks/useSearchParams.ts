"use client"

import {
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation"
import {
  debounce,
  useQueryStates,
  type Options as QueryStateOptions,
} from "nuqs"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import * as React from "react"

import {
  buildFlagSearchParamHref,
  hasFlagSearchParam,
  searchParamKeys,
  searchParams,
} from "../utils/parms-client"

export { NuqsAdapter }

const SEARCH_DELAY = 500
const PRODUCT_SEARCH_DELAY = 800

function isSearchPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/pos" ||
    pathname === "/orders" ||
    pathname.startsWith("/pos/") ||
    pathname.startsWith("/orders/")
  )
}

let pendingSearchFocus = false

export function searchFocus() {
  if (!pendingSearchFocus) return false
  pendingSearchFocus = false
  return true
}

function searchHref(query: string) {
  const params = new URLSearchParams()
  if (query) params.set(searchParamKeys.query, query)
  const search = params.toString()
  return search ? `/?${search}` : "/"
}

export function useSearchParams() {
  const pathname = usePathname()
  const router = useRouter()
  const nativeSearchParams = useNextSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [params, setParams] = useQueryStates(searchParams, {
    urlKeys: searchParamKeys,
    history: "replace",
    shallow: false,
    scroll: false,
    startTransition,
  })
  const productQueryRef = React.useRef(params.query)
  const productNavigationQueuedRef = React.useRef(false)
  const onSearchPath = isSearchPath(pathname)
  const cart = hasFlagSearchParam(nativeSearchParams, "cart")
  const notification = hasFlagSearchParam(nativeSearchParams, "notification")

  const updateParams = React.useCallback(
    (values: Parameters<typeof setParams>[0], options?: QueryStateOptions) => {
      void setParams(values, options)
    },
    [setParams]
  )

  const setQuery = React.useCallback(
    (value: string) => {
      const update = setParams(
        { query: value, page: 1 },
        {
          history: "replace",
          scroll: false,
          shallow: !onSearchPath,
          limitUrlUpdates: debounce(
            onSearchPath ? SEARCH_DELAY : PRODUCT_SEARCH_DELAY
          ),
        }
      )

      if (onSearchPath) return

      productQueryRef.current = value
      if (productNavigationQueuedRef.current) return
      productNavigationQueuedRef.current = true

      void update.then(() => {
        productNavigationQueuedRef.current = false
        const query = productQueryRef.current.trim()
        if (!query) return
        pendingSearchFocus = true
        router.push(searchHref(query), { scroll: true })
      })
    },
    [onSearchPath, router, setParams]
  )

  const commitQuery = React.useCallback(() => {
    const query = params.query.trim()
    if (!query || onSearchPath) return
    pendingSearchFocus = true
    router.push(searchHref(query), { scroll: true })
  }, [onSearchPath, params.query, router])

  const setCategory = React.useCallback(
    (value: string) => {
      updateParams(
        { category: value, page: 1 },
        { history: "push", shallow: false, scroll: true }
      )
    },
    [updateParams]
  )

  const setProductStatus = React.useCallback(
    (value: "active" | "draft" | "archived") => {
      updateParams(
        { productStatus: value, page: 1 },
        { history: "push", shallow: false, scroll: true }
      )
    },
    [updateParams]
  )

  const setUser = React.useCallback(
    (value: string) => {
      updateParams(
        { user: value },
        {
          history: "replace",
          shallow: false,
          scroll: false,
          limitUrlUpdates: debounce(SEARCH_DELAY),
        }
      )
    },
    [updateParams]
  )

  const setPage = React.useCallback(
    (value: number) => {
      updateParams(
        { page: value },
        { history: "replace", shallow: true, scroll: false }
      )
    },
    [updateParams]
  )

  const setUserTransaction = React.useCallback(
    (value: string) => {
      updateParams(
        { user: value, transaction: "", transactionPage: 1 },
        { history: "replace", shallow: false, scroll: false }
      )
    },
    [updateParams]
  )

  const setTransactionDetail = React.useCallback(
    (value: string) => {
      updateParams(
        { transaction: value },
        { history: "replace", shallow: false, scroll: false }
      )
    },
    [updateParams]
  )

  const clearTransactionDetail = React.useCallback(() => {
    updateParams(
      { transaction: "" },
      { history: "replace", shallow: false, scroll: false }
    )
  }, [updateParams])

  const clearUserTransaction = React.useCallback(() => {
    updateParams(
      { user: "", transaction: "", transactionPage: 1 },
      { history: "replace", shallow: false, scroll: false }
    )
  }, [updateParams])

  const clearAll = React.useCallback(() => {
    updateParams(
      {
        query: "",
        category: "",
        productStatus: "active",
        user: "",
        transaction: "",
        page: 1,
        transactionPage: 1,
      },
      {
        history: "replace",
        shallow: false,
        scroll: true,
      }
    )
  }, [updateParams])

  const setCart = React.useCallback(
    (value: boolean) => {
      // Shallow URL update (Next.js Native History API): keeps useSearchParams
      // in sync without an RSC navigation, so the cart opens/closes instantly.
      window.history.replaceState(
        null,
        "",
        buildFlagSearchParamHref(pathname, nativeSearchParams, "cart", value)
      )
    },
    [nativeSearchParams, pathname]
  )

  const toggleCart = React.useCallback(() => {
    setCart(!cart)
  }, [cart, setCart])

  const setNotification = React.useCallback(
    (value: boolean) => {
      // Shallow URL update (Next.js Native History API): keeps useSearchParams
      // in sync without an RSC navigation, so the drawer opens/closes instantly.
      window.history.replaceState(
        null,
        "",
        buildFlagSearchParamHref(
          pathname,
          nativeSearchParams,
          "notification",
          value
        )
      )
    },
    [nativeSearchParams, pathname]
  )

  return {
    ...params,
    cart,
    setCart,
    openCart: () => setCart(true),
    closeCart: () => setCart(false),
    toggleCart,
    notification,
    setNotification,
    openNotification: () => setNotification(true),
    closeNotification: () => setNotification(false),
    toggleNotification: () => setNotification(!notification),
    setQuery,
    setCategory,
    setProductStatus,
    setUser,
    setPage,
    setUserTransaction,
    setTransactionDetail,
    commitQuery,
    clearQuery: () => setQuery(""),
    clearCategory: () => setCategory(""),
    clearProductStatus: () => setProductStatus("active"),
    clearUser: () => setUser(""),
    clearTransactionDetail,
    clearUserTransaction,
    clearPage: () => setPage(1),
    clearAll,
    isQueryPending: isPending,
    isCategoryPending: isPending,
    isUserPending: isPending,
    setTab: (value: string) =>
      updateParams(
        { tab: value },
        { history: "replace", shallow: false, scroll: false }
      ),
  }
}
