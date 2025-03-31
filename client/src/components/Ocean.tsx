import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import * as THREE from "three";
import { useGameState } from "../lib/stores/useGameState";

const Ocean = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate the size to cover a large area
  const oceanSize = 1000;
  const segmentCount = 128;
  
  // Time uniform for wave animation
  const materialRef = useRef<MeshStandardMaterial>();
  const timeRef = useRef(0);
  
  // Create the ocean material without texture
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: "#0077BE",
      metalness: 0.1,
      roughness: 0.3,
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
      
      // Small initial displacement
      vertices[i + 1] = Math.sin(x / 20) * Math.cos(z / 20) * 1.5;
    }
    
    // Update vertices
    positionAttr.needsUpdate = true;
    geo.computeVertexNormals();
    
    return geo;
  }, [oceanSize, segmentCount]);
  
  // Animate the waves
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    // Get wave parameters from game state
    const { waveHeight, waveSpeed } = useGameState.getState();
    
    timeRef.current += delta * 0.5;
    
    // Animate the wave displacement
    const positionAttr = meshRef.current.geometry.attributes.position;
    const vertices = positionAttr.array;
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Create wave effect with configurable height and speed
      vertices[i + 1] = 
        Math.sin(x / 20 + timeRef.current * (waveSpeed * 1000)) * 
        Math.cos(z / 20 + timeRef.current * (waveSpeed * 1000)) * (waveHeight * 5);
    }
    
    positionAttr.needsUpdate = true;
    
    // Apply a subtle color shift based on time for a water shimmering effect
    if (materialRef.current) {
      const baseColor = new THREE.Color("#0077BE");
      const shimmerAmount = (Math.sin(timeRef.current * 0.1) * 0.05) + 0.95;
      materialRef.current.color.copy(baseColor).multiplyScalar(shimmerAmount);
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      geometry={waveGeometry}
      material={material}
      receiveShadow
    />
  );
};

export default Ocean;
