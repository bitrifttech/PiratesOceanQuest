import { memo, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PowerUpType } from "../lib/stores/usePowerUps";

interface WorldPowerUpProps {
  id: string;
  type: PowerUpType;
  position: { x: number; y: number; z: number };
}

/**
 * Configuration for power-up visual appearance
 */
const POWER_UP_VISUALS: Record<PowerUpType, { color: string; geometryType: string }> = {
  health_boost: { color: '#ff0000', geometryType: 'sphere' },
  speed_boost: { color: '#00ff00', geometryType: 'cone' },
  double_damage: { color: '#ff7700', geometryType: 'box' },
  rapid_fire: { color: '#00ffff', geometryType: 'cylinder' },
  shield: { color: '#0000ff', geometryType: 'torus' },
  triple_shot: { color: '#ff00ff', geometryType: 'dodecahedron' },
  long_range: { color: '#ffff00', geometryType: 'octahedron' },
  gold_bonus: { color: '#ffd700', geometryType: 'icosahedron' },
};

/**
 * Renders the appropriate geometry for a power-up type
 */
const PowerUpGeometry = ({ type }: { type: PowerUpType }) => {
  switch (type) {
    case 'health_boost':
      return <sphereGeometry args={[0.8, 16, 16]} />;
    case 'speed_boost':
      return <coneGeometry args={[0.7, 1.4, 16]} />;
    case 'double_damage':
      return <boxGeometry args={[1, 1, 1]} />;
    case 'rapid_fire':
      return <cylinderGeometry args={[0.4, 0.6, 1.2, 16]} />;
    case 'shield':
      return <torusGeometry args={[0.6, 0.2, 16, 32]} />;
    case 'triple_shot':
      return <dodecahedronGeometry args={[0.7, 0]} />;
    case 'long_range':
      return <octahedronGeometry args={[0.7, 0]} />;
    case 'gold_bonus':
      return <icosahedronGeometry args={[0.7, 0]} />;
    default:
      return <sphereGeometry args={[0.6, 12, 12]} />;
  }
};

/**
 * Individual world power-up component with animation
 * Renders a floating, spinning power-up that can be collected by the player
 */
const WorldPowerUp = memo(({ id, type, position }: WorldPowerUpProps) => {
  // Get color from config or default to white
  const color = POWER_UP_VISUALS[type]?.color || '#ffffff';
  
  // Calculate unique offset based on ID for varied animations
  const idHash = useMemo(() => 
    id.split('').reduce((a, b) => a + b.charCodeAt(0), 0),
    [id]
  );
  
  // Position as Three.js compatible array
  const positionArray: [number, number, number] = [
    position.x,
    position.y,
    position.z
  ];
  
  // We use refs for animation values that don't need to trigger re-renders
  // The animation is calculated in the render based on Date.now()
  const bobOffset = Math.sin((Date.now() + idHash) * 0.003) * 0.3;
  const spinOffset = (Date.now() + idHash) * 0.001;
  
  return (
    <group position={positionArray} rotation={[0, spinOffset, 0]}>
      <mesh 
        position={[0, bobOffset, 0]} 
        userData={{ isPowerUp: true, id, type }}
      >
        <PowerUpGeometry type={type} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.7} 
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <pointLight 
        color={color} 
        intensity={0.8} 
        distance={5} 
        position={[0, bobOffset, 0]}
      />
    </group>
  );
});

WorldPowerUp.displayName = 'WorldPowerUp';

export default WorldPowerUp;
