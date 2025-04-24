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
  
  // Refs for the text holders that will face the camera
  const forwardTextRef = useRef<THREE.Group>(null);
  const backwardTextRef = useRef<THREE.Group>(null);
  const leftTextRef = useRef<THREE.Group>(null);
  const rightTextRef = useRef<THREE.Group>(null);
  
  // Update arrow positions to match ship position and rotation
  useFrame(({ camera }) => {
    if (!position || !rotation || 
        !forwardArrowRef.current || !backwardArrowRef.current || 
        !leftArrowRef.current || !rightArrowRef.current ||
        !forwardTextRef.current || !backwardTextRef.current ||
        !leftTextRef.current || !rightTextRef.current) {
      return;
    }
    
    // Calculate the ship's direction vectors based on its rotation
    // Ship model has Math.PI rotation, so it points opposite to where it visually faces
    // We need to negate the direction to match visual orientation
    const forwardDir = new THREE.Vector3(
      Math.sin(rotation.y),
      0,
      Math.cos(rotation.y)
    ).multiplyScalar(-1); // Must negate since ship is rotated by Math.PI
    
    // Backward vector (opposite of forward)
    const backwardDir = forwardDir.clone().multiplyScalar(-1);
    
    // Calculate the right vector (perpendicular to forward)
    // Rotate the forward vector by 90 degrees clockwise around Y axis
    const rightDir = new THREE.Vector3(forwardDir.z, 0, -forwardDir.x);
    
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
    
    // Make all text elements face the camera
    const makeTextFaceCamera = (textRef: THREE.Group) => {
      // Calculate direction from text to camera
      const lookAtPos = new THREE.Vector3();
      camera.getWorldPosition(lookAtPos);
      
      // Make text group face camera
      textRef.lookAt(lookAtPos);
    };
    
    // Update all text elements to face camera
    makeTextFaceCamera(forwardTextRef.current);
    makeTextFaceCamera(backwardTextRef.current);
    makeTextFaceCamera(leftTextRef.current);
    makeTextFaceCamera(rightTextRef.current);
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
    </group>
  );
  
  // Text label component
  const DirectionText = ({ text, color, textRef }: 
    { text: string, color: string, textRef: React.RefObject<THREE.Group> }) => (
    <group ref={textRef} position={[0, 3, 0]}>
      <Text
        position={[0, 0, 0]}
        color="#ffffff"
        fontSize={1.2}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor={color}
      >
        {text}
      </Text>
    </group>
  );
  
  return (
    <>
      {/* Forward Direction (W key) - Blue */}
      <group ref={forwardArrowRef} position={[0, 3, -10]}>
        {createArrow("#0088ff")}
        <DirectionText text="W - Forward" color="#0088ff" textRef={forwardTextRef} />
      </group>
      
      {/* Backward Direction (S key) - Red */}
      <group ref={backwardArrowRef} position={[0, 3, 10]}>
        {createArrow("#ff3333")}
        <DirectionText text="S - Backward" color="#ff3333" textRef={backwardTextRef} />
      </group>
      
      {/* Left Direction (A key) - Green */}
      <group ref={leftArrowRef} position={[-10, 3, 0]}>
        {createArrow("#33cc33")}
        <DirectionText text="A - Left" color="#33cc33" textRef={leftTextRef} />
      </group>
      
      {/* Right Direction (D key) - Yellow */}
      <group ref={rightArrowRef} position={[10, 3, 0]}>
        {createArrow("#ffcc00")}
        <DirectionText text="D - Right" color="#ffcc00" textRef={rightTextRef} />
      </group>
    </>
  );
};

export default DirectionIndicators;