import { createLoader } from "nuqs/server"
import {
  createParser,
  parseAsString,
  parseAsStringLiteral,
  type UrlKeys,
} from "nuqs/server"

const parseAsPage = createParser({
  parse(value) {
    const page = Number(value)
    return Number.isInteger(page) && page > 0 ? page : null
  },
  serialize: String,
}).withDefault(1)

const parseAsFlag = createParser<boolean>({
  parse(value) {
    return value === "" || value === "1" || value === "true" ? true : null
  },
  serialize(value) {
    return value ? "1" : ""
  },
})

export const searchParams = {
  tab: parseAsString.withDefault(""),
  query: parseAsString.withDefault(""),
  category: parseAsString.withDefault(""),
  productStatus: parseAsStringLiteral([
    "active",
    "draft",
    "archived",
  ]).withDefault("active"),
  user: parseAsString.withDefault(""),
  transaction: parseAsString.withDefault(""),
  page: parseAsPage,
  transactionPage: parseAsPage,
  cart: parseAsFlag.withDefault(false),
  notification: parseAsFlag.withDefault(false),
}

export const searchParamKeys = {
  tab: "tab",
  query: "q",
  category: "c",
  productStatus: "status",
  user: "u",
  transaction: "id",
  page: "page",
  transactionPage: "tp",
  cart: "cart",
  notification: "notification",
} satisfies UrlKeys<typeof searchParams>

export const SearchParams = createLoader(searchParams, {
  urlKeys: searchParamKeys,
})
