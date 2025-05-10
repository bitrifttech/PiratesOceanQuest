import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { SCALE, MODEL_ADJUSTMENT } from "../lib/constants";
import { ModelService } from "../lib/services/ModelService";

// Preload crew member models
useGLTF.preload('/models/pirate_captain.glb');
useGLTF.preload('/models/pirate_sailor.glb');
useGLTF.preload('/models/pirate_gunner.glb');
useGLTF.preload('/models/pirate_lookout.glb');

// Crew member types to determine appearance and behavior
export type CrewMemberType = 'captain' | 'sailor' | 'gunner' | 'lookout';

// Animation states for the crew member
export type CrewAnimationState = 
  | 'idle' 
  | 'working' 
  | 'nervous' 
  | 'celebrating' 
  | 'panic' 
  | 'aiming' 
  | 'firing';

interface CrewMemberProps {
  type: CrewMemberType;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  animationState?: CrewAnimationState;
  onDeck?: boolean; // Whether the crew member is on the main deck or below
  stationPosition?: 'port' | 'starboard' | 'bow' | 'stern' | 'mast'; // Position on the ship
}

/**
 * Renders an animated crew member on the ship
 * This component will change animation based on game events
 */
const CrewMember: React.FC<CrewMemberProps> = ({
  type = 'sailor',
  position,
  rotation = [0, 0, 0],
  scale = 1,
  animationState = 'idle',
  onDeck = true,
  stationPosition = 'deck'
}) => {
  // Reference to the mesh for animations
  const meshRef = useRef<THREE.Group>(null);
  
  // Local state for animation
  const [currentAnimation, setCurrentAnimation] = useState<CrewAnimationState>(animationState);
  const [animationTime, setAnimationTime] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [randomOffset] = useState(Math.random() * 10); // For variation in animations
  
  // Use a simple color-based placeholder until we have proper models
  const getCrewColor = () => {
    switch (type) {
      case 'captain':
        return new THREE.Color(0x0000aa); // Blue for captain
      case 'gunner':
        return new THREE.Color(0xaa0000); // Red for gunners
      case 'lookout':
        return new THREE.Color(0x00aa00); // Green for lookouts
      case 'sailor':
      default:
        return new THREE.Color(0xaa7722); // Brown for regular sailors
    }
  };
  
  // Use effect to update animation state when props change
  useEffect(() => {
    setCurrentAnimation(animationState);
    
    // Set animation speed based on state
    switch (animationState) {
      case 'panic':
        setAnimationSpeed(3.0);
        break;
      case 'celebrating':
        setAnimationSpeed(2.0);
        break;
      case 'nervous':
        setAnimationSpeed(1.5);
        break;
      case 'working':
        setAnimationSpeed(1.2);
        break;
      case 'firing':
        setAnimationSpeed(2.5);
        break;
      case 'aiming':
        setAnimationSpeed(0.8);
        break;
      case 'idle':
      default:
        setAnimationSpeed(1.0);
        break;
    }
  }, [animationState]);
  
  // Animation loop
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    // Update animation time
    setAnimationTime(prev => prev + delta * animationSpeed);
    
    // Apply animations based on current state
    switch (currentAnimation) {
      case 'idle':
        // Subtle swaying to simulate standing on a ship
        if (onDeck) {
          meshRef.current.rotation.x = Math.sin(animationTime * 0.5 + randomOffset) * 0.03;
          meshRef.current.rotation.z = Math.sin(animationTime * 0.7 + randomOffset) * 0.03;
        }
        // Random looks around every few seconds
        if (Math.sin(animationTime * 0.3) > 0.9) {
          meshRef.current.rotation.y = rotation[1] + Math.sin(animationTime * 0.1) * 0.3;
        }
        break;
        
      case 'working':
        // Working animations - bending down and up
        meshRef.current.rotation.x = Math.sin(animationTime * 1.5 + randomOffset) * 0.15;
        if (type === 'gunner') {
          // Gunners move side to side while working
          meshRef.current.position.x = position[0] + Math.sin(animationTime + randomOffset) * 0.1;
        }
        break;
        
      case 'nervous':
        // Nervous looking around
        meshRef.current.rotation.y = rotation[1] + Math.sin(animationTime * 2 + randomOffset) * 0.5;
        // Slight bobbing
        meshRef.current.position.y = position[1] + Math.sin(animationTime * 3 + randomOffset) * 0.02;
        break;
        
      case 'celebrating':
        // Jumping and arm waving
        meshRef.current.position.y = position[1] + Math.abs(Math.sin(animationTime * 4 + randomOffset)) * 0.1;
        meshRef.current.rotation.z = Math.sin(animationTime * 5 + randomOffset) * 0.2;
        break;
        
      case 'panic':
        // Frantic movement - running in place
        meshRef.current.position.x = position[0] + Math.sin(animationTime * 10 + randomOffset) * 0.05;
        meshRef.current.position.z = position[2] + Math.sin(animationTime * 9 + randomOffset + 1) * 0.05;
        meshRef.current.rotation.y = rotation[1] + Math.sin(animationTime * 8) * 2;
        break;
        
      case 'aiming':
        // Steady aiming posture with slight adjustments
        if (stationPosition === 'port') {
          // Looking left
          meshRef.current.rotation.y = -Math.PI/2 + Math.sin(animationTime * 0.5) * 0.1;
        } else if (stationPosition === 'starboard') {
          // Looking right
          meshRef.current.rotation.y = Math.PI/2 + Math.sin(animationTime * 0.5) * 0.1;
        }
        // Small adjustments to aim
        meshRef.current.rotation.x = Math.sin(animationTime * 0.3 + randomOffset) * 0.05;
        break;
        
      case 'firing':
        // Firing animation - recoil and recovery
        const firingPhase = (animationTime * 5) % 1;
        if (firingPhase < 0.2) {
          // Quick backwards motion (recoil)
          const recoilAmount = 0.05 * (1 - firingPhase / 0.2);
          if (stationPosition === 'port') {
            meshRef.current.position.x = position[0] + recoilAmount;
          } else if (stationPosition === 'starboard') {
            meshRef.current.position.x = position[0] - recoilAmount;
          }
        } else if (firingPhase < 0.5) {
          // Recovery to position
          const recoveryProgress = (firingPhase - 0.2) / 0.3;
          if (stationPosition === 'port') {
            meshRef.current.position.x = position[0] + 0.05 * (1 - recoveryProgress);
          } else if (stationPosition === 'starboard') {
            meshRef.current.position.x = position[0] - 0.05 * (1 - recoveryProgress);
          }
        } else {
          // Reset to normal position
          meshRef.current.position.x = position[0];
        }
        break;
    }
  });
  
  // Get the appropriate model path based on crew type
  const getModelPath = () => {
    switch (type) {
      case 'captain':
        return '/models/pirate_captain.glb';
      case 'gunner':
        return '/models/pirate_gunner.glb';
      case 'lookout':
        return '/models/pirate_lookout.glb';
      case 'sailor':
      default:
        return '/models/pirate_sailor.glb';
    }
  };
  
  // Load the 3D model for this crew member
  const modelPath = getModelPath();
  const { scene } = useGLTF(modelPath) as any;
  
  // Create a clone of the model to avoid sharing issues
  const model = scene.clone();
  
  // Log when the model is loaded
  useEffect(() => {
    console.log(`[CREW] Loaded ${type} model from ${modelPath}`);
  }, [type, modelPath]);
  
  // Get model-specific height adjustment
  const getModelHeightOffset = () => {
    switch (type) {
      case 'captain':
        return -0.4; // Lower them to stand on deck
      case 'gunner':
        return -0.45; // Lower them to stand on deck
      case 'lookout':
        return -0.45; // Lower them to stand on deck
      case 'sailor':
      default:
        return -0.45; // Lower them to stand on deck
    }
  };
  
  // Apply any model-specific rotation adjustment
  const getModelRotationAdjustment = () => {
    switch (type) {
      case 'captain':
        return [0, Math.PI, 0]; // Face forward
      case 'gunner':
        return [0, Math.PI, 0]; // Face forward
      case 'lookout':
        return [0, Math.PI, 0]; // Face forward
      case 'sailor':
      default:
        return [0, Math.PI, 0]; // Face forward
    }
  };
  
  // Calculate adjusted position with height offset
  const adjustedPosition: [number, number, number] = [
    position[0],
    position[1] + getModelHeightOffset(), // Adjust height
    position[2]
  ];
  
  // Combine the base rotation with model-specific adjustments
  const baseRotation = rotation || [0, 0, 0];
  const rotationAdjustment = getModelRotationAdjustment();
  const adjustedRotation: [number, number, number] = [
    baseRotation[0] + rotationAdjustment[0],
    baseRotation[1] + rotationAdjustment[1],
    baseRotation[2] + rotationAdjustment[2]
  ];
  
  return (
    <group 
      ref={meshRef} 
      position={adjustedPosition} 
      rotation={adjustedRotation}
      scale={[scale, scale, scale]}
    >
      {/* Rendered 3D model based on crew type */}
      <primitive 
        object={model} 
        castShadow 
        receiveShadow
      />
    </group>
  );
};

export default CrewMember;