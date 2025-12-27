import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { usePerformanceSettings } from './hooks/useDeviceDetection';
import { isWebGLSupported, createWebGLContext } from './utils/webglDetection';
import ErrorBoundary from './components/ErrorBoundary';
import FallbackCV from './components/FallbackCV';
import Scene3D from './components/Scene3D';
import Navigation from './components/Navigation';
import HeroSection from './components/sections/HeroSection';
import ExperienceSection from './components/sections/ExperienceSection';
import ProjectsSection from './components/sections/ProjectsSection';
import SkillsSection from './components/sections/SkillsSection';
import ContactSection from './components/sections/ContactSection';
import LoadingScreen from './components/LoadingScreen';
import './index.css';

function App() {
  const [currentSection, setCurrentSection] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [webGLSupported, setWebGLSupported] = useState(null);
  const performanceSettings = usePerformanceSettings();

  // Check WebGL support on component mount
  useEffect(() => {
    const checkWebGL = async () => {
      try {
        const supported = isWebGLSupported();
        
        if (supported) {
          // Additional context creation test
          const canvas = document.createElement('canvas');
          const context = createWebGLContext(canvas, {
            antialias: performanceSettings.antialias,
            powerPreference: 'high-performance'
          });
          
          setWebGLSupported(!!context);
          
          if (context) {
            // Clean up test context
            canvas.width = 1;
            canvas.height = 1;
          }
        } else {
          setWebGLSupported(false);
        }
      } catch (error) {
        console.warn('WebGL detection failed:', error);
        setWebGLSupported(false);
      }
    };

    checkWebGL();
  }, [performanceSettings.antialias]);

  const handleSectionChange = (index) => {
    setCurrentSection(index);
  };

  if (isLoading) {
    return <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />;
  }

  // If WebGL is not supported, show fallback CV
  if (webGLSupported === false) {
    return <FallbackCV />;
  }

  // If still checking WebGL support, show loading
  if (webGLSupported === null) {
    return <LoadingScreen onLoadingComplete={() => {}} />;
  }

  return (
    <ErrorBoundary>
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Background Scene */}
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 75 }}
          gl={{ 
            antialias: performanceSettings.antialias, 
            alpha: true,
            pixelRatio: performanceSettings.pixelRatio,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false,
            stencil: true,
            depth: true,
            premultipliedAlpha: true
          }}
          onCreated={(state) => {
            console.log('WebGL context created successfully');
            // Set up error handling for context loss
            const canvas = state.gl.domElement;
            canvas.addEventListener('webglcontextlost', (event) => {
              console.warn('WebGL context lost');
              event.preventDefault();
            });
            canvas.addEventListener('webglcontextrestored', () => {
              console.log('WebGL context restored');
            });
          }}
        >
          <Suspense fallback={null}>
            <Scene3D currentSection={currentSection} />
            <Environment preset="night" />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              enableRotate={false}
              autoRotate={true}
              autoRotateSpeed={0.2}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Navigation */}
      <Navigation 
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
      />

      {/* Content Sections */}
      <div className="relative z-10 w-full">
        <HeroSection
          isActive={currentSection === 0}
          onNext={() => handleSectionChange(1)}
        />
        
        <ExperienceSection
          isActive={currentSection === 1}
          onNext={() => handleSectionChange(2)}
          onPrev={() => handleSectionChange(0)}
        />
        
        <ProjectsSection
          isActive={currentSection === 2}
          onNext={() => handleSectionChange(3)}
          onPrev={() => handleSectionChange(1)}
        />
        
        <SkillsSection
          isActive={currentSection === 3}
          onNext={() => handleSectionChange(4)}
          onPrev={() => handleSectionChange(2)}
        />
        
        <ContactSection
          isActive={currentSection === 4}
          onPrev={() => handleSectionChange(3)}
        />
      </div>
    </div>
    </ErrorBoundary>
  );
}

export default App;
