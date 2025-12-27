import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {  Sphere } from '@react-three/drei';
import * as THREE from 'three';



// Realistic solar system planets with varied positions for each section
const SOLAR_SYSTEM = [
  { name: 'Sun', color: '#FDB813', secondaryColor: '#FF8C00', type: 'star', scale: 0.8, 
    sidePos: { x: 5, y: 0.5, z: -1 }, mobileSidePos: { x: 3, y: -1, z: 0 } }, // Top-right
  { name: 'Earth', color: '#6B93D6', secondaryColor: '#4F7942', type: 'rocky', scale: 0.5,
    sidePos: { x: -5, y: 0, z: 0 }, mobileSidePos: { x: -3, y: 0, z: 0 } }, // Left side
  { name: 'Mars', color: '#C1440E', secondaryColor: '#8B4513', type: 'rocky', scale: 0.4,
    sidePos: { x: 5, y: -1, z: 0 }, mobileSidePos: { x: 3, y: -1.5, z: 0 } }, // Bottom-right
  { name: 'Jupiter', color: '#D8CA9D', secondaryColor: '#B5A788', type: 'gas', scale: 0.7,
    sidePos: { x: -4, y: 1, z: -1 }, mobileSidePos: { x: -3, y: 1, z: 0 } }, // Top-left
  { name: 'Saturn', color: '#F4D59E', secondaryColor: '#CD9B4A', type: 'gas', scale: 0.65,
    sidePos: { x: 4, y: -0.5, z: 0 }, mobileSidePos: { x: 3, y: -1, z: 0 } }, // Right
  { name: 'Moon', color: '#C4C4C4', secondaryColor: '#8A8A8A', type: 'rocky', scale: 0.25,
    sidePos: { x: -5, y: -1, z: 0 }, mobileSidePos: { x: -3, y: -2, z: 0 } }, // Bottom-left
  { name: 'Venus', color: '#FFC649', secondaryColor: '#D4A84B', type: 'rocky', scale: 0.45,
    sidePos: { x: 5, y: 1, z: -1 }, mobileSidePos: { x: 3, y: 0.5, z: 0 } }, // Top-right
];

// Create highly realistic planet texture
function createRealisticTexture(planet, size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Seed for consistent random patterns
  const seed = planet.name.charCodeAt(0);
  const seededRandom = (i) => ((seed * 9301 + i * 49297) % 233280) / 233280;
  
  if (planet.type === 'star') {
    // SUN - Realistic solar surface with granulation
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, '#FFFFF0');
    gradient.addColorStop(0.2, '#FFE566');
    gradient.addColorStop(0.5, planet.color);
    gradient.addColorStop(0.8, planet.secondaryColor);
    gradient.addColorStop(1, '#CC6600');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Solar granulation
    for (let i = 0; i < 500; i++) {
      const x = seededRandom(i) * size;
      const y = seededRandom(i + 1000) * size;
      const r = 5 + seededRandom(i + 2000) * 15;
      const bright = seededRandom(i + 3000) > 0.5;
      ctx.fillStyle = bright ? 'rgba(255,255,200,0.3)' : 'rgba(200,100,0,0.2)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Solar flares
    ctx.strokeStyle = 'rgba(255,200,100,0.4)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2 - 20, angle, angle + 0.3);
      ctx.stroke();
    }
    
  } else if (planet.name === 'Earth') {
    // EARTH - Realistic with continents, clouds, oceans
    // Ocean base
    const oceanGradient = ctx.createRadialGradient(size*0.7, size*0.3, 0, size/2, size/2, size/2);
    oceanGradient.addColorStop(0, '#87CEEB');
    oceanGradient.addColorStop(0.5, '#4169E1');
    oceanGradient.addColorStop(1, '#191970');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, size, size);
    
    // Continents
    const continentShapes = [
      { x: 0.3, y: 0.3, w: 0.25, h: 0.35 }, // North America-ish
      { x: 0.55, y: 0.25, w: 0.2, h: 0.4 },  // Europe/Africa-ish
      { x: 0.75, y: 0.35, w: 0.2, h: 0.25 }, // Asia-ish
      { x: 0.35, y: 0.7, w: 0.15, h: 0.2 },  // South America-ish
    ];
    
    continentShapes.forEach((cont, i) => {
      const gradient = ctx.createRadialGradient(
        cont.x * size, cont.y * size, 0,
        cont.x * size, cont.y * size, cont.w * size
      );
      gradient.addColorStop(0, '#228B22');
      gradient.addColorStop(0.5, '#8B7355');
      gradient.addColorStop(1, '#556B2F');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(cont.x * size, cont.y * size, cont.w * size / 2, cont.h * size / 2, 0.2 * i, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Cloud wisps
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 30; i++) {
      const x = seededRandom(i * 7) * size;
      const y = seededRandom(i * 11) * size;
      ctx.beginPath();
      ctx.ellipse(x, y, 30 + seededRandom(i) * 50, 10 + seededRandom(i+1) * 20, seededRandom(i+2) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    
  } else if (planet.name === 'Mars') {
    // MARS - Red planet with realistic features
    const marsGradient = ctx.createRadialGradient(size*0.7, size*0.3, 0, size/2, size/2, size/2);
    marsGradient.addColorStop(0, '#E27B58');
    marsGradient.addColorStop(0.4, '#C1440E');
    marsGradient.addColorStop(0.7, '#8B3A1C');
    marsGradient.addColorStop(1, '#4A1A0A');
    ctx.fillStyle = marsGradient;
    ctx.fillRect(0, 0, size, size);
    
    // Darker regions (mare)
    ctx.fillStyle = 'rgba(80, 30, 10, 0.5)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(
        seededRandom(i * 13) * size, 
        seededRandom(i * 17) * size, 
        50 + seededRandom(i * 19) * 100,
        30 + seededRandom(i * 23) * 60,
        seededRandom(i * 29) * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }
    
    // Polar ice cap
    ctx.fillStyle = 'rgba(255,250,250,0.7)';
    ctx.beginPath();
    ctx.ellipse(size/2, size * 0.05, size * 0.3, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Craters
    for (let i = 0; i < 40; i++) {
      const x = seededRandom(i * 31) * size;
      const y = seededRandom(i * 37) * size;
      const r = 3 + seededRandom(i * 41) * 20;
      
      // Crater shadow
      ctx.fillStyle = 'rgba(60, 20, 10, 0.4)';
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, r, 0, Math.PI * 2);
      ctx.fill();
      
      // Crater
      ctx.fillStyle = 'rgba(100, 50, 30, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
  } else if (planet.name === 'Jupiter') {
    // JUPITER - Gas giant with Great Red Spot
    for (let y = 0; y < size; y++) {
      const bandPhase = Math.sin(y * 0.015) * 0.5 + Math.sin(y * 0.008) * 0.3;
      const turbulence = Math.sin(y * 0.05 + Math.cos(y * 0.02) * 3) * 0.2;
      const brightness = 0.6 + bandPhase * 0.3 + turbulence;
      
      const r = Math.floor(216 * brightness);
      const g = Math.floor(202 * brightness * 0.95);
      const b = Math.floor(157 * brightness * 0.9);
      
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, size, 1);
    }
    
    // Great Red Spot
    const spotGradient = ctx.createRadialGradient(size*0.6, size*0.55, 0, size*0.6, size*0.55, size*0.12);
    spotGradient.addColorStop(0, '#D4735E');
    spotGradient.addColorStop(0.5, '#C45A3E');
    spotGradient.addColorStop(1, 'rgba(180,80,60,0)');
    ctx.fillStyle = spotGradient;
    ctx.beginPath();
    ctx.ellipse(size*0.6, size*0.55, size*0.12, size*0.07, 0.1, 0, Math.PI * 2);
    ctx.fill();
    
  } else if (planet.name === 'Saturn') {
    // SATURN - Pale gas giant
    for (let y = 0; y < size; y++) {
      const bandPhase = Math.sin(y * 0.012) * 0.4;
      const brightness = 0.7 + bandPhase * 0.2;
      
      const r = Math.floor(244 * brightness);
      const g = Math.floor(213 * brightness);
      const b = Math.floor(158 * brightness * 0.9);
      
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, size, 1);
    }
    
    // Subtle polar darkening
    ctx.fillStyle = 'rgba(150,120,80,0.3)';
    ctx.beginPath();
    ctx.ellipse(size/2, 0, size*0.4, size*0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
  } else if (planet.name === 'Moon') {
    // MOON - Detailed lunar surface
    const moonGradient = ctx.createRadialGradient(size*0.65, size*0.35, 0, size/2, size/2, size/2);
    moonGradient.addColorStop(0, '#E8E8E8');
    moonGradient.addColorStop(0.5, '#C4C4C4');
    moonGradient.addColorStop(1, '#6E6E6E');
    ctx.fillStyle = moonGradient;
    ctx.fillRect(0, 0, size, size);
    
    // Mare (dark regions)
    ctx.fillStyle = 'rgba(80, 80, 90, 0.5)';
    ctx.beginPath();
    ctx.ellipse(size*0.4, size*0.35, size*0.15, size*0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size*0.6, size*0.5, size*0.1, size*0.08, 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Craters
    for (let i = 0; i < 80; i++) {
      const x = seededRandom(i * 43) * size;
      const y = seededRandom(i * 47) * size;
      const r = 2 + seededRandom(i * 53) * 25;
      
      // Crater rim highlight
      ctx.strokeStyle = 'rgba(200,200,200,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI * 0.8, Math.PI * 1.8);
      ctx.stroke();
      
      // Crater shadow
      ctx.fillStyle = 'rgba(50,50,55,0.3)';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    
  } else {
    // VENUS or other rocky - thick atmosphere
    const venusGradient = ctx.createRadialGradient(size*0.6, size*0.4, 0, size/2, size/2, size/2);
    venusGradient.addColorStop(0, '#FFE4B5');
    venusGradient.addColorStop(0.5, planet.color);
    venusGradient.addColorStop(1, planet.secondaryColor);
    ctx.fillStyle = venusGradient;
    ctx.fillRect(0, 0, size, size);
    
    // Atmospheric swirls
    ctx.strokeStyle = 'rgba(255,220,180,0.3)';
    ctx.lineWidth = 8;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      const startAngle = seededRandom(i * 61) * Math.PI * 2;
      ctx.arc(size/2, size/2, size * 0.2 + i * 15, startAngle, startAngle + 1.5);
      ctx.stroke();
    }
  }
  
  return new THREE.CanvasTexture(canvas);
}

// Animated planet that transitions in circular arc
function TransitioningPlanet({ planet, index, totalPlanets, currentSection }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const transitionProgress = useRef(0);
  
  const isHeroMode = currentSection === 0;
  const isThisPlanetSelected = currentSection === index + 1;
  
  // Detect mobile for smaller planets
  const isMobile = window.innerWidth < 768;
  const mobileScale = isMobile ? 0.6 : 1; // 60% size on mobile
  
  // Create realistic planet material
  const { planetMaterial } = useMemo(() => {
    const texture = createRealisticTexture(planet);
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: planet.type === 'star' ? 0.1 : planet.type === 'gas' ? 0.35 : 0.65,
      metalness: planet.type === 'star' ? 0.0 : 0.05,
      emissive: planet.type === 'star' ? new THREE.Color(planet.color) : new THREE.Color(0x000000),
      emissiveIntensity: planet.type === 'star' ? 0.4 : 0,
    });
    
    return { planetMaterial: material };
  }, [planet]);
  
  // Circular arc transition animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const lerpSpeed = 0.025;
    
    // Calculate tornado position (circular orbit)
    const orbitAngle = (index / totalPlanets) * Math.PI * 2 + time * 0.2;
    const orbitRadius = 2.5 + (index % 3) * 0.8;
    const tornadoX = Math.cos(orbitAngle) * orbitRadius;
    const tornadoZ = Math.sin(orbitAngle) * orbitRadius;
    const tornadoY = Math.sin(orbitAngle * 1.5 + index) * 0.8;
    
    // Each planet has unique side position - use mobile position on small screens
    const sidePos = isMobile ? planet.mobileSidePos : planet.sidePos;
    
    // Calculate circular arc path for transition
    if (isHeroMode) {
      // All planets in tornado
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, tornadoX, lerpSpeed * 1.5);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, tornadoY, lerpSpeed * 1.5);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, tornadoZ, lerpSpeed * 1.5);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, planet.scale * mobileScale, lerpSpeed));
      transitionProgress.current = 0;
      
    } else if (isThisPlanetSelected) {
      // Move to side position with gentle floating motion
      transitionProgress.current = Math.min(transitionProgress.current + 0.015, 1);
      
      // Target position with gentle floating
      const targetX = sidePos.x + Math.sin(time * 0.4) * (isMobile ? 0.08 : 0.15);
      const targetY = sidePos.y + Math.cos(time * 0.3) * (isMobile ? 0.05 : 0.1);
      const targetZ = sidePos.z;
      
      // Smooth circular arc transition
      const arcLerp = lerpSpeed * (1 + transitionProgress.current);
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, arcLerp);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, arcLerp);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, arcLerp);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, 2.2 * mobileScale, lerpSpeed));
      
    } else {
      // Other planets - orbit behind/around camera view
      const hideAngle = orbitAngle + Math.PI; // Opposite side
      const hideRadius = 8 + index;
      const hideX = Math.cos(hideAngle) * hideRadius;
      const hideZ = Math.sin(hideAngle) * hideRadius - 5;
      const hideY = tornadoY * 0.5;
      
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, hideX, lerpSpeed * 0.8);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, hideY, lerpSpeed * 0.8);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, hideZ, lerpSpeed * 0.8);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, planet.scale * 0.3 * mobileScale, lerpSpeed));
      transitionProgress.current = 0;
    }
    
    // Planet self-rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += planet.type === 'star' ? 0.001 : 0.006;
      meshRef.current.rotation.x = 0.1; // Slight tilt
    }
  });
  
  return (
    <group ref={groupRef} scale={planet.scale}>
      <Sphere ref={meshRef} args={[1, 128, 128]}>
        <primitive object={planetMaterial} attach="material" />
      </Sphere>
    </group>
  );
}

// Space nebula effect
function SpaceNebula() {
  const nebulaRef = useRef();
  
  useFrame((state) => {
    if (nebulaRef.current) {
      nebulaRef.current.rotation.y = state.clock.elapsedTime * 0.005;
      nebulaRef.current.rotation.z = state.clock.elapsedTime * 0.002;
    }
  });

  return (
    <mesh ref={nebulaRef} scale={[30, 30, 30]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color="#1a0033"
        transparent
        opacity={0.1}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

function Scene3D({ currentSection }) {
  const groupRef = useRef();
  const isHeroMode = currentSection === 0;
  
  // Get current planet for lighting
  const currentPlanetIndex = Math.min(Math.max(currentSection - 1, 0), SOLAR_SYSTEM.length - 1);
  const currentPlanet = SOLAR_SYSTEM[currentPlanetIndex];
  
  // Camera animation - adjusts based on where planet will appear
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (isHeroMode) {
      // Hero: camera looks at the tornado of planets
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(time * 0.08) * 0.5, 0.02);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(time * 0.06) * 0.3, 0.02);
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 8, 0.02);
    } else {
      // Camera shifts opposite to where planet appears
      const selectedPlanet = SOLAR_SYSTEM[currentPlanetIndex];
      const camOffsetX = selectedPlanet?.sidePos.x > 0 ? -0.8 : 0.8;
      const camOffsetY = selectedPlanet?.sidePos.y > 0 ? -0.3 : 0.3;
      
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, camOffsetX, 0.02);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, camOffsetY, 0.02);
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 6, 0.02);
    }
    
    state.camera.rotation.z = Math.sin(time * 0.08) * 0.003;
  });

  return (
    <group ref={groupRef}>
      {/* Deep Space Background */}
      <SpaceNebula />
      
      {/* ============ ALL PLANETS - Smooth transitions ============ */}
      {SOLAR_SYSTEM.map((planet, index) => (
        <TransitioningPlanet
          key={planet.name}
          planet={planet}
          index={index}
          totalPlanets={SOLAR_SYSTEM.length}
          currentSection={currentSection}
        />
      ))}
      
      {/* ============ LIGHTING ============ */}
      <ambientLight intensity={0.4} color="#1a1a3a" />
      
      {/* Main sun light */}
      <directionalLight position={[15, 10, 10]} intensity={2.5} color="#FFD700" />
      
      {/* Rim light */}
      <directionalLight position={[-8, 5, -10]} intensity={1.0} color="#FFA500" />
      
      {/* Center light for tornado */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={isHeroMode ? 2 : 0.5} 
        color="#FFD700" 
        distance={12} 
      />
      
      {/* Planet glow light */}
      <pointLight 
        position={[5, 0, 2]} 
        intensity={isHeroMode ? 0.3 : 1.0} 
        color={currentPlanet.color} 
        distance={10} 
      />
      
      <hemisphereLight skyColor="#4A5568" groundColor="#1a1a2e" intensity={0.35} />
    </group>
  );
}

export default Scene3D;
