import { useRef } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

interface IslandProps {
  position: [number, number, number];
  scale?: number;
}

const Island = ({ position, scale = 1 }: IslandProps) => {
  const islandRef = useRef<THREE.Group>(null);
  
  // Textures
  const sandTexture = useTexture("/textures/sand.jpg");
  const grassTexture = useTexture("/textures/grass.png");
  
  // Pre-calculate positions for trees and rocks
  const treePositions = [
    { pos: [2, 3, 3], scale: 1.2 },
    { pos: [-3, 3, 2], scale: 0.9 },
    { pos: [0, 3, -3], scale: 1.1 },
    { pos: [-2, 3, -1], scale: 0.8 },
    { pos: [3, 3, -2], scale: 1.0 },
  ];
  
  const rockPositions = [
    { pos: [3, 1.5, 0], scale: 0.8, rotation: 0.2 },
    { pos: [-3, 1.5, -3], scale: 0.6, rotation: 0.8 },
    { pos: [0, 1.5, 4], scale: 1.1, rotation: 0.4 },
  ];
  
  return (
    <group ref={islandRef} position={position} scale={scale}>
      {/* Island base */}
      <mesh position={[0, -2, 0]} receiveShadow>
        <cylinderGeometry args={[10, 12, 2, 32]} />
        <meshStandardMaterial
          map={sandTexture}
          color="#e0c9a6"
          roughness={0.9}
        />
      </mesh>
      
      {/* Main island */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[8, 10, 4, 32]} />
        <meshStandardMaterial
          map={sandTexture}
          color="#e0c9a6"
          roughness={0.9}
        />
      </mesh>
      
      {/* Grass area */}
      <mesh position={[0, 2.05, 0]} receiveShadow>
        <cylinderGeometry args={[7, 8, 0.1, 32]} />
        <meshStandardMaterial
          map={grassTexture}
          color="#4CAF50"
          roughness={0.8}
        />
      </mesh>
      
      {/* Trees */}
      {treePositions.map((tree, index) => (
        <group key={`tree-${index}`} position={tree.pos} scale={tree.scale}>
          {/* Trunk */}
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.4, 2, 8]} />
            <meshStandardMaterial color="#5D4037" roughness={0.9} />
          </mesh>
          
          {/* Leaves */}
          <mesh position={[0, 2, 0]} castShadow>
            <coneGeometry args={[1.5, 3, 8]} />
            <meshStandardMaterial color="#2E7D32" roughness={0.8} />
          </mesh>
        </group>
      ))}
      
      {/* Rocks */}
      {rockPositions.map((rock, index) => (
        <mesh 
          key={`rock-${index}`} 
          position={rock.pos}
          rotation={[rock.rotation, rock.rotation * 2, rock.rotation / 2]}
          scale={rock.scale}
          castShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#9E9E9E" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

export default Island;
