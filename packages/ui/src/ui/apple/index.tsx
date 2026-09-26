"use client"
import { AnimatePresence } from "motion/react"
import { useState } from "react"
import { AppleHelloEffectEnglish } from "./english"
import { AppleHelloEffectHindi } from "./hindi"
import { AppleHelloEffectSpanish } from "./spanish"

export { AppleHelloEffectEnglish } from "./english"
export { AppleHelloEffectHindi } from "./hindi"
export { AppleHelloEffectSpanish } from "./spanish"

export function Apple() {
  const [index, setIndex] = useState(0)

  const handleAnimationEnd = () => {
    setIndex((prevIndex) => (prevIndex + 1) % 3)
  }

  const demos = [
    <AppleHelloEffectHindi
      key="hindi"
      onAnimationComplete={handleAnimationEnd}
    />,
    <AppleHelloEffectEnglish
      key="english"
      onAnimationComplete={handleAnimationEnd}
    />,

    <AppleHelloEffectSpanish
      key="spanish"
      durationScale={0.8}
      onAnimationComplete={handleAnimationEnd}
    />,
  ]
  return (
    <main className="m-auto flex grow items-center justify-center">
      <AnimatePresence mode="wait">{demos[index]}</AnimatePresence>
    </main>
  )
}
