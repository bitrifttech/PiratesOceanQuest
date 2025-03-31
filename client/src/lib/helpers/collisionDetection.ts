import * as THREE from "three";

// Check collision between two objects with radii
export function checkCollision(
  position1: THREE.Vector3,
  position2: THREE.Vector3,
  radius1: number,
  radius2: number
): boolean {
  // Calculate distance between objects (ignoring Y-axis)
  const distance = new THREE.Vector2(position1.x, position1.z)
    .distanceTo(new THREE.Vector2(position2.x, position2.z));
  
  // Check if distance is less than combined radii
  return distance < (radius1 + radius2);
}

// Check if object is inside bounds
export function checkBounds(
  position: THREE.Vector3,
  bounds: { min: number, max: number } = { min: -500, max: 500 }
): boolean {
  return (
    position.x >= bounds.min &&
    position.x <= bounds.max &&
    position.z >= bounds.min &&
    position.z <= bounds.max
  );
}

// Constrain position within bounds
export function constrainToBounds(
  position: THREE.Vector3,
  bounds: { min: number, max: number } = { min: -500, max: 500 }
): THREE.Vector3 {
  return new THREE.Vector3(
    Math.max(bounds.min, Math.min(bounds.max, position.x)),
    position.y,
    Math.max(bounds.min, Math.min(bounds.max, position.z))
  );
}

// Check if ray intersects with an object (simplified)
export function checkRayIntersection(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  targetPosition: THREE.Vector3,
  targetRadius: number,
  maxDistance: number = 100
): boolean {
  // Normalize direction
  const rayDirection = direction.clone().normalize();
  
  // Calculate vector to target
  const toTarget = targetPosition.clone().sub(origin);
  
  // Calculate distance along ray to closest point to target
  const projectedDistance = toTarget.dot(rayDirection);
  
  // If target is behind ray origin or too far, no intersection
  if (projectedDistance < 0 || projectedDistance > maxDistance) {
    return false;
  }
  
  // Calculate closest point on ray to target
  const closestPoint = origin.clone().add(
    rayDirection.clone().multiplyScalar(projectedDistance)
  );
  
  // Calculate distance from closest point to target center
  const distanceToTarget = closestPoint.distanceTo(targetPosition);
  
  // Check if this distance is less than target radius
  return distanceToTarget <= targetRadius;
}
