import { create } from 'zustand';
import { usePlayer } from './usePlayer';
import { useEnemies } from './useEnemies';

// Define a simplified ShipEvent type to replace the imported one from CrewSystem
export type ShipEvent = 
  | 'idle' 
  | 'sailing' 
  | 'combat_started' 
  | 'hit_by_cannon' 
  | 'firing_cannons' 
  | 'near_collision' 
  | 'victory' 
  | 'taking_damage' 
  | 'nearby_enemy' 
  | 'aiming_cannons';

interface ShipEventsState {
  playerShipEvent: ShipEvent;
  enemyShipEvents: Record<string, ShipEvent>;
  lastCannonFired: number;
  lastHitTaken: number;
  
  // Update methods
  setPlayerShipEvent: (event: ShipEvent) => void;
  setEnemyShipEvent: (enemyId: string, event: ShipEvent) => void;
  resetPlayerShipEvent: () => void;
  resetEnemyShipEvent: (enemyId: string) => void;
  
  // Event triggers
  firePlayerCannons: () => void;
  enemyFiredCannons: (enemyId: string) => void;
  playerHit: () => void;
  enemyHit: (enemyId: string) => void;
  playerNearCollision: () => void;
  enemyNearCollision: (enemyId: string) => void;
  playerVictory: () => void;
  
  // Update for enemy proximity
  updateEnemyProximity: (distance: number) => void;
}

// Create the ship events store
export const useShipEvents = create<ShipEventsState>((set, get) => ({
  playerShipEvent: 'sailing', // Default to sailing
  enemyShipEvents: {},
  lastCannonFired: 0,
  lastHitTaken: 0,
  
  // Basic setters
  setPlayerShipEvent: (event) => set({ playerShipEvent: event }),
  
  setEnemyShipEvent: (enemyId, event) => 
    set((state) => ({
      enemyShipEvents: {
        ...state.enemyShipEvents,
        [enemyId]: event
      }
    })),
  
  resetPlayerShipEvent: () => {
    const currentTime = Date.now();
    const { lastCannonFired, lastHitTaken } = get();
    
    // Don't reset if we've recently fired cannons or been hit
    if (currentTime - lastCannonFired < 3000 || currentTime - lastHitTaken < 5000) {
      return;
    }
    
    // Check if enemies are nearby for a nervous state
    const playerState = usePlayer.getState();
    const enemies = useEnemies.getState().enemies;
    let nearbyEnemy = false;
    
    if (playerState.position) {
      for (const enemy of enemies) {
        const distance = playerState.position.distanceTo(enemy.position);
        if (distance < 50) {
          nearbyEnemy = true;
          break;
        }
      }
    }
    
    set({ 
      playerShipEvent: nearbyEnemy ? 'nearby_enemy' : 'sailing' 
    });
  },
  
  resetEnemyShipEvent: (enemyId) => {
    set((state) => {
      const newEnemyEvents = { ...state.enemyShipEvents };
      newEnemyEvents[enemyId] = 'sailing';
      return { enemyShipEvents: newEnemyEvents };
    });
  },
  
  // Event triggers
  firePlayerCannons: () => {
    set({ 
      playerShipEvent: 'firing_cannons',
      lastCannonFired: Date.now()
    });
    
    // Schedule animation state transitions
    setTimeout(() => {
      const { resetPlayerShipEvent } = get();
      resetPlayerShipEvent();
    }, 2000);
  },
  
  enemyFiredCannons: (enemyId) => {
    set((state) => ({
      enemyShipEvents: {
        ...state.enemyShipEvents,
        [enemyId]: 'firing_cannons'
      }
    }));
    
    // Reset after animation
    setTimeout(() => {
      const { resetEnemyShipEvent } = get();
      resetEnemyShipEvent(enemyId);
    }, 2000);
  },
  
  playerHit: () => {
    set({ 
      playerShipEvent: 'hit_by_cannon',
      lastHitTaken: Date.now()
    });
    
    // Transition to panic for a few seconds
    setTimeout(() => {
      set({ playerShipEvent: 'taking_damage' });
    }, 1000);
    
    // Then reset
    setTimeout(() => {
      const { resetPlayerShipEvent } = get();
      resetPlayerShipEvent();
    }, 5000);
  },
  
  enemyHit: (enemyId) => {
    set((state) => ({
      enemyShipEvents: {
        ...state.enemyShipEvents,
        [enemyId]: 'hit_by_cannon'
      }
    }));
    
    // Transition to taking damage
    setTimeout(() => {
      set((state) => ({
        enemyShipEvents: {
          ...state.enemyShipEvents,
          [enemyId]: 'taking_damage'
        }
      }));
    }, 1000);
    
    // Then reset
    setTimeout(() => {
      const { resetEnemyShipEvent } = get();
      resetEnemyShipEvent(enemyId);
    }, 5000);
  },
  
  playerNearCollision: () => {
    set({ playerShipEvent: 'near_collision' });
    
    // Reset after a short panic
    setTimeout(() => {
      const { resetPlayerShipEvent } = get();
      resetPlayerShipEvent();
    }, 3000);
  },
  
  enemyNearCollision: (enemyId) => {
    set((state) => ({
      enemyShipEvents: {
        ...state.enemyShipEvents,
        [enemyId]: 'near_collision'
      }
    }));
    
    // Reset after a short panic
    setTimeout(() => {
      const { resetEnemyShipEvent } = get();
      resetEnemyShipEvent(enemyId);
    }, 3000);
  },
  
  playerVictory: () => {
    set({ playerShipEvent: 'victory' });
    
    // Reset after celebration
    setTimeout(() => {
      const { resetPlayerShipEvent } = get();
      resetPlayerShipEvent();
    }, 8000);
  },
  
  updateEnemyProximity: (distance) => {
    const { playerShipEvent, lastCannonFired, lastHitTaken } = get();
    const currentTime = Date.now();
    
    // Don't override certain animations
    if (
      playerShipEvent === 'firing_cannons' || 
      playerShipEvent === 'hit_by_cannon' || 
      playerShipEvent === 'taking_damage' ||
      playerShipEvent === 'near_collision' ||
      playerShipEvent === 'victory' ||
      currentTime - lastCannonFired < 3000 || 
      currentTime - lastHitTaken < 5000
    ) {
      return;
    }
    
    // Update based on enemy proximity
    if (distance < 30) {
      // Close combat
      set({ playerShipEvent: 'combat_started' });
    } else if (distance < 50) {
      // Nearby enemy
      set({ playerShipEvent: 'nearby_enemy' });
    } else {
      // Normal sailing
      set({ playerShipEvent: 'sailing' });
    }
  }
}));

// Regular update loop to check for event state transitions
setInterval(() => {
  const { resetPlayerShipEvent } = useShipEvents.getState();
  resetPlayerShipEvent();
}, 5000);

export default useShipEvents;