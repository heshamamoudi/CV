import { useState, useEffect } from 'react';

export function useDeviceDetection() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    pixelRatio: 1
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const pixelRatio = window.devicePixelRatio || 1;
      
      const isMobile = width <= 768;
      const isTablet = width > 768 && width <= 1024;
      const isDesktop = width > 1024;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        hasTouch,
        pixelRatio,
        width,
        height
      });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceInfo;
}

export function usePerformanceSettings() {
  const device = useDeviceDetection();
  
  return {
    // Particle count based on device
    particleCount: device.isMobile ? 200 : device.isTablet ? 500 : 1000,
    
    // Shadow quality
    enableShadows: !device.isMobile,
    
    // Anti-aliasing
    antialias: !device.isMobile,
    
    // Pixel ratio (for performance)
    pixelRatio: Math.min(device.pixelRatio, device.isMobile ? 1.5 : 2),
    
    // Animation complexity
    enableComplexAnimations: device.isDesktop,
    
    // Post-processing effects
    enablePostProcessing: device.isDesktop
  };
}
