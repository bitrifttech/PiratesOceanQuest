/**
 * CannonService
 * 
 * Handles cannon position calculations and firing geometry.
 * Extracted from Ship.tsx to follow Single Responsibility Principle.
 */

import * as THREE from "three";
import { WEAPONS } from "../config/gameBalance";

// Cannon position configuration
export interface CannonPosition {
  deckHeight: number;
  rightOffset: number;
  leftOffset: number;
  zOffset: number;
  side?: "right" | "left";
}

// Cannonball spawn data
export interface CannonballSpawn {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
}

// Cannon configuration constants
const CANNON_CONFIG = {
  DECK_HEIGHT: 0.8,
  SHIP_HALF_WIDTH: 3.5,
  SHIP_LENGTH: 14.0,
  CANNON_COUNT: 20,
  RIGHT_OFFSET: 2.5,
  LEFT_OFFSET: 2.5,
  UPWARD_ANGLE: 0.15,
  SPREAD_ANGLE: 0.2,
} as const;

/**
 * Service for calculating cannon positions and firing directions
 */
export class CannonService {
  private static cannonIdCounter = 0;

  /**
   * Generate the next cannon ball ID
   */
  static getNextId(): number {
    return ++this.cannonIdCounter;
  }

  /**
   * Reset the ID counter (useful for testing)
   */
  static resetIdCounter(): void {
    this.cannonIdCounter = 0;
  }

  /**
   * Generate all possible cannon positions along the ship
   */
  static generateCannonPositions(): CannonPosition[] {
    const cannonPositions: CannonPosition[] = [];
    const { DECK_HEIGHT, SHIP_LENGTH, CANNON_COUNT, RIGHT_OFFSET, LEFT_OFFSET } = CANNON_CONFIG;

    // Generate positions from front to back
    for (let i = 0; i < CANNON_COUNT; i++) {
      const zOffset = -SHIP_LENGTH / 2 + (SHIP_LENGTH * i) / (CANNON_COUNT - 1);
      cannonPositions.push({
        deckHeight: DECK_HEIGHT,
        rightOffset: RIGHT_OFFSET,
        leftOffset: LEFT_OFFSET,
        zOffset,
      });
    }

    return cannonPositions;
  }

  /**
   * Select cannon positions for firing (front, middle, back on each side)
   */
  static selectFiringPositions(
    allPositions: CannonPosition[],
    hasTripleShot: boolean
  ): CannonPosition[] {
    const selectedPositions: CannonPosition[] = [];

    // Fixed positions at front, middle, and back
    const sideIndices = [
      0, // Front of ship
      Math.floor(allPositions.length / 2), // Middle of ship
      allPositions.length - 1, // Back of ship
    ];

    // If triple shot is active, add more firing positions
    if (hasTripleShot) {
      sideIndices.push(
        Math.floor(allPositions.length / 4), // Between front and middle
        Math.floor(allPositions.length * 0.75) // Between middle and back
      );
    }

    // Add right side positions
    sideIndices.forEach((index) => {
      selectedPositions.push({
        ...allPositions[index],
        side: "right",
      });
    });

    // Add left side positions
    sideIndices.forEach((index) => {
      selectedPositions.push({
        ...allPositions[index],
        side: "left",
      });
    });

    return selectedPositions;
  }

  /**
   * Determine cannon position type based on z offset
   */
  static getCannonPositionType(
    zOffset: number
  ): "front" | "middle" | "back" {
    if (zOffset < -2) return "front";
    if (zOffset > 2) return "back";
    return "middle";
  }

  /**
   * Calculate cannonball spawn position and direction for a right-side cannon
   */
  static calculateRightCannonSpawn(
    shipPosition: THREE.Vector3,
    direction: THREE.Vector3,
    cannonPosition: CannonPosition
  ): CannonballSpawn {
    const { SHIP_HALF_WIDTH, UPWARD_ANGLE, SPREAD_ANGLE } = CANNON_CONFIG;
    const positionType = this.getCannonPositionType(cannonPosition.zOffset);

    // Fixed position on right side of ship
    const rightPos = new THREE.Vector3(
      shipPosition.x + direction.z * SHIP_HALF_WIDTH,
      cannonPosition.deckHeight,
      shipPosition.z - direction.x * SHIP_HALF_WIDTH
    );

    // Create spread angles based on cannon position
    const horizontalSpreadAngle =
      positionType === "front"
        ? -SPREAD_ANGLE
        : positionType === "back"
        ? SPREAD_ANGLE
        : 0;

    // Base direction is directly outward from the side
    const baseDir = new THREE.Vector3(
      -direction.z,
      UPWARD_ANGLE,
      direction.x
    ).normalize();

    // Apply the spread angle for fan effect
    const spreadMatrix = new THREE.Matrix4().makeRotationY(horizontalSpreadAngle);
    const finalDir = baseDir.clone().applyMatrix4(spreadMatrix).normalize();

    return {
      id: this.getNextId(),
      position: rightPos,
      direction: finalDir,
    };
  }

  /**
   * Calculate cannonball spawn position and direction for a left-side cannon
   */
  static calculateLeftCannonSpawn(
    shipPosition: THREE.Vector3,
    direction: THREE.Vector3,
    cannonPosition: CannonPosition
  ): CannonballSpawn {
    const { SHIP_HALF_WIDTH, UPWARD_ANGLE, SPREAD_ANGLE } = CANNON_CONFIG;
    const positionType = this.getCannonPositionType(cannonPosition.zOffset);

    // Fixed position on left side of ship
    const leftPos = new THREE.Vector3(
      shipPosition.x - direction.z * SHIP_HALF_WIDTH,
      cannonPosition.deckHeight,
      shipPosition.z + direction.x * SHIP_HALF_WIDTH
    );

    // Create spread angles based on cannon position
    const horizontalSpreadAngle =
      positionType === "front"
        ? SPREAD_ANGLE
        : positionType === "back"
        ? -SPREAD_ANGLE
        : 0;

    // Base direction is directly outward from the side
    const baseDir = new THREE.Vector3(
      direction.z,
      UPWARD_ANGLE,
      -direction.x
    ).normalize();

    // Apply the spread angle for fan effect
    const spreadMatrix = new THREE.Matrix4().makeRotationY(horizontalSpreadAngle);
    const finalDir = baseDir.clone().applyMatrix4(spreadMatrix).normalize();

    return {
      id: this.getNextId(),
      position: leftPos,
      direction: finalDir,
    };
  }

  /**
   * Calculate all cannonball spawns for a broadside
   */
  static calculateBroadsideSpawns(
    shipPosition: THREE.Vector3,
    rotation: THREE.Euler,
    hasTripleShot: boolean
  ): CannonballSpawn[] {
    const spawns: CannonballSpawn[] = [];

    // Calculate movement direction (ship model is rotated 180 degrees)
    const direction = new THREE.Vector3(
      -Math.sin(rotation.y),
      0,
      -Math.cos(rotation.y)
    );

    // Get all cannon positions
    const allPositions = this.generateCannonPositions();

    // Select firing positions
    const firingPositions = this.selectFiringPositions(allPositions, hasTripleShot);

    // Calculate spawn for each position
    firingPositions.forEach((cannonPos) => {
      if (cannonPos.side === "right") {
        spawns.push(
          this.calculateRightCannonSpawn(shipPosition, direction, cannonPos)
        );
      } else {
        spawns.push(
          this.calculateLeftCannonSpawn(shipPosition, direction, cannonPos)
        );
      }
    });

    return spawns;
  }
}
