// WebGL detection and compatibility utilities

export function isWebGLSupported() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!(context && context.getExtension);
  } catch (e) {
    return false;
  }
}

export function getWebGLCapabilities() {
  if (!isWebGLSupported()) {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
    return {
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown',
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
    };
  } catch (e) {
    console.warn('Error getting WebGL capabilities:', e);
    return null;
  }
}

export function createWebGLContext(canvas, options = {}) {
  const contextNames = ['webgl', 'experimental-webgl'];
  
  for (let i = 0; i < contextNames.length; i++) {
    try {
      const context = canvas.getContext(contextNames[i], {
        alpha: true,
        antialias: options.antialias !== false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: options.powerPreference || 'default',
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: true,
        ...options
      });
      
      if (context) {
        return context;
      }
    } catch (e) {
      console.warn(`Failed to create ${contextNames[i]} context:`, e);
    }
  }
  
  return null;
}

export function getWebGLErrorMessage() {
  const messages = {
    noWebGL: 'Your browser does not support WebGL, which is required for the 3D experience.',
    webglDisabled: 'WebGL is disabled in your browser. Please enable it to view the 3D content.',
    contextLost: 'WebGL context was lost. Please refresh the page to restore the 3D experience.',
    performanceCaveat: 'WebGL performance may be limited on this device.',
  };

  if (!isWebGLSupported()) {
    return messages.noWebGL;
  }

  // Check if WebGL is explicitly disabled
  const canvas = document.createElement('canvas');
  try {
    const context = createWebGLContext(canvas, { failIfMajorPerformanceCaveat: true });
    if (!context) {
      return messages.webglDisabled;
    }
  } catch (e) {
    if (e.message && e.message.includes('performance')) {
      return messages.performanceCaveat;
    }
    return messages.webglDisabled;
  }

  return messages.contextLost;
}
