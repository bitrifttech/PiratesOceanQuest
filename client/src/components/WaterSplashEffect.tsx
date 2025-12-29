import React, { useRef, useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface WaterSplashEffectProps {
  position: THREE.Vector3;
  size?: number;
  duration?: number;
  onComplete?: () => void;
}

// Physics-based water droplet
interface Droplet {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  type: 'column' | 'droplet' | 'spray' | 'mist';
}

// Ripple ring data
interface Ripple {
  radius: number;
  maxRadius: number;
  opacity: number;
  speed: number;
  delay: number;
}

/**
 * Realistic physics-based water splash effect
 * Features: water column, ballistic droplets, spray mist, expanding ripples
 */
const WaterSplashEffect: React.FC<WaterSplashEffectProps> = ({
  position,
  size = 1,
  duration = 2.0,
  onComplete
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const done = useRef(false);
  const init = useRef(false);
  const [frame, setFrame] = useState(0);
  
  // Particle data stored in refs for performance
  const droplets = useRef<Droplet[]>([]);
  const ripples = useRef<Ripple[]>([]);
  const columnHeight = useRef(0);
  const columnOpacity = useRef(1);
  
  // Water colors
  const waterColor = useMemo(() => new THREE.Color(0x4A9FD8), []); // Caribbean blue
  const foamColor = useMemo(() => new THREE.Color(0xFFFFFF), []); // White foam
  const mistColor = useMemo(() => new THREE.Color(0xCCEEFF), []); // Light blue mist
  
  // Gravity constant
  const GRAVITY = 15;
  
  // Initialize particles on mount
  useEffect(() => {
    const d: Droplet[] = [];
    
    // Main water column particles (shoot straight up)
    for (let i = 0; i < 6; i++) {
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * 0.1 * size;
      d.push({
        pos: new THREE.Vector3(
          Math.cos(offsetAngle) * offsetDist,
          0.15, // Start above water
          Math.sin(offsetAngle) * offsetDist
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          6 + Math.random() * 3, // Moderate upward velocity
          (Math.random() - 0.5) * 0.4
        ).multiplyScalar(size),
        size: (0.08 + Math.random() * 0.06) * size,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.2,
        type: 'column'
      });
    }
    
    // Primary droplets - ballistic trajectories
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const upAngle = 0.3 + Math.random() * 0.5; // 30-80 degrees up
      const speed = 3 + Math.random() * 5;
      d.push({
        pos: new THREE.Vector3(0, 0.2, 0), // Start above water
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(upAngle) * speed,
          Math.sin(upAngle) * speed,
          Math.sin(angle) * Math.cos(upAngle) * speed
        ).multiplyScalar(size),
        size: (0.04 + Math.random() * 0.05) * size,
        life: 1,
        maxLife: 0.4 + Math.random() * 0.3,
        type: 'droplet'
      });
    }
    
    // Secondary spray - smaller, wider spread
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const upAngle = 0.1 + Math.random() * 0.4;
      const speed = 2 + Math.random() * 3;
      d.push({
        pos: new THREE.Vector3(0, 0.15, 0), // Start above water
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(upAngle) * speed,
          Math.sin(upAngle) * speed,
          Math.sin(angle) * Math.cos(upAngle) * speed
        ).multiplyScalar(size),
        size: (0.02 + Math.random() * 0.03) * size,
        life: 1,
        maxLife: 0.3 + Math.random() * 0.3,
        type: 'spray'
      });
    }
    
    // Fine mist - floats and drifts
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.2 * size;
      d.push({
        pos: new THREE.Vector3(
          Math.cos(angle) * dist,
          0.2 + Math.random() * 0.3, // Start above water
          Math.sin(angle) * dist
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          0.3 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.4
        ).multiplyScalar(size),
        size: (0.06 + Math.random() * 0.08) * size,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        type: 'mist'
      });
    }
    
    droplets.current = d;
    
    // Initialize ripples with staggered delays
    const r: Ripple[] = [];
    for (let i = 0; i < 3; i++) {
      r.push({
        radius: 0.05 * size,
        maxRadius: (1.2 + i * 0.6) * size,
        opacity: 0,
        speed: (2.0 - i * 0.2) * size,
        delay: i * 0.08
      });
    }
    ripples.current = r;
    
    // Reset column
    columnHeight.current = 0;
    columnOpacity.current = 1;
    
    // Mark as initialized
    init.current = true;
  }, [size, position]);
  
  // Animation loop
  useFrame((_, delta) => {
    if (!init.current || done.current) return;
    
    elapsed.current += delta;
    const t = elapsed.current;
    
    if (t >= duration) {
      done.current = true;
      onComplete?.();
      return;
    }
    
    // Update water column (quick rise, slow fall)
    const columnRiseTime = 0.1;
    const columnPeakHeight = 1.8 * size;
    
    if (t < columnRiseTime) {
      // Rising phase - quick
      const riseProgress = t / columnRiseTime;
      columnHeight.current = columnPeakHeight * Math.pow(riseProgress, 0.5);
      columnOpacity.current = 0.8;
    } else {
      // Falling phase - slower with gravity
      const fallTime = t - columnRiseTime;
      const fallProgress = Math.min(fallTime / 0.5, 1);
      columnHeight.current = columnPeakHeight * (1 - fallProgress * fallProgress);
      columnOpacity.current = 0.8 * (1 - fallProgress);
    }
    
    // Update droplets with physics
    droplets.current.forEach(drop => {
      if (drop.life <= 0) return;
      
      const dt = delta / drop.maxLife;
      drop.life -= dt;
      
      // Apply gravity (less for mist)
      const gravityScale = drop.type === 'mist' ? 0.1 : 1;
      drop.vel.y -= GRAVITY * gravityScale * delta;
      
      // Apply drag (more for mist)
      const drag = drop.type === 'mist' ? 0.98 : 0.995;
      drop.vel.multiplyScalar(drag);
      
      // Update position
      drop.pos.add(drop.vel.clone().multiplyScalar(delta));
      
      // Kill droplets that hit water surface
      if (drop.pos.y < 0 && drop.type !== 'mist') {
        drop.life = 0;
      }
    });
    
    // Update ripples
    ripples.current.forEach(ripple => {
      if (t < ripple.delay) return;
      
      const rippleTime = t - ripple.delay;
      const rippleProgress = rippleTime * ripple.speed / ripple.maxRadius;
      
      if (rippleProgress < 1) {
        ripple.radius = ripple.maxRadius * rippleProgress;
        // Fade out as it expands
        ripple.opacity = 0.6 * (1 - rippleProgress) * (1 - rippleProgress);
          } else {
        ripple.opacity = 0;
      }
    });
    
    // Force React to re-render
    setFrame(f => f + 1);
  });
  
  // Calculate droplet stretch based on velocity (realistic water droplet deformation)
  const getDropletScale = (drop: Droplet): [number, number, number] => {
    if (drop.type === 'mist') {
      // Mist just fades/grows
      const scale = drop.size * (1 + (1 - drop.life) * 2);
      return [scale, scale, scale];
    }
    
    const speed = drop.vel.length();
    const stretch = Math.min(speed / 8, 2); // Max 2x stretch
    const baseScale = drop.size * Math.max(drop.life, 0.1);
    
    // Stretch along velocity direction
    return [
      baseScale * (1 / (1 + stretch * 0.3)),
      baseScale * (1 + stretch * 0.5),
      baseScale * (1 / (1 + stretch * 0.3))
    ];
  };
  
  // Get droplet opacity
  const getDropletOpacity = (drop: Droplet): number => {
    if (drop.type === 'mist') {
      return drop.life * 0.4;
    }
    if (drop.type === 'spray') {
      return drop.life * 0.7;
    }
    return Math.min(drop.life * 0.9, 0.9);
  };
  
  return (
    <group ref={groupRef} position={position.toArray()}>
      {/* Central water column */}
      {columnHeight.current > 0.05 && (
        <mesh position={[0, columnHeight.current / 2 + 0.15, 0]}>
          <cylinderGeometry args={[
            0.08 * size, // top radius (narrower)
            0.18 * size, // bottom radius (wider)
            columnHeight.current,
            8
          ]} />
          <meshBasicMaterial
            color={waterColor}
            transparent
            opacity={columnOpacity.current}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Water droplets */}
      {droplets.current.filter(d => d.life > 0 && d.type !== 'mist').map((drop, i) => {
        const scale = getDropletScale(drop);
        const opacity = getDropletOpacity(drop);
        return (
          <mesh
            key={`drop-${i}`}
            position={[drop.pos.x, drop.pos.y, drop.pos.z]}
            scale={scale}
          >
            <sphereGeometry args={[1, 6, 4]} />
            <meshBasicMaterial
              color={drop.type === 'column' ? foamColor : waterColor}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Fine mist particles */}
      {droplets.current.filter(d => d.life > 0 && d.type === 'mist').map((drop, i) => {
        const scale = getDropletScale(drop);
        return (
          <mesh
            key={`mist-${i}`}
            position={[drop.pos.x, drop.pos.y, drop.pos.z]}
            scale={scale}
          >
            <sphereGeometry args={[1, 4, 3]} />
            <meshBasicMaterial
              color={mistColor}
              transparent
              opacity={drop.life * 0.35}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Ripple rings on water surface */}
      {ripples.current.filter(r => r.opacity > 0.01).map((ripple, i) => (
        <mesh
          key={`ripple-${i}`}
          position={[0, 0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[
            ripple.radius * 0.85, // inner radius
            ripple.radius,        // outer radius
            32
          ]} />
          <meshBasicMaterial
            color={foamColor}
            transparent
            opacity={ripple.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      
      {/* Central foam splash at base */}
      {elapsed.current < 0.3 && (
        <mesh
          position={[0, 0.12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[
            0.25 * size * (1 + elapsed.current * 2.5),
            0.25 * size * (1 + elapsed.current * 2.5),
            1
          ]}
        >
          <circleGeometry args={[1, 12]} />
          <meshBasicMaterial
            color={foamColor}
            transparent
            opacity={0.5 * (1 - elapsed.current / 0.3)}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

export default WaterSplashEffect;
