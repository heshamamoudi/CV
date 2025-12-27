// Performance monitoring utilities
import React from 'react';

class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.fps = 60;
    this.frameHistory = [];
    this.maxHistoryLength = 60; // Track last 60 frames
    this.performanceCallbacks = [];
  }

  startFrame() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    // Calculate FPS
    this.frameCount++;
    this.frameHistory.push(deltaTime);
    
    if (this.frameHistory.length > this.maxHistoryLength) {
      this.frameHistory.shift();
    }
    
    // Update FPS every 10 frames
    if (this.frameCount % 10 === 0) {
      const avgFrameTime = this.frameHistory.reduce((sum, time) => sum + time, 0) / this.frameHistory.length;
      this.fps = Math.round(1000 / avgFrameTime);
      
      // Trigger performance callbacks
      this.performanceCallbacks.forEach(callback => callback(this.getPerformanceData()));
    }
  }

  getPerformanceData() {
    return {
      fps: this.fps,
      frameCount: this.frameCount,
      uptime: performance.now() - this.startTime,
      avgFrameTime: this.frameHistory.length > 0 
        ? this.frameHistory.reduce((sum, time) => sum + time, 0) / this.frameHistory.length 
        : 0
    };
  }

  addPerformanceCallback(callback) {
    this.performanceCallbacks.push(callback);
  }

  removePerformanceCallback(callback) {
    const index = this.performanceCallbacks.indexOf(callback);
    if (index > -1) {
      this.performanceCallbacks.splice(index, 1);
    }
  }

  getRecommendedSettings() {
    const data = this.getPerformanceData();
    
    if (data.fps >= 50) {
      return 'high';
    } else if (data.fps >= 30) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [performanceData, setPerformanceData] = React.useState(null);
  
  React.useEffect(() => {
    const callback = (data) => setPerformanceData(data);
    performanceMonitor.addPerformanceCallback(callback);
    
    return () => {
      performanceMonitor.removePerformanceCallback(callback);
    };
  }, []);
  
  return performanceData;
}

// Adaptive quality settings based on performance
export function getAdaptiveSettings(currentPerformance) {
  const recommendation = performanceMonitor.getRecommendedSettings();
  
  const settings = {
    low: {
      starCount: 200,
      planetDetail: 16,
      enableRings: false,
      enableAtmosphere: false,
      shadowMapSize: 512,
      antialias: false
    },
    medium: {
      starCount: 500,
      planetDetail: 24,
      enableRings: true,
      enableAtmosphere: false,
      shadowMapSize: 1024,
      antialias: true
    },
    high: {
      starCount: 1000,
      planetDetail: 32,
      enableRings: true,
      enableAtmosphere: true,
      shadowMapSize: 2048,
      antialias: true
    }
  };
  
  return settings[recommendation] || settings.medium;
}
