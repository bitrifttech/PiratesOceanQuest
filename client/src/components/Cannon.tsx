import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CannonProps {
  position: [number, number, number];
  rotation: [number, number, number];
}

const Cannon = ({ position, rotation }: CannonProps) => {
  const cannonRef = useRef<THREE.Group>(null);
  
  return (
    <group ref={cannonRef} position={position} rotation={rotation}>
      {/* Cannon barrel */}
      <mesh castShadow>
        <cylinderGeometry args={[0.4, 0.5, 2, 12]} />
        <meshStandardMaterial color="#333333" roughness={0.7} />
      </mesh>
      
      {/* Cannon base */}
      <mesh position={[0, -0.5, 0]} castShadow>
        <boxGeometry args={[1, 0.5, 1.5]} />
        <meshStandardMaterial color="#5D4037" roughness={0.8} />
      </mesh>
    </group>
  );
};

export default Cannon;
