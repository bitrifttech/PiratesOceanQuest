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

// Check if player has input for ship boarding
export function checkBoardingInput(
  boardKey: boolean,
  playerPosition: THREE.Vector3,
  enemyPosition: THREE.Vector3,
  enemyHealth: number,
  maxBoardingDistance: number = 15,
  enemyHealthThreshold: number = 30
): boolean {
  if (!boardKey) return false;
  
  // Calculate distance to enemy
  const distance = playerPosition.distanceTo(enemyPosition);
  
  // Check if enemy is close enough and weak enough to board
  return (
    distance < maxBoardingDistance &&
    enemyHealth < enemyHealthThreshold
  );
}

// Calculate success chance for boarding
export function calculateBoardingSuccess(
  enemyHealth: number,
  playerHullLevel: number
): boolean {
  // Base chance depends on enemy health (lower health = higher chance)
  const baseChance = (100 - enemyHealth) / 100;
  
  // Bonus from hull level (each level adds 5% chance)
  const hullBonus = playerHullLevel * 0.05;
  
  // Calculate final chance (capped at 95%)
  const successChance = Math.min(0.95, baseChance + hullBonus);
  
  // Determine success
  return Math.random() < successChance;
}
