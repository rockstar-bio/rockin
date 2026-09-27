import { Variants } from "motion/react"

export const activityItemAnimation: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: {
      duration: 0.14,
      ease: [0.23, 1, 0.32, 1],
    },
  },
}

export const popUp: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
    },
  },
}

export const popUpFromBottomForText: Variants = {
  hidden: {
    opacity: 1,
    y: 70,
    transition: {
      type: "spring",
      stiffness: 30,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 30,
    },
  },
}
export const fromRightVariant: Variants = {
  hidden: { x: 100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.1,
      type: "spring",
      stiffness: 100,
    },
  },
}

export const Top: Variants = {
  hidden: {
    opacity: 0,
    y: -70,
    transition: {
      type: "spring",
      stiffness: 30,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 30,
    },
  },
}

export const Bottom: Variants = {
  hidden: {
    opacity: 1,
    y: 70,
    transition: {
      type: "spring",
      stiffness: 30,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 30,
    },
  },
}

export const headingFromLeft: Variants = {
  hidden: { x: -200, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.1,
      type: "spring",
      stiffness: 70,
    },
  },
}

export const fromLeftVariant: Variants = {
  hidden: { x: -100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.1,
      type: "spring",
      stiffness: 100,
    },
  },
}

export const fromLeftChildren: Variants = {
  hidden: { x: -100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.1,
    },
  },
}

export const fromTopVariant: Variants = {
  hidden: { y: -100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.1,
      type: "spring",
      stiffness: 100,
    },
  },
}

export const opacityVariant: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delay: 0.2 } },
}

export const hamFastFadeContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0,
      staggerChildren: 0.1,
    },
  },
}

export const mobileNavItemSideways: Variants = {
  hidden: { x: -40, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
  },
}

export const FadeContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delayChildren: 0, staggerChildren: 0.1 },
  },
}

export const svgVariant: Variants = {
  hidden: {
    pathLength: 0,
  },
  visible: {
    pathLength: 1,
    transition: {
      duration: 4,
      ease: "easeInOut",
    },
  },
}

export const searchBarSlideAnimation: Variants = {
  hidden: {
    width: 0,
    opacity: 0,
  },
  visible: {
    width: "100%",
    opacity: 1,
    transition: {
      type: "tween",
      ease: "linear",
      duration: 1,
    },
  },
}

export const BlogCardAnimation: Variants = {
  hidden: {
    y: 50,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      delay: 0.2,
    },
  },
}

export const ListItemVariant: Variants = {
  hidden: {
    opacity: 0,
    x: -50, // Slide in from the left
    transition: {
      type: "spring",
      stiffness: 50,
    },
  },
  visible: {
    opacity: 1,
    x: 0, // Set to the final position
    transition: {
      type: "spring",
      stiffness: 50,
    },
  },
}

export const kanbanOrderCardAnimation: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.985,
    filter: "blur(2px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 420,
      damping: 34,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.985,
    filter: "blur(1px)",
    transition: {
      duration: 0.14,
      ease: [0.23, 1, 0.32, 1],
    },
  },
}

export const kanbanOrderCardReducedMotionAnimation: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.12,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      ease: [0.23, 1, 0.32, 1],
    },
  },
}

export const kanbanOrderCardLayoutTransition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.75,
} as const
