
import React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize with SSR-safe default
  const getInitialMobileState = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  };

  const [isMobile, setIsMobile] = React.useState<boolean>(getInitialMobileState)

  React.useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Set initial state immediately
    updateMobileState()

    // Create media query listener
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", updateMobileState)

    return () => mql.removeEventListener("change", updateMobileState)
  }, [])

  return isMobile
}

// Add tablet breakpoint detection
export function useIsTablet() {
  const getInitialTabletState = () => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    return width >= MOBILE_BREAKPOINT && width <= 1023;
  };

  const [isTablet, setIsTablet] = React.useState<boolean>(getInitialTabletState)
  
  React.useEffect(() => {
    const updateTabletState = () => {
      const width = window.innerWidth;
      setIsTablet(width >= MOBILE_BREAKPOINT && width <= 1023);
    }

    // Set initial state immediately
    updateTabletState()

    // Create media query listener
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: 1023px)`)
    mql.addEventListener("change", updateTabletState)

    return () => mql.removeEventListener("change", updateTabletState)
  }, [])
  
  return isTablet
}
