import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function useDevToolSniffer() {
  const navigate = useNavigate()
  const location = useLocation()

  // console.log('useDevToolSniffer initialized');
  useEffect(() => {
    if(location.pathname === '/caught-you') return;
    if(import.meta.env.DEV) return;
    let isTriggered = false;
    const triggerRedirect = () => {
      if(isTriggered) return;
      isTriggered = true;
      navigate('/caught-you');
    }

    // Check 1: Window size difference (docked DevTools)
    const checkDimensions = () => {
      const threshold = 160
      const widthDiff = window.outerWidth - window.innerWidth > threshold
      const heightDiff = window.outerHeight - window.innerHeight > threshold

      console.log('Width difference:', window.outerWidth - window.innerWidth, 'Height difference:', window.outerHeight - window.innerHeight);

      if (widthDiff || heightDiff) {
        triggerRedirect()
      }
    }

    // Check 2: Debugger execution lag check
    const checkDebuggerDelay = () => {
      const start = performance.now()
      // eslint-disable-next-line no-debugger
      debugger
      const end = performance.now()

      if (end - start > 100) {
        triggerRedirect()
      }
    }

    window.addEventListener('resize', checkDimensions)
    const interval = setInterval(checkDebuggerDelay, 1000)

    return () => {
      window.removeEventListener('resize', checkDimensions)
      clearInterval(interval)
    }
  }, [navigate, location.pathname])
}