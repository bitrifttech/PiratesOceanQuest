import { memo, useMemo } from "react";
import * as THREE from "three";
import { PowerUpType } from "../lib/stores/usePowerUps";
import Gem from "./Gem";

interface WorldPowerUpProps {
  id: string;
  type: PowerUpType;
  position: { x: number; y: number; z: number };
}

/**
 * Configuration for power-up visual appearance
 */
const POWER_UP_VISUALS: Record<PowerUpType, { color: string; cutType: 'brilliant' | 'emerald' }> = {
  health_boost: { color: '#ff3333', cutType: 'brilliant' },
  speed_boost: { color: '#33ff33', cutType: 'brilliant' },
  double_damage: { color: '#ff7700', cutType: 'emerald' },
  rapid_fire: { color: '#33ffff', cutType: 'brilliant' },
  shield: { color: '#3366ff', cutType: 'emerald' },
  triple_shot: { color: '#ff33ff', cutType: 'brilliant' },
  long_range: { color: '#ffff33', cutType: 'emerald' },
  gold_bonus: { color: '#ffd700', cutType: 'brilliant' },
};

/**
 * Individual world power-up component with animation
 * Renders a floating, spinning gem that can be collected by the player
 */
const WorldPowerUp = memo(({ id, type, position }: WorldPowerUpProps) => {
  // Get visual config from lookup or defaults
  const config = POWER_UP_VISUALS[type] || { color: '#ffffff', cutType: 'brilliant' as const };
  
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
  const spinOffset = (Date.now() + idHash) * 0.0008;
  
  return (
    <group position={positionArray} rotation={[0, spinOffset, 0]}>
      <group 
        position={[0, bobOffset + 0.5, 0]} 
        userData={{ isPowerUp: true, id, type }}
      >
        <Gem
          color={config.color}
          size={0.7}
          cutType={config.cutType}
        />
      </group>
    </group>
  );
});

WorldPowerUp.displayName = 'WorldPowerUp';

export default WorldPowerUp;
