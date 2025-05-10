import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { EnvironmentFeature } from './Environment';
import { getFeatureRadius } from '../lib/collision';

interface CollisionBoundaryVisualizerProps {
  features: EnvironmentFeature[];
  visible?: boolean;
}

/**
 * Renders visual representations of collision boundaries for all environmental features
 * This is a debug component to help visualize where collisions will occur
 */
const CollisionBoundaryVisualizer: React.FC<CollisionBoundaryVisualizerProps> = ({ 
  features, 
  visible = true 
}) => {
  const circlesRef = useRef<THREE.Group>(null);

  // Update the visualizer when features change
  useEffect(() => {
    const group = circlesRef.current;
    if (!group) return;
    
    // Clear existing circles
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    
    // Create new circles for each feature
    features.forEach(feature => {
      const radius = getFeatureRadius(feature.type, feature.scale);
      
      // Create a circle geometry
      const segments = 32;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array((segments + 1) * 3);
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = 0.05; // Slightly above ground
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      // Create line material based on feature type
      const color = feature.type === 'mountain' ? 0xff0000 : 
                    feature.type === 'tropical' ? 0x00ff00 : 
                    0x0000ff;
                    
      const material = new THREE.LineBasicMaterial({ 
        color, 
        linewidth: 2,
        transparent: true,
        opacity: 0.7
      });
      
      // Create line loop
      const circle = new THREE.LineLoop(geometry, material);
      circle.position.set(feature.x, 0, feature.z);
      circle.rotation.x = Math.PI / 2; // Rotate to lay flat on the ground
      
      // Add to the group
      group.add(circle);
    });
    
    console.log(`[COLLISION DEBUG] Created ${features.length} collision boundaries`);
  }, [features]);
  
  // Pulse the circles to make them more visible
  useFrame(({ clock }) => {
    if (!circlesRef.current || !visible) return;
    
    const opacity = 0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    
    // Safely iterate through children
    for (let i = 0; i < circlesRef.current.children.length; i++) {
      const child = circlesRef.current.children[i];
      if (child instanceof THREE.LineLoop) {
        const material = child.material;
        if (material instanceof THREE.LineBasicMaterial) {
          material.opacity = opacity;
        }
      }
    }
  });
  
  return (
    <group ref={circlesRef} visible={visible} />
  );
};

export default CollisionBoundaryVisualizer;