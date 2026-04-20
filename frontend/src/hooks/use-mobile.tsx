
import React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Set state on mount
    updateMobileState()

    // Create media query listener
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    mql.addEventListener("change", handler)

    return () => mql.removeEventListener("change", handler)
  }, [])

  return isMobile
}

// Add tablet breakpoint detection
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean>(false)

  React.useEffect(() => {
    const updateTabletState = () => {
      const width = window.innerWidth;
      setIsTablet(width >= MOBILE_BREAKPOINT && width <= 1023);
    }

    // Set state on mount
    updateTabletState()

    // Create media query listener
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: 1023px)`)
    const handler = (e: MediaQueryListEvent) => {
      setIsTablet(e.matches)
    }
    mql.addEventListener("change", handler)

    return () => mql.removeEventListener("change", handler)
  }, [])

  return isTablet
}
