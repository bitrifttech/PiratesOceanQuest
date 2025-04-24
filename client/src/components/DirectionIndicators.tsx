import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayer } from '../lib/stores/usePlayer';

/**
 * Component that renders direction indicators around the ship
 * to visualize its forward/backward movement directions
 */
const DirectionIndicators = () => {
  // Get player position and rotation from store
  const { position, rotation } = usePlayer();
  
  // Refs for the arrow meshes
  const forwardArrowRef = useRef<THREE.Group>(null);
  const backwardArrowRef = useRef<THREE.Group>(null);
  const leftArrowRef = useRef<THREE.Group>(null);
  const rightArrowRef = useRef<THREE.Group>(null);
  
  // Update arrow positions to match ship position and rotation
  useFrame(() => {
    if (!position || !rotation || !forwardArrowRef.current || 
        !backwardArrowRef.current || !leftArrowRef.current || !rightArrowRef.current) {
      return;
    }
    
    // Calculate the ship's direction vectors based on its rotation
    // Forward vector (ship points in -Z direction with 0 rotation)
    const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(rotation);
    
    // Backward vector (opposite of forward)
    const backwardDir = forwardDir.clone().multiplyScalar(-1);
    
    // Right vector (perpendicular to forward)
    const rightDir = new THREE.Vector3(1, 0, 0).applyEuler(rotation);
    
    // Left vector (opposite of right)
    const leftDir = rightDir.clone().multiplyScalar(-1);
    
    // Set positions of arrows (offset from ship)
    // Forward arrow (blue)
    forwardArrowRef.current.position.copy(position.clone().add(forwardDir.clone().multiplyScalar(10)));
    forwardArrowRef.current.lookAt(position.clone().add(forwardDir.clone().multiplyScalar(20)));
    
    // Backward arrow (red)
    backwardArrowRef.current.position.copy(position.clone().add(backwardDir.clone().multiplyScalar(10)));
    backwardArrowRef.current.lookAt(position.clone().add(backwardDir.clone().multiplyScalar(20)));
    
    // Left arrow (green)
    leftArrowRef.current.position.copy(position.clone().add(leftDir.clone().multiplyScalar(10)));
    leftArrowRef.current.lookAt(position.clone().add(leftDir.clone().multiplyScalar(20)));
    
    // Right arrow (yellow)
    rightArrowRef.current.position.copy(position.clone().add(rightDir.clone().multiplyScalar(10)));
    rightArrowRef.current.lookAt(position.clone().add(rightDir.clone().multiplyScalar(20)));
  });
  
  // Create an arrow shape
  const createArrow = (color: string) => (
    <group>
      {/* Arrow shaft */}
      <mesh position={[0, 0, -2]}>
        <cylinderGeometry args={[0.3, 0.3, 4, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      
      {/* Arrow head */}
      <mesh position={[0, 0, -5]}>
        <coneGeometry args={[1, 2, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      
      {/* No arrow label needed - using Text component instead */}
    </group>
  );
  
  return (
    <>
      {/* Forward Direction (W key) - Blue */}
      <group ref={forwardArrowRef} position={[0, 3, -10]}>
        {createArrow("#0088ff")}
        <Text
          position={[0, 2, -4]}
          color="#ffffff"
          fontSize={0.8}
          font="/fonts/Inter-Bold.woff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#0088ff"
        >
          W - Forward
        </Text>
      </group>
      
      {/* Backward Direction (S key) - Red */}
      <group ref={backwardArrowRef} position={[0, 3, 10]}>
        {createArrow("#ff3333")}
        <Text
          position={[0, 2, -4]}
          color="#ffffff"
          fontSize={0.8}
          font="/fonts/Inter-Bold.woff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#ff3333"
        >
          S - Backward
        </Text>
      </group>
      
      {/* Left Direction (A key) - Green */}
      <group ref={leftArrowRef} position={[-10, 3, 0]}>
        {createArrow("#33cc33")}
        <Text
          position={[0, 2, -4]}
          color="#ffffff"
          fontSize={0.8}
          font="/fonts/Inter-Bold.woff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#33cc33"
        >
          A - Left
        </Text>
      </group>
      
      {/* Right Direction (D key) - Yellow */}
      <group ref={rightArrowRef} position={[10, 3, 0]}>
        {createArrow("#ffcc00")}
        <Text
          position={[0, 2, -4]}
          color="#ffffff"
          fontSize={0.8}
          font="/fonts/Inter-Bold.woff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#ffcc00"
        >
          D - Right
        </Text>
      </group>
    </>
  );
};

export default DirectionIndicators;