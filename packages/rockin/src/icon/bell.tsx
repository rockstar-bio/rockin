"use client";

import { cn } from "cn";
import type { Variants } from "motion/react";
import {
 LazyMotion,
 domMin,
 m,
 useAnimation,
 useReducedMotion,
} from "motion/react";
import {
 forwardRef,
 useCallback,
 useEffect,
 useImperativeHandle,
 useRef,
 useState,
 type HTMLAttributes,
} from "react";
export interface BellIconHandle {
 startAnimation: () => void;
 stopAnimation: () => void;
}

interface BellIconProps extends Omit<
 HTMLAttributes<HTMLDivElement>,
 | "color"
 | "onDrag"
 | "onDragStart"
 | "onDragEnd"
 | "onAnimationStart"
 | "onAnimationEnd"
 | "onAnimationIteration"
> {
 size?: number;
 duration?: number;
 isAnimated?: boolean;
 color?: string;
}

const BellIcon = forwardRef<BellIconHandle, BellIconProps>(
 (
  {
   onMouseEnter,
   onMouseLeave,
   className,
   size = 24,
   duration = 1,
   isAnimated = true,
   color,
   ...props
  },
  ref,
 ) => {
 const controls = useAnimation();
 const reduced = useReducedMotion();
  const [ringing, setRinging] = useState(false);
  const ringingRef = useRef(false);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRing = useCallback(() => {
   ringingRef.current = false;
   setRinging(false);
   controls.start("normal");
   if (ringTimer.current) {
    clearTimeout(ringTimer.current);
    ringTimer.current = null;
   }
  }, [controls]);

  const startRing = useCallback(() => {
   if (reduced) {
    stopRing();
    return;
   }
   if (ringingRef.current) return;

   ringingRef.current = true;
   setRinging(true);
   ringTimer.current = setTimeout(stopRing, 140);
  }, [reduced, stopRing]);

  useEffect(
   () => () => {
    if (ringTimer.current) clearTimeout(ringTimer.current);
   },
   [],
  );

  useImperativeHandle(ref, () => {
   return {
    startAnimation: startRing,
    stopAnimation: stopRing,
   };
  }, [startRing, stopRing]);

  const handleEnter = useCallback(
   (e?: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnimated || reduced) return;
    controls.start("animate");
    onMouseEnter?.(e as any);
   },
   [controls, reduced, isAnimated, onMouseEnter],
  );

  const handleLeave = useCallback(
   (e: React.MouseEvent<HTMLDivElement>) => {
    controls.start("normal");
    onMouseLeave?.(e as any);
   },
   [controls, onMouseLeave],
  );

  const bellVariants: Variants = {
   normal: { transform: "rotate(0deg)" },
   ring: {
    transform: "rotate(8deg)",
    transition: {
     duration: 0.14,
     ease: [0.77, 0, 0.175, 1],
    },
   },
   animate: {
    rotate: [0, 7, -18, 14, -9, 5, -2, 0],
    transition: {
     duration: 1.3 * duration,
     ease: "easeInOut",
     times: [0, 0.09, 0.26, 0.45, 0.62, 0.78, 0.9, 1],
    },
   },
  };

  const clapperVariants: Variants = {
   normal: { transform: "translateX(0px)" },
   ring: {
    transform: "translateX(1px)",
    transition: {
     duration: 0.14,
     ease: [0.77, 0, 0.175, 1],
    },
   },
   animate: {
    x: [0, 1.5, -5, 4, -2.5, 1.5, -1, 0],
    transition: {
     duration: 1.3 * duration,
     ease: "easeInOut",
     times: [0, 0.09, 0.26, 0.45, 0.62, 0.78, 0.9, 1],
     delay: 0.05 * duration,
    },
   },
  };

  return (
   <LazyMotion features={domMin} strict>
    <m.div
     className={cn("relative inline-flex", className)}
     onMouseEnter={handleEnter}
     onMouseLeave={handleLeave}
     {...props}
     style={{ color, ...props.style }}
    >
     <m.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={ringing ? "ring" : controls}
      initial="normal"
      variants={bellVariants}
      style={{ transformOrigin: "top center" }}
     >
      <m.path d="M10.268 21a2 2 0 0 0 3.464 0" variants={clapperVariants} />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
     </m.svg>
    </m.div>
   </LazyMotion>
  );
 },
);

BellIcon.displayName = "BellIcon";
export { BellIcon };
