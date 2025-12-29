import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ExplosionEffectProps {
  position: THREE.Vector3;
  size?: number;
  duration?: number;
  onComplete?: () => void;
}

// Realistic explosion particle
interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  type: 'fire' | 'smoke' | 'ember';
  rotSpeed: number;
}

/**
 * Realistic explosion effect - fiery burst with rising smoke
 */
const ExplosionEffect: React.FC<ExplosionEffectProps> = ({
  position,
  size = 1,
  duration = 1.5,
  onComplete
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const elapsed = useRef(0);
  const done = useRef(false);
  const [frame, setFrame] = useState(0);
  const init = useRef(false);
  
  // Particle refs
  const particles = useRef<Particle[]>([]);
  
  // Create shared geometries and materials
  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  
  // Initialize particles
  useEffect(() => {
    const p: Particle[] = [];
    
    // Fire core particles - bright, fast expanding
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const upAngle = Math.random() * 0.8;
      p.push({
        pos: new THREE.Vector3(0, 0, 0),
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(upAngle) * (2 + Math.random()),
          Math.sin(upAngle) * (1.5 + Math.random() * 2),
          Math.sin(angle) * Math.cos(upAngle) * (2 + Math.random())
        ),
        life: 1,
        maxLife: 0.3 + Math.random() * 0.2,
        size: (0.15 + Math.random() * 0.1) * size,
        type: 'fire',
        rotSpeed: 0
      });
    }
    
    // Smoke particles - dark, slow rising
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 0.3;
      p.push({
        pos: new THREE.Vector3(
          Math.cos(angle) * spread * size,
          Math.random() * 0.2 * size,
          Math.sin(angle) * spread * size
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          0.8 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.3
        ),
        life: 1,
        maxLife: 0.8 + Math.random() * 0.7,
        size: (0.1 + Math.random() * 0.15) * size,
        type: 'smoke',
        rotSpeed: (Math.random() - 0.5) * 2
      });
    }
    
    // Ember particles - tiny bright specs
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const upAngle = Math.random() * Math.PI * 0.4;
      const speed = 3 + Math.random() * 4;
      p.push({
        pos: new THREE.Vector3(0, 0, 0),
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(upAngle) * speed,
          Math.sin(upAngle) * speed + 1,
          Math.sin(angle) * Math.cos(upAngle) * speed
        ),
        life: 1,
        maxLife: 0.4 + Math.random() * 0.3,
        size: (0.02 + Math.random() * 0.02) * size,
        type: 'ember',
        rotSpeed: 0
      });
    }
    
    particles.current = p;
    init.current = true;
    
    return () => {
      geo.dispose();
    };
  }, [size, geo]);
  
  useFrame((_, delta) => {
    if (!init.current || done.current) return;
    
    elapsed.current += delta;
    
    if (elapsed.current >= duration) {
      done.current = true;
      onComplete?.();
      return;
    }
    
    // Update light
    if (lightRef.current) {
      const lightLife = Math.max(0, 1 - elapsed.current / 0.15);
      lightRef.current.intensity = lightLife * 8 * size;
    }
    
    // Update particles
    particles.current.forEach(p => {
      const dt = delta / p.maxLife;
      p.life -= dt;
      
      if (p.life > 0) {
        // Gravity and drag
        if (p.type === 'ember') {
          p.vel.y -= 12 * delta;
          p.vel.multiplyScalar(0.98);
        } else if (p.type === 'smoke') {
          p.vel.y += 0.5 * delta; // Buoyancy
          p.vel.multiplyScalar(0.97);
        } else {
          p.vel.multiplyScalar(0.92);
        }
        
        p.pos.add(p.vel.clone().multiplyScalar(delta));
      }
    });
    
    setFrame(f => f + 1);
  });
  
  // Get fire color based on life
  const getFireColor = (life: number) => {
    if (life > 0.7) return new THREE.Color(1, 1, 0.6); // Yellow-white
    if (life > 0.4) return new THREE.Color(1, 0.6, 0.1); // Orange
    return new THREE.Color(0.8, 0.2, 0.05); // Red
  };
  
  // Get smoke color/opacity
  const getSmokeColor = (life: number) => {
    const gray = 0.15 + (1 - life) * 0.25;
    return new THREE.Color(gray, gray, gray);
  };

  return (
    <group ref={groupRef} position={position.toArray()}>
      {/* Initial flash light */}
      <pointLight
        ref={lightRef}
        color={0xffaa44}
        intensity={8 * size}
        distance={6 * size}
        decay={2}
      />
      
      {/* Fire particles - additive blending for glow */}
      {particles.current.filter(p => p.type === 'fire' && p.life > 0).map((p, i) => {
        const scale = p.size * (0.5 + p.life * 1.5);
        return (
          <mesh
            key={`fire-${i}`}
            position={[p.pos.x, p.pos.y, p.pos.z]}
            scale={scale}
          >
            <sphereGeometry args={[1, 6, 4]} />
            <meshBasicMaterial
              color={getFireColor(p.life)}
              transparent
              opacity={p.life * 0.9}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Smoke particles */}
      {particles.current.filter(p => p.type === 'smoke' && p.life > 0).map((p, i) => {
        const scale = p.size * (1 + (1 - p.life) * 3);
        const opacity = p.life * 0.5;
        return (
          <mesh
            key={`smoke-${i}`}
            position={[p.pos.x, p.pos.y, p.pos.z]}
            scale={scale}
          >
            <sphereGeometry args={[1, 5, 4]} />
            <meshBasicMaterial
              color={getSmokeColor(p.life)}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Ember particles - bright glowing specs */}
      {particles.current.filter(p => p.type === 'ember' && p.life > 0).map((p, i) => (
        <mesh
          key={`ember-${i}`}
          position={[p.pos.x, p.pos.y, p.pos.z]}
          scale={p.size}
        >
          <sphereGeometry args={[1, 4, 3]} />
          <meshBasicMaterial
            color={new THREE.Color(1, 0.7, 0.2)}
            transparent
            opacity={p.life}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

export default ExplosionEffect;
