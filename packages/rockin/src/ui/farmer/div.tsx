"use client"
import { useMediaQuery } from "#hooks/useMediaQuery"
import { motion, MotionProps, Variants } from "motion/react"
import React from "react"

const AnimatedDiv: React.ForwardRefExoticComponent<
  AnimatedTAGProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, AnimatedTAGProps>(
  (
    { variants, mobileVariants, className, children, infinity, ...motionProps },
    ref
  ) => {
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const selectedVariants =
      !isDesktop && mobileVariants ? mobileVariants : variants

    return (
      <motion.div
        ref={ref}
        layout
        className={className}
        initial="hidden"
        transition={{
          staggerChildren: 0.1,
          delayChildren: 0.2,
        }}
        variants={selectedVariants}
        viewport={{ once: !infinity }}
        whileInView="visible"
        {...motionProps}
      >
        {children}
      </motion.div>
    )
  }
)

AnimatedDiv.displayName = "AnimatedDiv"

export default AnimatedDiv
export type AnimatedTAGProps = MotionProps & {
  variants?: Variants
  mobileVariants?: Variants
  className?: string
  children: React.ReactNode
  infinity?: boolean
}
