import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GroupProps } from '@react-three/fiber';

interface CloudsProps {
  count?: number;
  minHeight?: number;
  maxHeight?: number;
  size?: number;
  scale?: [number, number, number];
  spread?: number;
  opacity?: number;
  speed?: number;
  color?: string;
  lightColor?: string;
  lightIntensity?: number;
  dynamicLighting?: boolean;
  timeOfDay?: number; // 0 = midnight, 0.5 = noon, 1 = midnight (full cycle)
}

const Cloud = ({ 
  position, 
  scale, 
  rotation, 
  size,
  opacity, 
  speed,
  color,
  lightColor,
  lightIntensity,
  dynamicLighting
}: { 
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  size: number;
  opacity: number;
  speed: number;
  color: string;
  lightColor: string;
  lightIntensity: number;
  dynamicLighting: boolean;
}) => {
  const meshRef = useRef<any>(null);
  const initialPosition = useRef<[number, number, number]>(position);
  
  // Individual cloud drift motion
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Slow gentle drift based on time
    const time = state.clock.getElapsedTime();
    
    // Apply gentle bobbing motion
    meshRef.current.position.y = initialPosition.current[1] + Math.sin(time * 0.2) * 0.5;
    
    // Apply slow rotation
    meshRef.current.rotation.y += 0.0003 * speed;
    
    // Apply drift motion
    const xOffset = Math.sin(time * 0.1) * 0.2 * speed;
    const zOffset = Math.cos(time * 0.15) * 0.2 * speed;
    
    meshRef.current.position.x = initialPosition.current[0] + xOffset;
    meshRef.current.position.z = initialPosition.current[2] + zOffset;
  });
  
  // Create a pseudo-random cloud shape using multiple spheres
  const spheres = useMemo(() => {
    // Use a deterministic random based on position
    const pseudoRandom = (x: number) => {
      return ((Math.sin(x) * 10000) % 1 + 1) / 2;
    };
    
    // Get deterministic seed from position
    const seed = position[0] * 1000 + position[1] * 100 + position[2];
    
    // Create cluster of spheres to form a cloud
    const result = [];
    const cloudSize = size;
    const density = 6 + Math.floor(pseudoRandom(seed + 1) * 8); // 6-14 puffs per cloud
    
    for (let i = 0; i < density; i++) {
      const sphereSize = 0.5 + pseudoRandom(seed + i) * 1.5;
      
      // Position spheres to form a cloud-like shape
      const xOffset = (pseudoRandom(seed + i * 10) - 0.5) * cloudSize;
      const yOffset = (pseudoRandom(seed + i * 20) - 0.5) * (cloudSize * 0.3);
      const zOffset = (pseudoRandom(seed + i * 30) - 0.5) * cloudSize;
      
      result.push({
        position: [xOffset, yOffset, zOffset],
        size: sphereSize,
      });
    }
    
    return result;
  }, [position, size]);
  
  // Calculate ambient light influence based on time
  const light = dynamicLighting ? (
    <pointLight
      position={[0, 0, 0]}
      color={lightColor}
      intensity={lightIntensity}
      distance={size * 4} // Light range limited to area around cloud
      decay={2} // Physical light decay
    />
  ) : null;
  
  return (
    <group
      // @ts-ignore - the type is correct but TypeScript is having trouble with it
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {spheres.map((sphere, index) => (
        <mesh key={index} position={sphere.position as [number, number, number]}>
          <sphereGeometry args={[sphere.size, 8, 8]} />
          <meshStandardMaterial 
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}
      
      {/* Optional dynamic light source within cloud */}
      {light}
    </group>
  );
};

export const Clouds: React.FC<CloudsProps> = ({
  count = 20,
  minHeight = 50,
  maxHeight = 90,
  size = 6,
  scale = [1, 0.5, 1],
  spread = 150,
  opacity = 0.65,
  speed = 1,
  color = "#ffffff",
  lightColor = "#ffeecc",
  lightIntensity = 0.5,
  dynamicLighting = true,
  timeOfDay = 0.3,
}) => {
  // Memoize cloud generation to prevent regeneration on every render
  const clouds = useMemo(() => {
    const result = [];
    
    for (let i = 0; i < count; i++) {
      // Use a deterministic seeded random
      const seededRandom = (base: number) => {
        return ((Math.sin(base * 100 + i) * 10000) % 1 + 1) / 2;
      };
      
      // Create a semi-random position with good distribution
      const angle = (i / count) * Math.PI * 2; // Distribute around a circle
      const radius = 20 + seededRandom(angle) * spread; // Vary the radius
      
      const x = Math.sin(angle) * radius * seededRandom(i * 0.1);
      const z = Math.cos(angle) * radius * seededRandom(i * 0.2);
      const y = minHeight + seededRandom(i * 0.3) * (maxHeight - minHeight);
      
      // Random rotation
      const rotX = 0;
      const rotY = seededRandom(i * 0.4) * Math.PI * 2;
      const rotZ = 0;
      
      // Random scale variation
      const scaleVar = 0.7 + seededRandom(i * 0.5) * 0.6;
      const cloudScale: [number, number, number] = [
        scale[0] * scaleVar,
        scale[1] * scaleVar,
        scale[2] * scaleVar
      ];
      
      // Random size variation
      const sizeVar = 0.8 + seededRandom(i * 0.6) * 0.4;
      const cloudSize = size * sizeVar;
      
      // Random speed variation
      const speedVar = 0.8 + seededRandom(i * 0.7) * 0.4;
      const cloudSpeed = speed * speedVar;
      
      // Vary opacity slightly
      const cloudOpacity = opacity * (0.9 + seededRandom(i * 0.8) * 0.2);
      
      // Push cloud data
      result.push({
        position: [x, y, z] as [number, number, number],
        rotation: [rotX, rotY, rotZ] as [number, number, number],
        scale: cloudScale,
        size: cloudSize,
        opacity: cloudOpacity,
        speed: cloudSpeed
      });
    }
    
    return result;
  }, [count, minHeight, maxHeight, size, scale, spread, opacity, speed]);
  
  // Time-based lighting calculations
  const lightProps = useMemo(() => {
    // Calculate time-of-day based lighting
    // Simulates sunrise and sunset colors
    let calculatedColor = lightColor;
    let calculatedIntensity = lightIntensity;
    
    if (dynamicLighting) {
      // Dawn/dusk conditions
      if (timeOfDay < 0.25 || timeOfDay > 0.75) {
        // Early morning or late evening
        calculatedColor = "#ff9955"; // Orange-gold
        calculatedIntensity = lightIntensity * 0.8;
      } else if (timeOfDay < 0.3 || timeOfDay > 0.7) {
        // Morning/evening
        calculatedColor = "#ffdd99"; // Warm gold
        calculatedIntensity = lightIntensity * 0.9;
      } else {
        // Mid-day
        calculatedColor = "#ffffff"; // Bright white
        calculatedIntensity = lightIntensity;
      }
      
      // Night time
      if (timeOfDay > 0.9 || timeOfDay < 0.1) {
        calculatedColor = "#335577"; // Blue-ish moonlight
        calculatedIntensity = lightIntensity * 0.4;
      }
    }
    
    return {
      calculatedColor,
      calculatedIntensity
    };
  }, [dynamicLighting, lightColor, lightIntensity, timeOfDay]);
  
  return (
    <group>
      {clouds.map((cloud, index) => (
        <Cloud
          key={index}
          position={cloud.position}
          rotation={cloud.rotation}
          scale={cloud.scale}
          size={cloud.size}
          opacity={cloud.opacity}
          speed={cloud.speed}
          color={color}
          lightColor={lightProps.calculatedColor}
          lightIntensity={lightProps.calculatedIntensity}
          dynamicLighting={dynamicLighting}
        />
      ))}
    </group>
  );
};

export default Clouds;