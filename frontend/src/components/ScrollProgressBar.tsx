"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import React from "react";

interface ScrollProgressBarProps {
  containerRef?: React.RefObject<HTMLElement | null>;
}

export default function ScrollProgressBar({ containerRef }: ScrollProgressBarProps) {
  // 🚀 TRACK SPECIFIC CONTAINER: If containerRef is provided, it tracks that area. 
  // Otherwise, it tracks the global window scroll.
  const { scrollYProgress } = useScroll({
    container: containerRef || undefined
  });
  
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-[9999]"
      style={{ scaleX }}
    />
  );
}
