import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ShipExplosionEffectProps {
  position: THREE.Vector3;
  size?: number;
  duration?: number;
  onComplete?: () => void;
}

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  type: 'fireball' | 'fire' | 'smoke' | 'ember' | 'debris';
  color: THREE.Color;
  rotSpeed?: THREE.Vector3;
  rotation?: THREE.Euler;
}

/**
 * Intense ship explosion effect - larger fireball, more debris, longer lasting
 */
const ShipExplosionEffect: React.FC<ShipExplosionEffectProps> = ({
  position,
  size = 1.5,
  duration = 1.5,
  onComplete
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const elapsed = useRef(0);
  const done = useRef(false);
  const [frame, setFrame] = useState(0);
  const init = useRef(false);
  
  const particles = useRef<Particle[]>([]);
  
  // Initialize particles
  useEffect(() => {
    const p: Particle[] = [];
    
    // Central fireball - expands then fades
    p.push({
      pos: new THREE.Vector3(0, 0.2, 0),
      vel: new THREE.Vector3(0, 0.5, 0),
      life: 1,
      maxLife: 0.4,
      size: 0.5 * size,
      type: 'fireball',
      color: new THREE.Color(1, 0.5, 0.1)
    });
    
    // Fire particles - burst outward
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2 + Math.random() * 0.4;
      const upAngle = Math.random() * 0.6;
      const speed = 2 + Math.random() * 2;
      
      p.push({
        pos: new THREE.Vector3(0, 0.1, 0),
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(upAngle) * speed,
          Math.sin(upAngle) * speed + 1,
          Math.sin(angle) * Math.cos(upAngle) * speed
        ),
        life: 1,
        maxLife: 0.35 + Math.random() * 0.2,
        size: (0.12 + Math.random() * 0.1) * size,
        type: 'fire',
        color: new THREE.Color().setHSL(0.08 + Math.random() * 0.07, 1, 0.5 + Math.random() * 0.2)
      });
    }
    
    // Smoke particles - rise slowly
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 0.25;
      
      p.push({
        pos: new THREE.Vector3(
          Math.cos(angle) * spread * size,
          Math.random() * 0.3 * size,
          Math.sin(angle) * spread * size
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          0.6 + Math.random() * 0.6,
          (Math.random() - 0.5) * 0.4
        ),
        life: 1,
        maxLife: 1.0 + Math.random() * 0.5,
        size: (0.1 + Math.random() * 0.12) * size,
        type: 'smoke',
        color: new THREE.Color(0.12 + Math.random() * 0.1, 0.12 + Math.random() * 0.1, 0.12 + Math.random() * 0.1)
      });
    }
    
    // Ember particles - bright specs
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const upAngle = Math.random() * Math.PI * 0.35;
      const speed = 4 + Math.random() * 5;
      
      p.push({
        pos: new THREE.Vector3(0, 0.1, 0),
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(upAngle) * speed,
          Math.sin(upAngle) * speed + 2,
          Math.sin(angle) * Math.cos(upAngle) * speed
        ),
        life: 1,
        maxLife: 0.5 + Math.random() * 0.4,
        size: (0.015 + Math.random() * 0.02) * size,
        type: 'ember',
        color: new THREE.Color(1, 0.6 + Math.random() * 0.3, 0.1)
      });
    }
    
    // Wood debris particles
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const upAngle = Math.random() * Math.PI * 0.25;
      const speed = 3 + Math.random() * 3;
      
      p.push({
        pos: new THREE.Vector3(0, 0.2, 0),
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(upAngle) * speed,
          Math.sin(upAngle) * speed + 2,
          Math.sin(angle) * Math.cos(upAngle) * speed
        ),
        life: 1,
        maxLife: 1.2,
        size: (0.03 + Math.random() * 0.04) * size,
        type: 'debris',
        color: new THREE.Color(0.5 + Math.random() * 0.15, 0.3 + Math.random() * 0.1, 0.15),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      });
    }
    
    particles.current = p;
    init.current = true;
  }, [size]);
  
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
      const lightLife = Math.max(0, 1 - elapsed.current / 0.2);
      lightRef.current.intensity = lightLife * 12 * size;
    }
    
    // Update particles
    particles.current.forEach(p => {
      const dt = delta / p.maxLife;
      p.life -= dt;
      
      if (p.life > 0) {
        // Physics based on type
        if (p.type === 'debris') {
          p.vel.y -= 15 * delta; // Gravity
          p.vel.multiplyScalar(0.99);
          if (p.rotation && p.rotSpeed) {
            p.rotation.x += p.rotSpeed.x * delta;
            p.rotation.y += p.rotSpeed.y * delta;
            p.rotation.z += p.rotSpeed.z * delta;
          }
        } else if (p.type === 'ember') {
          p.vel.y -= 8 * delta;
          p.vel.multiplyScalar(0.98);
        } else if (p.type === 'smoke') {
          p.vel.y += 0.3 * delta; // Buoyancy
          p.vel.multiplyScalar(0.97);
        } else if (p.type === 'fire' || p.type === 'fireball') {
          p.vel.multiplyScalar(0.9);
        }
        
        p.pos.add(p.vel.clone().multiplyScalar(delta));
      }
    });
    
    setFrame(f => f + 1);
  });
  
  return (
    <group ref={groupRef} position={position.toArray()}>
      {/* Intense flash light */}
      <pointLight
        ref={lightRef}
        color={0xff6622}
        intensity={12 * size}
        distance={10 * size}
        decay={2}
      />
      
      {/* Central fireball - glowing core */}
      {particles.current.filter(p => p.type === 'fireball' && p.life > 0).map((p, i) => {
        const scale = p.size * (0.3 + p.life * 2.5); // Expands then shrinks
        return (
          <mesh
            key={`fireball-${i}`}
            position={[p.pos.x, p.pos.y, p.pos.z]}
            scale={scale}
          >
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial
              color={p.color}
              transparent
              opacity={p.life * 0.9}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Fire particles */}
      {particles.current.filter(p => p.type === 'fire' && p.life > 0).map((p, i) => {
        const scale = p.size * (0.4 + p.life * 1.2);
        return (
          <mesh
            key={`fire-${i}`}
            position={[p.pos.x, p.pos.y, p.pos.z]}
            scale={scale}
          >
            <sphereGeometry args={[1, 6, 4]} />
            <meshBasicMaterial
              color={p.color}
              transparent
              opacity={p.life * 0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Smoke particles */}
      {particles.current.filter(p => p.type === 'smoke' && p.life > 0).map((p, i) => {
        const scale = p.size * (1 + (1 - p.life) * 4);
        return (
          <mesh
            key={`smoke-${i}`}
            position={[p.pos.x, p.pos.y, p.pos.z]}
            scale={scale}
          >
            <sphereGeometry args={[1, 5, 4]} />
            <meshBasicMaterial
              color={p.color}
              transparent
              opacity={p.life * 0.45}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Ember particles */}
      {particles.current.filter(p => p.type === 'ember' && p.life > 0).map((p, i) => (
        <mesh
          key={`ember-${i}`}
          position={[p.pos.x, p.pos.y, p.pos.z]}
          scale={p.size}
        >
          <sphereGeometry args={[1, 4, 3]} />
          <meshBasicMaterial
            color={p.color}
            transparent
            opacity={p.life * 0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
      
      {/* Wood debris */}
      {particles.current.filter(p => p.type === 'debris' && p.life > 0 && p.pos.y > -0.5).map((p, i) => (
        <mesh
          key={`debris-${i}`}
          position={[p.pos.x, p.pos.y, p.pos.z]}
          rotation={p.rotation ? [p.rotation.x, p.rotation.y, p.rotation.z] : [0, 0, 0]}
          scale={[p.size, p.size * 0.4, p.size * 2]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={p.color}
            transparent
            opacity={Math.min(1, p.life * 1.5)}
          />
        </mesh>
      ))}
    </group>
  );
};

export default ShipExplosionEffect;
