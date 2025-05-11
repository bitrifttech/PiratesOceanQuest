import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import * as THREE from "three";
import { useGameState } from "../lib/stores/useGameState";
import { STATIC } from "../lib/constants";

interface OceanProps {
  // The Ocean component doesn't need props currently, 
  // but having the interface makes it future-proof
}

const Ocean: React.FC<OceanProps> = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate the size to cover a large area
  const oceanSize = 1000;
  
  // Caustic effect - light patterns that show below water
  const causticRef = useRef<THREE.Mesh>(null);
  const segmentCount = 128;
  
  // Create caustic material
  const causticMaterial = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: "#6FC0FF", // Light blue for caustics
      transparent: true,
      opacity: 0.3,
      emissive: "#2E93FF",
      emissiveIntensity: 0.3,
      roughness: 0.1,
    });
    return mat;
  }, []);
  
  // Time uniform for wave animation
  const materialRef = useRef<MeshStandardMaterial>();
  const timeRef = useRef(0);
  
  // Create the ocean material with enhanced water properties
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: "#1E65AA", // Deeper blue color for water
      metalness: 0.6,   // More reflective
      roughness: 0.2,   // Smoother surface
      transparent: true,
      opacity: 0.9,     // Slight transparency
    });
    
    // Store ref for animation updates
    materialRef.current = mat;
    return mat;
  }, []);
  
  // Create a displacement map for waves
  const waveGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      oceanSize,
      oceanSize,
      segmentCount,
      segmentCount
    );
    
    // Rotate to be horizontal
    geo.rotateX(-Math.PI / 2);
    
    // Create initial wave pattern
    const positionAttr = geo.attributes.position;
    const vertices = positionAttr.array;
    
    // Base the wave height on position to create various wave patterns
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Initial wave pattern with multiple frequencies for more natural look
      vertices[i + 1] = 
        Math.sin(x / 20) * Math.cos(z / 20) * 1.0 +  // Primary waves
        Math.sin(x / 8 + z / 10) * 0.3 +            // Secondary pattern
        Math.cos(x / 30 - z / 25) * 0.8;            // Tertiary longer waves
    }
    
    // Update vertices
    positionAttr.needsUpdate = true;
    geo.computeVertexNormals();
    
    return geo;
  }, [oceanSize, segmentCount]);
  
  // Create the caustic effect geometry (light patterns through water)
  const causticGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      oceanSize * 0.8, // Slightly smaller than ocean
      oceanSize * 0.8,
      segmentCount / 2, // Lower resolution is fine for caustics
      segmentCount / 2
    );
    
    // Rotate to be horizontal
    geo.rotateX(-Math.PI / 2);
    
    // Create initial caustic pattern
    const positionAttr = geo.attributes.position;
    const vertices = positionAttr.array;
    
    // Base the caustic pattern on different frequencies
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Create subtle bumps for the caustic effect
      vertices[i + 1] = 
        Math.sin(x / 5) * Math.cos(z / 5) * 0.2 +
        Math.sin(x / 12 - z / 10) * 0.15;
    }
    
    // Update vertices
    positionAttr.needsUpdate = true;
    geo.computeVertexNormals();
    
    return geo;
  }, [oceanSize, segmentCount]);
  
  // Create the ocean floor with undulating terrain
  const oceanFloorGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      oceanSize,
      oceanSize,
      64,
      64
    );
    
    // Rotate to be horizontal
    geo.rotateX(-Math.PI / 2);
    
    // Create random height variations for the ocean floor
    const positionAttr = geo.attributes.position;
    const vertices = positionAttr.array;
    
    // Seed random heights for terrain
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Distance from center
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      
      // Create gentle rolling hills and valleys with some randomization
      // More pronounced variations further from center
      const distanceFactor = Math.min(1.0, distanceFromCenter / 200);
      
      vertices[i + 1] = 
        Math.sin(x / 80) * Math.cos(z / 80) * 2.0 * distanceFactor + // Large rolling hills
        Math.sin(x / 30 + z / 20) * 1.0 * distanceFactor +          // Medium variations
        Math.cos(x / 10 - z / 15) * 0.5 * distanceFactor;           // Small details
    }
    
    // Update vertices
    positionAttr.needsUpdate = true;
    geo.computeVertexNormals();
    
    return geo;
  }, [oceanSize]);
  
  // Animate the waves and caustics
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    // Get wave parameters from game state
    const { waveHeight, waveSpeed } = useGameState.getState();
    
    timeRef.current += delta * 0.5;
    
    // Animate the wave displacement with complex wave patterns
    const positionAttr = meshRef.current.geometry.attributes.position;
    const vertices = positionAttr.array;
    
    // Different time frequencies for more natural motion
    const time1 = timeRef.current * (waveSpeed * 0.8);
    const time2 = timeRef.current * (waveSpeed * 1.2);
    const time3 = timeRef.current * (waveSpeed * 0.5);
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Create complex wave effect with configurable height and multiple wave patterns
      vertices[i + 1] = (
        // Primary wave pattern
        Math.sin(x / 20 + time1) * Math.cos(z / 20 + time1) * (waveHeight * 3) +
        // Secondary faster waves
        Math.sin(x / 10 + z / 15 + time2) * (waveHeight * 1.5) +
        // Long period slow waves
        Math.cos(x / 40 - z / 30 + time3) * (waveHeight * 2.5)
      );
      
      // Apply distance-based amplitude damping for calmer water in center
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      const distanceFactor = Math.min(1.0, distanceFromCenter / 100); 
      vertices[i + 1] *= distanceFactor;
    }
    
    positionAttr.needsUpdate = true;
    
    // Animate caustic effect if it exists
    if (causticRef.current) {
      const causticPosAttr = causticRef.current.geometry.attributes.position;
      const causticVertices = causticPosAttr.array;
      
      // Faster time frequencies for caustics
      const causticTime1 = timeRef.current * (waveSpeed * 1.5);
      const causticTime2 = timeRef.current * (waveSpeed * 2.0);
      
      for (let i = 0; i < causticVertices.length; i += 3) {
        const x = causticVertices[i];
        const z = causticVertices[i + 2];
        
        // Create animated caustic pattern
        causticVertices[i + 1] = 
          Math.sin(x / 4 + causticTime1) * Math.cos(z / 4 + causticTime1) * 0.2 +
          Math.sin(x / 8 - z / 6 + causticTime2) * 0.15;
      }
      
      causticPosAttr.needsUpdate = true;
      
      // Update caustic material for pulsing effect
      if (causticMaterial) {
        causticMaterial.emissiveIntensity = 0.3 + Math.sin(timeRef.current * 2) * 0.15;
        causticMaterial.opacity = 0.3 + Math.sin(timeRef.current * 1.5) * 0.1;
      }
    }
    
    // Apply a subtle color shift based on time for a water shimmering effect
    if (materialRef.current) {
      const baseColor = new THREE.Color("#1E65AA"); // Use the updated color
      const shimmerAmount = (Math.sin(timeRef.current * 0.2) * 0.1) + 0.95;
      materialRef.current.color.copy(baseColor).multiplyScalar(shimmerAmount);
    }
  });
  
  return (
    <>
      {/* Main water surface */}
      <mesh
        ref={meshRef}
        geometry={waveGeometry}
        material={material}
        receiveShadow
        position={[0, STATIC.WATER_LEVEL, 0]} // Always use the static water level
      />
      
      {/* Add a secondary flat plane slightly below for depth effect */}
      <mesh 
        position={[0, STATIC.WATER_LEVEL - 1, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[oceanSize, oceanSize]} />
        <meshStandardMaterial 
          color="#0A4F8C"  // Darker blue for depth
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      
      {/* Caustic light effect - light patterns under water */}
      <mesh
        ref={causticRef}
        geometry={causticGeometry}
        material={causticMaterial}
        position={[0, STATIC.WATER_LEVEL - 2, 0]} // Just above the seabed
      />
      
      {/* Ocean floor with undulating terrain */}
      <mesh
        position={[0, STATIC.WATER_LEVEL - 3, 0]}
        geometry={oceanFloorGeometry}
        receiveShadow
      >
        <meshStandardMaterial 
          color="#0A3B5C"  // Dark blue for ocean floor
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
    </>
  );
};

export default Ocean;
