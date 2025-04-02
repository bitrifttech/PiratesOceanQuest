import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCALE } from "../lib/constants";

interface CannonFireEffectProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  onComplete?: () => void;
}

/**
 * Renders a cannon fire effect with smoke, flame, and particle burst
 */
const CannonFireEffect = ({ position, direction, onComplete }: CannonFireEffectProps) => {
  // References
  const groupRef = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Mesh[]>([]);
  const smokeParticles = useRef<THREE.Mesh[]>([]);
  const lifeTime = useRef<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  
  // Set up effect
  useEffect(() => {
    if (!groupRef.current || completed) return;
    
    // Position the effect
    groupRef.current.position.copy(position);
    
    // Create particles in the direction of fire
    const dirNormalized = direction.clone().normalize();
    
    // Create fire particles
    for (let i = 0; i < 15; i++) {
      const particleMesh = new THREE.Mesh(
        new THREE.SphereGeometry((0.15 + Math.random() * 0.15) * SCALE.EFFECTS.FIRE, 8, 8),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(Math.random() < 0.3 ? 0xffa500 : 0xff4500),
          emissive: new THREE.Color(Math.random() < 0.3 ? 0xffa500 : 0xff4500),
          emissiveIntensity: 1.0,
          transparent: true,
          opacity: 0.8
        })
      );
      
      // Random position within a small cone shape in the direction of fire
      const spread = 0.5;
      const speed = 5 + Math.random() * 10;
      
      particleMesh.position.copy(position);
      
      // Generate a random vector within a cone
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.15;
      
      // Calculate direction with spread
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta) + 0.05; // Add slight upward bias
      const z = Math.cos(phi);
      
      // Create a direction that's based on the cannon direction but with spread
      const particleDir = new THREE.Vector3();
      
      // Create a temporary quaternion to rotate our spread vector to align with direction
      const tmpQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        dirNormalized
      );
      
      // Apply the rotation to our spread direction
      particleDir.set(x, y, z).applyQuaternion(tmpQuaternion);
      
      // Store velocity with the particle
      particleMesh.userData.velocity = particleDir.multiplyScalar(speed);
      particleMesh.userData.drag = 0.92 + Math.random() * 0.05;
      
      // Add to our group and tracking array
      groupRef.current.add(particleMesh);
      particles.current.push(particleMesh);
    }
    
    // Create smoke particles
    for (let i = 0; i < 8; i++) {
      const smokeMesh = new THREE.Mesh(
        new THREE.SphereGeometry((0.25 + Math.random() * 0.5) * SCALE.EFFECTS.SMOKE, 8, 8),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x444444),
          transparent: true,
          opacity: 0.6,
        })
      );
      
      // Position slightly offset from the fire
      smokeMesh.position.copy(position);
      smokeMesh.position.add(dirNormalized.clone().multiplyScalar(0.3 * SCALE.EFFECTS.POSITION_OFFSET));
      
      // Random directions but generally following the cannon direction
      const smokeDir = dirNormalized.clone();
      smokeDir.x += (Math.random() - 0.5) * 0.5;
      smokeDir.y += Math.random() * 0.5; // More upward bias for smoke
      smokeDir.z += (Math.random() - 0.5) * 0.5;
      smokeDir.normalize();
      
      // Store velocity with the smoke particle
      smokeMesh.userData.velocity = smokeDir.multiplyScalar(1.5 + Math.random() * 2);
      smokeMesh.userData.drag = 0.98;
      smokeMesh.userData.fadeRate = 0.01 + Math.random() * 0.02;
      
      // Add to our group and tracking array
      groupRef.current.add(smokeMesh);
      smokeParticles.current.push(smokeMesh);
    }
    
    return () => {
      // Clean up particles
      particles.current = [];
      smokeParticles.current = [];
    };
  }, [position, direction, completed]);
  
  // Animate particles
  useFrame((_, delta) => {
    if (!groupRef.current || completed) return;
    
    // Update lifetime
    lifeTime.current += delta;
    
    // Update fire particles
    particles.current.forEach(particle => {
      // Apply velocity
      particle.position.add(particle.userData.velocity.clone().multiplyScalar(delta));
      
      // Apply drag
      particle.userData.velocity.multiplyScalar(particle.userData.drag);
      
      // Shrink particles over time
      particle.scale.multiplyScalar(0.95);
      
      // Update material opacity
      if (particle.material instanceof THREE.MeshStandardMaterial) {
        particle.material.opacity *= 0.95;
      }
    });
    
    // Update smoke particles
    smokeParticles.current.forEach(smoke => {
      // Apply velocity with more buoyancy
      smoke.userData.velocity.y += 0.05 * delta; // Smoke rises
      smoke.position.add(smoke.userData.velocity.clone().multiplyScalar(delta));
      
      // Apply drag
      smoke.userData.velocity.multiplyScalar(smoke.userData.drag);
      
      // Expand smoke over time
      smoke.scale.multiplyScalar(1.01);
      
      // Fade out smoke
      if (smoke.material instanceof THREE.MeshStandardMaterial) {
        smoke.material.opacity -= smoke.userData.fadeRate;
      }
    });
    
    // Remove effect after lifetime
    if (lifeTime.current > 1.0) {
      setCompleted(true);
      if (onComplete) onComplete();
    }
  });
  
  // Use a scene-level group to ensure the effect doesn't move with the ship
  return (
    <group position={[0, 0, 0]}>
      <group ref={groupRef} />
    </group>
  );
};

export default CannonFireEffect;