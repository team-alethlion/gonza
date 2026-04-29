"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import React, { useSyncExternalStore } from "react";

/**
 * 🚀 HYDRATION HELPER
 * Standard React 18 pattern to detect if we are on the client.
 * This avoids useEffect + setState, fixing the "cascading renders" error.
 */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function AnimatePresenceWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // 🛡️ Safe Client Detection:
  // Returns false on server, true on client, without triggering extra effects.
  const isMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isMounted) {
    return <div className="w-full min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="relative w-full min-h-screen bg-background overflow-hidden">
      {/* 🎨 DYNAMIC TRANSITION BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Subtle Grid */}
        <div 
          className="absolute inset-0 opacity-[0.08]" 
          style={{ 
            backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, 
            backgroundSize: '40px 40px' 
          }} 
        />
        
        {/* Static Blobs (No animation) */}
        <div 
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary opacity-[0.05] rounded-full blur-[120px]" 
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-500 opacity-[0.04] rounded-full blur-[150px]" 
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          // 📥 RECEIVING (Entry)
          initial={{ 
            opacity: 0, 
            filter: "blur(15px)", 
            scale: 0.96,
            y: 10 
          }}
          // 🟢 ACTIVE STATE
          animate={{ 
            opacity: 1, 
            filter: "blur(0px)", 
            scale: 1, 
            y: 0 
          }}
          // 📤 SENDING (Exit)
          exit={{ 
            opacity: 0, 
            filter: "blur(15px)", 
            scale: 1.04, 
            y: -10
          }}
          transition={{ 
            duration: 0.3, 
            ease: [0.22, 1, 0.36, 1] 
          }}
          onAnimationStart={() => {
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "instant" });
            }
          }}
          className="relative z-10 w-full min-h-screen bg-background/40 backdrop-blur-[1px]"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
