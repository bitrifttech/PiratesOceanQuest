import * as THREE from "three";

// Generate a procedural ocean mesh with waves
export function createOceanMesh(
  size: number = 1000, 
  segments: number = 128, 
  waveHeight: number = 1.0
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  
  // Rotate to horizontal plane
  geometry.rotateX(-Math.PI / 2);
  
  // Access position attribute and create waves
  const positions = geometry.attributes.position.array;
  
  // Create waves based on sine/cosine function
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    
    // Create wave patterns
    positions[i + 1] = 
      Math.sin(x / 20) * Math.cos(z / 20) * waveHeight;
  }
  
  // Update the geometry
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
}

// Animate ocean waves over time
export function animateOceanWaves(
  geometry: THREE.BufferGeometry, 
  time: number, 
  waveHeight: number = 1.0
): void {
  const positions = geometry.attributes.position.array;
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    
    // Animate waves over time
    positions[i + 1] = 
      Math.sin(x / 20 + time) * 
      Math.cos(z / 20 + time) * waveHeight;
  }
  
  // Update the geometry
  geometry.attributes.position.needsUpdate = true;
  
  // No need to recompute normals every frame for performance
  // Only do this if wave appearance is more important than performance
  // geometry.computeVertexNormals();
}

// Generate positions for islands in the ocean
export function generateIslandPositions(
  count: number = 10, 
  bounds: { min: number, max: number } = { min: -400, max: 400 },
  minDistance: number = 50
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  
  // Place random islands making sure they're not too close to each other
  for (let i = 0; i < count; i++) {
    let validPosition = false;
    let position = new THREE.Vector3();
    
    // Try to find a valid position
    let attempts = 0;
    while (!validPosition && attempts < 100) {
      position = new THREE.Vector3(
        Math.random() * (bounds.max - bounds.min) + bounds.min,
        0,
        Math.random() * (bounds.max - bounds.min) + bounds.min
      );
      
      // Check distance from other islands
      validPosition = true;
      for (const existingPosition of positions) {
        if (position.distanceTo(existingPosition) < minDistance) {
          validPosition = false;
          break;
        }
      }
      
      attempts++;
    }
    
    if (validPosition) {
      positions.push(position);
    }
  }
  
  return positions;
}
