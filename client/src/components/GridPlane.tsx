import React from 'react';
import { Grid } from '@react-three/drei';
import { STATIC } from '../lib/constants';

interface GridPlaneProps {
  size?: number;
  divisions?: number;
  cellSize?: number;
  cellThickness?: number;
  cellColor?: string;
  sectionSize?: number;
  sectionThickness?: number;
  sectionColor?: string;
}

/**
 * A flat grid plane component that replaces the water
 * Used as a reference for aligning all scene elements consistently
 */
const GridPlane: React.FC<GridPlaneProps> = ({
  size = 500,
  divisions = 100,
  cellSize = 10,
  cellThickness = 0.5,
  cellColor = '#444444',
  sectionSize = 50,
  sectionThickness = 1,
  sectionColor = '#888888'
}) => {
  return (
    <>
      {/* The Grid is a drei helper that creates a grid on the ground */}
      <Grid
        position={[0, STATIC.WATER_LEVEL, 0]} // Position at our water level reference
        args={[size, size, divisions, divisions]}
        cellSize={cellSize}
        cellThickness={cellThickness}
        cellColor={cellColor}
        sectionSize={sectionSize}
        sectionThickness={sectionThickness}
        sectionColor={sectionColor}
        infiniteGrid={true}
        fadeDistance={size}
      />
      
      {/* Add a transparent plane at the same level for collisions/shadows */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, STATIC.WATER_LEVEL, 0]}
        receiveShadow
      >
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial 
          color="#222222" 
          transparent={true} 
          opacity={0.1} 
          roughness={0.8}
        />
      </mesh>
    </>
  );
};

export default GridPlane;