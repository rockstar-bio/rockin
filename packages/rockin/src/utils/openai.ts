import { OpenAI as AI } from "openai"

let client: AI | undefined

export function OpenAI() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  client ??= new AI({ apiKey })

  return client
}
