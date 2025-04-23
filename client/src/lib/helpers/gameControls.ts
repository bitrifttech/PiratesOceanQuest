import * as THREE from "three";
import { useKeyboardControls } from "@react-three/drei";
import { Controls } from "../../App";

// Calculate ship movement based on input
export function calculateShipMovement(
  forward: boolean,
  backward: boolean,
  leftward: boolean,
  rightward: boolean,
  currentRotation: THREE.Euler,
  currentVelocity: THREE.Vector3,
  speedMultiplier: number = 1,
  delta: number
): {
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
} {
  // Calculate rotation change
  let rotationDelta = 0;
  if (leftward) rotationDelta += 1 * delta;
  if (rightward) rotationDelta -= 1 * delta;
  
  // Update rotation
  const newRotation = new THREE.Euler(
    currentRotation.x,
    currentRotation.y + rotationDelta,
    currentRotation.z
  );
  
  // Calculate direction based on rotation
  const direction = new THREE.Vector3(
    Math.sin(newRotation.y),
    0,
    Math.cos(newRotation.y)
  );
  
  // Calculate acceleration from inputs
  const acceleration = new THREE.Vector3(0, 0, 0);
  const forwardForce = 5 * speedMultiplier;
  const backwardForce = 2 * speedMultiplier;
  
  if (forward) acceleration.add(direction.clone().multiplyScalar(forwardForce * delta));
  if (backward) acceleration.add(direction.clone().multiplyScalar(-backwardForce * delta));
  
  // Update velocity with acceleration and apply drag
  const drag = 0.95; // Adjust for faster/slower deceleration
  const newVelocity = currentVelocity.clone()
    .add(acceleration)
    .multiplyScalar(drag);
  
  return {
    rotation: newRotation,
    velocity: newVelocity,
  };
}

// Boarding functions removed
