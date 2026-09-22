import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // BUG-2 audit (react-hooks/set-state-in-effect): baca media query saat
  // inisialisasi, bukan di dalam effect, sehingga tidak ada setState
  // sinkron yang memicu cascading render.
  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window === "undefined"
      ? false
      : window.innerWidth < MOBILE_BREAKPOINT,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    // Effect hanya BERLANGGANAN ke sistem eksternal (matchMedia) — perubahan
    // state terjadi di callback event, bukan langsung di body effect.
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

