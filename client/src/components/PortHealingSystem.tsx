import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { create } from "zustand";
import { usePlayer } from "../lib/stores/usePlayer";
import { useAudio } from "../lib/stores/useAudio";
import { MISSION_CONFIG } from "../lib/stores/useGameState";
import { environmentCollisions } from "../lib/collision";
import { logger } from "../lib/utils/logger";

// Port state store for communication between 3D and UI components
interface PortState {
  isNearPort: boolean;
  healCooldown: number;
  setNearPort: (near: boolean) => void;
  setCooldown: (cooldown: number) => void;
}

export const usePortState = create<PortState>((set) => ({
  isNearPort: false,
  healCooldown: 0,
  setNearPort: (near) => set({ isNearPort: near }),
  setCooldown: (cooldown) => set({ healCooldown: cooldown }),
}));

/**
 * PortHealingSystem - Heals the player when docked at a port
 * Checks proximity to ports and heals with a cooldown
 */
const PortHealingSystem = () => {
  const playerPosition = usePlayer((state) => state.position);
  const health = usePlayer((state) => state.health);
  const maxHealth = usePlayer((state) => state.maxHealth);
  const heal = usePlayer((state) => state.heal);
  const playSound = useAudio((state) => state.playSound);
  
  const healCooldownRef = useRef(0);
  
  const HEAL_COOLDOWN = MISSION_CONFIG.PORT_HEAL_COOLDOWN;
  const HEAL_AMOUNT = MISSION_CONFIG.PORT_HEAL_AMOUNT;
  const PORT_PROXIMITY_RADIUS = 15; // Units from port center to trigger healing
  
  useFrame((_, delta) => {
    if (!playerPosition) return;
    
    // Update cooldown timer
    if (healCooldownRef.current > 0) {
      healCooldownRef.current -= delta;
      usePortState.getState().setCooldown(healCooldownRef.current);
    }
    
    // Get all environment features and find ports
    const features = environmentCollisions.getFeatures();
    const ports = features.filter(f => f.type === 'port');
    
    // Check if player is near any port
    let nearPort = false;
    
    for (const port of ports) {
      const dx = playerPosition.x - port.x;
      const dz = playerPosition.z - port.z;
      const distanceSquared = dx * dx + dz * dz;
      const radiusWithScale = PORT_PROXIMITY_RADIUS * port.scale;
      
      if (distanceSquared < radiusWithScale * radiusWithScale) {
        nearPort = true;
        break;
      }
    }
    
    // Update port state store
    usePortState.getState().setNearPort(nearPort);
    
    // If near port and cooldown is ready and health is not full, heal
    if (nearPort && healCooldownRef.current <= 0 && health < maxHealth) {
      const actualHealAmount = Math.min(HEAL_AMOUNT, maxHealth - health);
      heal(actualHealAmount);
      healCooldownRef.current = HEAL_COOLDOWN;
      usePortState.getState().setCooldown(HEAL_COOLDOWN);
      
      // Play healing sound
      playSound('success');
      
      logger.debug('game', `Port healing: +${actualHealAmount} health`);
    }
  });
  
  return null; // This component doesn't render anything in 3D
};

/**
 * PortHealingIndicator - UI component to show when player is near a port
 * This component can be used outside the Canvas as it uses Zustand store
 */
export const PortHealingIndicator = () => {
  const isNearPort = usePortState((state) => state.isNearPort);
  const healCooldown = usePortState((state) => state.healCooldown);
  const health = usePlayer((state) => state.health);
  const maxHealth = usePlayer((state) => state.maxHealth);
  
  if (!isNearPort) return null;
  
  return (
    <div className="absolute top-24 left-1/2 transform -translate-x-1/2 pointer-events-none">
      <div className={`bg-gray-900 bg-opacity-80 px-6 py-3 rounded-lg border-2 ${health < maxHealth && healCooldown <= 0 ? 'border-green-500' : 'border-yellow-600'}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚓</span>
          <div>
            <div className="text-white font-['Pirata_One'] text-lg">PORT</div>
            {health >= maxHealth ? (
              <div className="text-green-400 text-sm">Ship at full health!</div>
            ) : healCooldown > 0 ? (
              <div className="text-yellow-400 text-sm">Repairing... ({Math.ceil(healCooldown)}s)</div>
            ) : (
              <div className="text-green-400 text-sm">Repairing ship... +{MISSION_CONFIG.PORT_HEAL_AMOUNT} HP</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortHealingSystem;
