// Animation utility functions for smooth transitions and effects

export const easeInOutCubic = (t) => {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
};

export const easeInOutQuart = (t) => {
  return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
};

export const spring = (t, tension = 0.8, friction = 0.9) => {
  return 1 - Math.pow(Math.E, -tension * t) * Math.cos(friction * t);
};

export const bounce = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const createScrollAnimationConfig = (isMobile = false) => ({
  initial: { opacity: 0, y: isMobile ? 30 : 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: isMobile ? -30 : -50 },
  transition: {
    duration: isMobile ? 0.4 : 0.6,
    ease: "easeInOut"
  }
});

export const staggerChildren = (delay = 0.1) => ({
  animate: {
    transition: {
      staggerChildren: delay
    }
  }
});

export const slideInFromLeft = (delay = 0) => ({
  initial: { x: -100, opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: {
      delay,
      duration: 0.6,
      ease: "easeOut"
    }
  }
});

export const slideInFromRight = (delay = 0) => ({
  initial: { x: 100, opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: {
      delay,
      duration: 0.6,
      ease: "easeOut"
    }
  }
});

export const scaleIn = (delay = 0) => ({
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      delay,
      duration: 0.5,
      ease: "easeOut"
    }
  }
});

export const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      delay,
      duration: 0.5
    }
  }
});
