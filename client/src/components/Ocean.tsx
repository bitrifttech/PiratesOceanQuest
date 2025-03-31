import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, Vector3 } from "three";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const Ocean = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const waterTexture = useTexture("/textures/water.jpg", (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
  });
  
  // Calculate the size to cover a large area
  const oceanSize = 1000;
  const segmentCount = 128;
  
  // Time uniform for wave animation
  const materialRef = useRef<MeshStandardMaterial>();
  const timeRef = useRef(0);
  
  // Create the ocean material
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: "#0077BE",
      metalness: 0.1,
      roughness: 0.3,
      map: waterTexture || undefined,
    });
    
    // Store ref for animation updates
    materialRef.current = mat;
    return mat;
  }, [waterTexture]);
  
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
    
    timeRef.current += delta * 0.5;
    
    // Animate the wave displacement
    const positionAttr = meshRef.current.geometry.attributes.position;
    const vertices = positionAttr.array;
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Create wave effect
      vertices[i + 1] = 
        Math.sin(x / 20 + timeRef.current) * 
        Math.cos(z / 20 + timeRef.current) * 1.5;
    }
    
    positionAttr.needsUpdate = true;
    
    // Update texture offset for flowing effect
    if (waterTexture) {
      waterTexture.offset.x = timeRef.current * 0.05;
      waterTexture.offset.y = timeRef.current * 0.05;
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
