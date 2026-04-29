"use client";

import { useCallback } from "react";
import { animate } from "framer-motion";

/**
 * 🚀 useSmoothScroll
 * A custom hook to trigger smooth, physics-based scrolling to any element or position.
 * This is more "consistent" and "premium" than the native CSS scroll-behavior.
 */
export function useSmoothScroll() {
  const scrollTo = useCallback((target: number | string) => {
    let targetPosition = 0;

    if (typeof target === "string") {
      const element = document.querySelector(target);
      if (element) {
        targetPosition = element.getBoundingClientRect().top + window.scrollY;
      }
    } else {
      targetPosition = target;
    }

    animate(window.scrollY, targetPosition, {
      type: "spring",
      stiffness: 100,
      damping: 20,
      onUpdate: (latest) => window.scrollTo(0, latest),
    });
  }, []);

  return { scrollTo };
}
