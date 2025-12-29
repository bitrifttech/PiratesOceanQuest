import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GemProps {
  position?: [number, number, number];
  color: string;
  size?: number;
  cutType?: 'brilliant' | 'emerald' | 'oval' | 'pear';
}

/**
 * Creates a Zelda-style rupee geometry
 * Tall hexagonal gem with pointed top and bottom
 */
function createRupeeGeometry(size: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  
  // Rupee proportions - tall and narrow like Zelda rupees
  const height = size * 2.5; // Total height
  const width = size * 0.6;  // Width at widest point
  const depth = size * 0.35; // Depth (front to back)
  
  // Vertical positions (from bottom to top)
  const bottomTip = -height / 2;
  const lowerMid = -height / 4;
  const center = 0;
  const upperMid = height / 4;
  const topTip = height / 2;
  
  // Vertices - hexagonal cross-section that tapers to points
  // Bottom tip
  vertices.push(0, bottomTip, 0); // 0
  
  // Lower hexagon (smaller)
  const lowerScale = 0.7;
  vertices.push(-width * lowerScale, lowerMid, 0);           // 1 left
  vertices.push(-width * 0.5 * lowerScale, lowerMid, depth * lowerScale);  // 2 front-left
  vertices.push(width * 0.5 * lowerScale, lowerMid, depth * lowerScale);   // 3 front-right
  vertices.push(width * lowerScale, lowerMid, 0);            // 4 right
  vertices.push(width * 0.5 * lowerScale, lowerMid, -depth * lowerScale);  // 5 back-right
  vertices.push(-width * 0.5 * lowerScale, lowerMid, -depth * lowerScale); // 6 back-left
  
  // Center hexagon (widest)
  vertices.push(-width, center, 0);           // 7 left
  vertices.push(-width * 0.5, center, depth); // 8 front-left
  vertices.push(width * 0.5, center, depth);  // 9 front-right
  vertices.push(width, center, 0);            // 10 right
  vertices.push(width * 0.5, center, -depth); // 11 back-right
  vertices.push(-width * 0.5, center, -depth);// 12 back-left
  
  // Upper hexagon (smaller)
  const upperScale = 0.7;
  vertices.push(-width * upperScale, upperMid, 0);           // 13 left
  vertices.push(-width * 0.5 * upperScale, upperMid, depth * upperScale);  // 14 front-left
  vertices.push(width * 0.5 * upperScale, upperMid, depth * upperScale);   // 15 front-right
  vertices.push(width * upperScale, upperMid, 0);            // 16 right
  vertices.push(width * 0.5 * upperScale, upperMid, -depth * upperScale);  // 17 back-right
  vertices.push(-width * 0.5 * upperScale, upperMid, -depth * upperScale); // 18 back-left
  
  // Top tip
  vertices.push(0, topTip, 0); // 19
  
  // Faces - bottom pyramid (tip to lower hex)
  indices.push(0, 2, 1);
  indices.push(0, 3, 2);
  indices.push(0, 4, 3);
  indices.push(0, 5, 4);
  indices.push(0, 6, 5);
  indices.push(0, 1, 6);
  
  // Lower to center band
  for (let i = 0; i < 6; i++) {
    const l1 = i + 1;
    const l2 = (i % 6) + 1 + 1;
    if (l2 > 6) { } // wrap handled by modulo
    const next = ((i + 1) % 6) + 1;
    const c1 = i + 7;
    const c2 = ((i + 1) % 6) + 7;
    
    indices.push(l1, c1, next);
    indices.push(next, c1, c2);
  }
  
  // Center to upper band
  for (let i = 0; i < 6; i++) {
    const c1 = i + 7;
    const c2 = ((i + 1) % 6) + 7;
    const u1 = i + 13;
    const u2 = ((i + 1) % 6) + 13;
    
    indices.push(c1, u1, c2);
    indices.push(c2, u1, u2);
  }
  
  // Top pyramid (upper hex to tip)
  indices.push(13, 14, 19);
  indices.push(14, 15, 19);
  indices.push(15, 16, 19);
  indices.push(16, 17, 19);
  indices.push(17, 18, 19);
  indices.push(18, 13, 19);
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * Creates a tall octagonal gem geometry (alternative rupee style)
 * Similar to rupee but with 8 sides instead of 6
 */
function createOctagonalGemGeometry(size: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  
  // Tall proportions like rupee
  const height = size * 2.5;
  const radius = size * 0.5;
  const segments = 8;
  
  // Vertical positions
  const bottomTip = -height / 2;
  const lowerMid = -height / 4;
  const center = 0;
  const upperMid = height / 4;
  const topTip = height / 2;
  
  // Bottom tip
  vertices.push(0, bottomTip, 0); // 0
  
  // Lower octagon
  const lowerScale = 0.6;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push(
      Math.cos(angle) * radius * lowerScale,
      lowerMid,
      Math.sin(angle) * radius * lowerScale
    );
  }
  // indices 1-8
  
  // Center octagon (widest)
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push(
      Math.cos(angle) * radius,
      center,
      Math.sin(angle) * radius
    );
  }
  // indices 9-16
  
  // Upper octagon
  const upperScale = 0.6;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push(
      Math.cos(angle) * radius * upperScale,
      upperMid,
      Math.sin(angle) * radius * upperScale
    );
  }
  // indices 17-24
  
  // Top tip
  vertices.push(0, topTip, 0); // 25
  
  // Bottom pyramid
  for (let i = 0; i < segments; i++) {
    const next = ((i + 1) % segments) + 1;
    indices.push(0, i + 1, next);
  }
  
  // Lower to center band
  for (let i = 0; i < segments; i++) {
    const l1 = i + 1;
    const l2 = ((i + 1) % segments) + 1;
    const c1 = i + 9;
    const c2 = ((i + 1) % segments) + 9;
    
    indices.push(l1, c1, l2);
    indices.push(l2, c1, c2);
  }
  
  // Center to upper band
  for (let i = 0; i < segments; i++) {
    const c1 = i + 9;
    const c2 = ((i + 1) % segments) + 9;
    const u1 = i + 17;
    const u2 = ((i + 1) % segments) + 17;
    
    indices.push(c1, u1, c2);
    indices.push(c2, u1, u2);
  }
  
  // Top pyramid
  for (let i = 0; i < segments; i++) {
    const next = ((i + 1) % segments) + 17;
    indices.push(i + 17, 25, next);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * Sparkle particle interface
 */
interface Sparkle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  intensity: number;
}

/**
 * Realistic gem component with cut facets, refraction, and sparkle effects
 */
const Gem: React.FC<GemProps> = ({
  position = [0, 0, 0],
  color,
  size = 1,
  cutType = 'brilliant'
}) => {
  const gemRef = useRef<THREE.Mesh>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const frameCount = useRef(0);
  
  // Create gem geometry based on cut type
  const geometry = useMemo(() => {
    switch (cutType) {
      case 'emerald':
        return createOctagonalGemGeometry(size);
      case 'brilliant':
      default:
        return createRupeeGeometry(size);
    }
  }, [size, cutType]);
  
  // Parse color for sparkle effects
  const baseColor = useMemo(() => new THREE.Color(color), [color]);
  const sparkleColor = useMemo(() => {
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    return new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 0.5, 0.3), 0.95);
  }, [baseColor]);
  
  // Initialize sparkles - spread along the tall gem shape
  useMemo(() => {
    sparklesRef.current = [];
    const gemHeight = size * 2.5; // Match rupee height
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = size * (0.2 + Math.random() * 0.4); // Narrower to match gem width
      const heightPos = (Math.random() - 0.5) * gemHeight * 0.8; // Spread along height
      sparklesRef.current.push({
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          heightPos,
          Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.015,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.015
        ),
        life: Math.random(),
        maxLife: 0.5 + Math.random() * 1.5,
        size: 0.03 + Math.random() * 0.05,
        intensity: 0.6 + Math.random() * 0.4
      });
    }
  }, [size]);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!gemRef.current) return;
    
    frameCount.current++;
    
    // Slow rotation
    gemRef.current.rotation.y += delta * 0.5;
    
    const gemHeight = size * 2.5; // Match rupee height
    
    // Update sparkles
    sparklesRef.current.forEach(sparkle => {
      sparkle.life -= delta / sparkle.maxLife;
      
      if (sparkle.life <= 0) {
        // Reset sparkle - spread along tall gem shape
        const angle = Math.random() * Math.PI * 2;
        const radius = size * (0.2 + Math.random() * 0.4);
        const heightPos = (Math.random() - 0.5) * gemHeight * 0.8;
        sparkle.position.set(
          Math.cos(angle) * radius,
          heightPos,
          Math.sin(angle) * radius
        );
        sparkle.life = 1;
        sparkle.maxLife = 0.5 + Math.random() * 1.5;
        sparkle.intensity = 0.6 + Math.random() * 0.4;
      } else {
        // Move sparkle
        sparkle.position.add(sparkle.velocity.clone().multiplyScalar(delta * 60));
      }
    });
  });
  
  return (
    <group position={position}>
      {/* Main gem with physical material for refraction */}
      <mesh ref={gemRef} geometry={geometry} castShadow>
        <meshPhysicalMaterial
          color={color}
          metalness={0.0}
          roughness={0.0}
          transmission={0.95}
          thickness={size * 0.8}
          ior={2.4} // Diamond-like refraction
          reflectivity={1}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={2}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Inner glow core - stretched to match tall gem */}
      <mesh scale={[0.3, 0.8, 0.3]}>
        <sphereGeometry args={[size * 0.5, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Sparkle particles */}
      {sparklesRef.current.map((sparkle, i) => {
        const opacity = Math.sin(sparkle.life * Math.PI) * sparkle.intensity;
        if (opacity <= 0.05) return null;
        
        return (
          <mesh
            key={i}
            position={sparkle.position.toArray()}
            scale={sparkle.size * (0.5 + sparkle.life * 0.5)}
          >
            <sphereGeometry args={[1, 4, 4]} />
            <meshBasicMaterial
              color={sparkleColor}
              transparent
              opacity={opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Facet highlight flashes - simulates light catching facets on tall gem */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (Date.now() * 0.001 + i * Math.PI / 3) % (Math.PI * 2);
        const flash = Math.max(0, Math.sin(angle * 3) - 0.7) * 3;
        if (flash <= 0) return null;
        
        const gemHeight = size * 2.5;
        const heightOffset = (i / 5 - 0.5) * gemHeight * 0.7; // Spread flashes along height
        
        return (
          <mesh
            key={`flash-${i}`}
            position={[
              Math.cos(angle) * size * 0.4,
              heightOffset,
              Math.sin(angle) * size * 0.4
            ]}
            scale={0.1 * size * flash}
          >
            <sphereGeometry args={[1, 4, 4]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={flash * 0.9}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Point light for ambient glow */}
      <pointLight
        color={color}
        intensity={0.5}
        distance={size * 4}
      />
    </group>
  );
};

export default Gem;
