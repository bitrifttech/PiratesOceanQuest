import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import CrewMember, { CrewMemberType, CrewAnimationState } from './CrewMember';
import { usePlayer } from '../lib/stores/usePlayer';
import { useEnemies } from '../lib/stores/useEnemies';

// Position definitions for crew members on the ship
interface CrewPosition {
  position: [number, number, number];
  rotation: [number, number, number];
  type: CrewMemberType;
  deck: boolean;
  station: 'port' | 'starboard' | 'bow' | 'stern' | 'mast';
}

// Ship events that trigger crew animations
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

interface CrewSystemProps {
  shipSize?: 'small' | 'medium' | 'large';
  isPlayerShip?: boolean;
  shipRef?: React.RefObject<THREE.Group>;
  crewSize?: number;
  shipEvent?: ShipEvent;
}

/**
 * Manages the crew members on a ship, their positions and animations
 * Responds to ship events with appropriate crew reactions
 */
const CrewSystem: React.FC<CrewSystemProps> = ({
  shipSize = 'medium',
  isPlayerShip = true,
  shipRef,
  crewSize = 8,
  shipEvent = 'idle'
}) => {
  // State for crew positions and animation states
  const [crewPositions, setCrewPositions] = useState<CrewPosition[]>([]);
  const [crewAnimationState, setCrewAnimationState] = useState<CrewAnimationState>('idle');
  
  // Create initial crew positions based on ship size
  useEffect(() => {
    const newPositions: CrewPosition[] = [];
    
    // Ship base height is 1.5 based on the logs
    const deckHeight = 0.75; // Position crew at deck level, which is roughly halfway up the ship's height
    
    // Captain is always at the stern
    newPositions.push({
      position: [0, deckHeight, -1.2], // Captain at the back of the ship
      rotation: [0, Math.PI, 0], // Facing backward (toward rear of ship)
      type: 'captain',
      deck: true,
      station: 'stern'
    });
    
    // Size multipliers for different ship sizes
    const sizeMultiplier = shipSize === 'small' ? 0.8 : shipSize === 'large' ? 1.2 : 1.0;
    
    // Add gunners on both sides of the ship
    const gunnerCount = Math.max(1, Math.floor(crewSize / 3)); // At least 1 gunner, up to 1/3 of crew
    
    for (let i = 0; i < gunnerCount; i++) {
      // Port side gunners (left)
      newPositions.push({
        position: [-0.7 * sizeMultiplier, deckHeight, (-0.5 + i * 0.8) * sizeMultiplier], 
        rotation: [0, -Math.PI/2, 0], // Facing left
        type: 'gunner',
        deck: true,
        station: 'port'
      });
      
      // Starboard side gunners (right)
      newPositions.push({
        position: [0.7 * sizeMultiplier, deckHeight, (-0.5 + i * 0.8) * sizeMultiplier],
        rotation: [0, Math.PI/2, 0], // Facing right
        type: 'gunner',
        deck: true,
        station: 'starboard'
      });
    }
    
    // Add a lookout at the bow
    newPositions.push({
      position: [0, deckHeight, 1.2 * sizeMultiplier],
      rotation: [0, 0, 0], // Facing forward
      type: 'lookout',
      deck: true,
      station: 'bow'
    });
    
    // Add remaining crew as sailors
    const remainingCrew = Math.max(0, crewSize - (1 + gunnerCount * 2 + 1)); // Captain + gunners + lookout
    
    for (let i = 0; i < remainingCrew; i++) {
      // Distribute sailors around the ship centrally
      const angle = (i / remainingCrew) * Math.PI * 2; // Distribute in a circle
      const radius = 0.4 * sizeMultiplier; // Smaller radius to keep them on deck
      
      newPositions.push({
        position: [
          Math.sin(angle) * radius,
          deckHeight, // Same height as other crew
          Math.cos(angle) * radius * 0.8 // Slightly compressed circle on z-axis
        ],
        rotation: [0, -angle + Math.PI, 0], // Face outward
        type: 'sailor',
        deck: true,
        station: i % 2 === 0 ? 'port' : 'starboard'
      });
    }
    
    setCrewPositions(newPositions);
  }, [shipSize, crewSize]);
  
  // Update crew animation states based on ship events
  useEffect(() => {
    switch (shipEvent) {
      case 'sailing':
        setCrewAnimationState('working');
        break;
        
      case 'combat_started':
        setCrewAnimationState('nervous');
        break;
        
      case 'hit_by_cannon':
        setCrewAnimationState('panic');
        break;
        
      case 'firing_cannons':
        setCrewAnimationState('firing');
        break;
        
      case 'near_collision':
        setCrewAnimationState('panic');
        break;
        
      case 'victory':
        setCrewAnimationState('celebrating');
        break;
        
      case 'taking_damage':
        setCrewAnimationState('panic');
        break;
        
      case 'nearby_enemy':
        setCrewAnimationState('nervous');
        break;
        
      case 'aiming_cannons':
        setCrewAnimationState('aiming');
        break;
        
      case 'idle':
      default:
        setCrewAnimationState('idle');
        break;
    }
  }, [shipEvent]);
  
  return (
    <group>
      {crewPositions.map((crewPos, index) => (
        <CrewMember
          key={`crew-${index}`}
          type={crewPos.type}
          position={crewPos.position}
          rotation={crewPos.rotation}
          scale={0.25} // Smaller scale for the detailed 3D models
          animationState={
            // Different crew types may have different reactions to the same event
            crewPos.type === 'gunner' && shipEvent === 'aiming_cannons' 
              ? 'aiming' 
              : crewPos.type === 'gunner' && shipEvent === 'firing_cannons'
                ? 'firing'
                : crewPos.type === 'lookout' && (shipEvent === 'nearby_enemy' || shipEvent === 'combat_started')
                  ? 'nervous'
                  : crewAnimationState
          }
          onDeck={crewPos.deck}
          stationPosition={crewPos.station}
        />
      ))}
    </group>
  );
};

export default CrewSystem;