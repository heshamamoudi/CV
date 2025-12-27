// App constants and configuration

export const COLORS = {
  gold: '#FFD700',
  goldDark: '#FFA500',
  white: '#FFFFFF',
  black: '#000000',
  darkBg: '#0A0A0A',
  darkPanel: '#1A1A1A',
  gradients: {
    gold: 'from-gold to-yellow-400',
    blue: 'from-blue-500 to-cyan-400',
    green: 'from-green-500 to-emerald-400',
    purple: 'from-purple-500 to-pink-400'
  }
};

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280
};

export const ANIMATION_DURATIONS = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.8,
  loading: 3.0
};

export const SECTION_IDS = {
  hero: 0,
  experience: 1,
  projects: 2,
  skills: 3,
  contact: 4
};

export const PERFORMANCE_LEVELS = {
  low: {
    particleCount: 100,
    enableShadows: false,
    antialias: false,
    pixelRatio: 1,
    enablePostProcessing: false
  },
  medium: {
    particleCount: 500,
    enableShadows: false,
    antialias: true,
    pixelRatio: 1.5,
    enablePostProcessing: false
  },
  high: {
    particleCount: 1000,
    enableShadows: true,
    antialias: true,
    pixelRatio: 2,
    enablePostProcessing: true
  }
};

export const SOCIAL_LINKS = {
  github: 'https://github.com/heshamamoudi',
  linkedin: 'https://www.linkedin.com/in/heshamamoudi',
  email: 'heshamamoudi.it@gmail.com',
  phone: '+966597477814'
};

export const THREE_SETTINGS = {
  camera: {
    position: [0, 0, 10],
    fov: 75
  },
  lights: {
    ambientIntensity: 0.3,
    directionalIntensity: 1,
    pointIntensity: 0.8
  },
  materials: {
    metalness: 0.8,
    roughness: 0.2,
    distortSpeed: 2,
    distortAmount: 0.3
  }
};
