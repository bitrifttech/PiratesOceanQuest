import { useRef } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

interface CannonProps {
  position: [number, number, number];
  rotation: [number, number, number];
}

const Cannon = ({ position, rotation }: CannonProps) => {
  const cannonRef = useRef<THREE.Group>(null);
  const woodTexture = useTexture("/textures/wood.jpg");
  
  // Adjust texture settings
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(1, 1);
  
  return (
    <group ref={cannonRef} position={position} rotation={rotation}>
      {/* Cannon barrel */}
      <mesh castShadow position={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.4, 0.5, 2.5, 16]} />
        <meshStandardMaterial color="#111111" roughness={0.9} metalness={0.7} />
      </mesh>
      
      {/* Barrel rim front */}
      <mesh castShadow position={[0, 0, 1.4]}>
        <cylinderGeometry args={[0.6, 0.6, 0.2, 16]} />
        <meshStandardMaterial color="#222222" roughness={0.7} metalness={0.8} />
      </mesh>
      
      {/* Barrel rim back */}
      <mesh castShadow position={[0, 0, -1.0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.2, 16]} />
        <meshStandardMaterial color="#222222" roughness={0.7} metalness={0.8} />
      </mesh>
      
      {/* Cannon carriage (wooden base) */}
      <mesh position={[0, -0.7, 0]} castShadow>
        <boxGeometry args={[1.2, 0.4, 2.2]} />
        <meshStandardMaterial map={woodTexture} roughness={0.8} />
      </mesh>
      
      {/* Wheels - left front */}
      <mesh position={[-0.7, -0.9, 0.7]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />
        <meshStandardMaterial map={woodTexture} roughness={0.9} />
      </mesh>
      
      {/* Wheels - right front */}
      <mesh position={[0.7, -0.9, 0.7]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />
        <meshStandardMaterial map={woodTexture} roughness={0.9} />
      </mesh>
      
      {/* Wheels - left back */}
      <mesh position={[-0.7, -0.9, -0.7]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />
        <meshStandardMaterial map={woodTexture} roughness={0.9} />
      </mesh>
      
      {/* Wheels - right back */}
      <mesh position={[0.7, -0.9, -0.7]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />
        <meshStandardMaterial map={woodTexture} roughness={0.9} />
      </mesh>
    </group>
  );
};

export default Cannon;
