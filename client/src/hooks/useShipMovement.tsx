/**
 * useShipMovement Hook
 * 
 * Encapsulates ship movement, steering, and collision handling logic.
 * Extracted from Ship.tsx to follow Single Responsibility Principle.
 */

import { useRef } from "react";
import * as THREE from "three";
import { usePlayer } from "../lib/stores/usePlayer";
import { usePowerUps } from "../lib/stores/usePowerUps";
import { useShipEvents } from "../lib/stores/useShipEvents";
import { collisionHandler } from "../lib/services/CollisionHandler";
import { BVHCollisionService } from "../lib/services/BVHCollisionService";
import { MeshCollisionRegistry } from "../lib/services/MeshCollisionRegistry";
import { SHIP_PHYSICS, ENVIRONMENT } from "../lib/config/gameBalance";

// Controls interface for keyboard state
interface KeyState {
  forward: boolean;
  backward: boolean;
  leftward: boolean;
  rightward: boolean;
}

/**
 * Movement update result containing new position and velocity
 */
export interface MovementResult {
  newPosition: THREE.Vector3;
  newRotation: THREE.Euler;
  newVelocity: THREE.Vector3;
  hasCollision: boolean;
}

/**
 * Hook for handling ship movement physics and collision detection
 */
export function useShipMovement() {
  // Get player state
  const {
    position,
    rotation,
    velocity,
    setPosition,
    setRotation,
    setVelocity,
  } = usePlayer();

  // Ship events for crew animations
  const { playerNearCollision } = useShipEvents();

  // Collision state cache to prevent recalculation
  const lastCollisionRef = useRef<boolean>(false);

  /**
   * Update ship rotation based on input
   */
  function updateRotation(keys: KeyState, delta: number): THREE.Euler {
    let rotationDelta = 0;

    if (keys.leftward) {
      rotationDelta += SHIP_PHYSICS.ROTATION_SPEED * delta;
    }

    if (keys.rightward) {
      rotationDelta -= SHIP_PHYSICS.ROTATION_SPEED * delta;
    }

    const newRotation = new THREE.Euler(
      rotation.x,
      rotation.y + rotationDelta,
      rotation.z
    );

    setRotation(newRotation);
    return newRotation;
  }

  /**
   * Calculate movement direction based on rotation
   * Ship model is rotated 180 degrees, so we negate the direction
   */
  function getMovementDirection(yRotation: number): THREE.Vector3 {
    const direction = new THREE.Vector3(
      Math.sin(yRotation),
      0,
      Math.cos(yRotation)
    );
    // Negate to match ship's visual orientation
    direction.multiplyScalar(-1);
    return direction;
  }

  /**
   * Calculate acceleration based on input and power-ups
   */
  function calculateAcceleration(
    keys: KeyState,
    direction: THREE.Vector3,
    delta: number
  ): THREE.Vector3 {
    const acceleration = new THREE.Vector3(0, 0, 0);

    // Get power-up state
    const powerUpState = usePowerUps.getState();
    const hasSpeedBoost = powerUpState.hasPowerUp("speed_boost");
    const speedMultiplier = hasSpeedBoost
      ? (powerUpState.getPowerUpValue("speed_boost") || 1)
      : 1;

    if (keys.forward) {
      const forwardForce = direction
        .clone()
        .multiplyScalar(SHIP_PHYSICS.FORWARD_ACCELERATION * speedMultiplier * delta);
      acceleration.add(forwardForce);
    }

    if (keys.backward) {
      const backwardForce = direction
        .clone()
        .multiplyScalar(-SHIP_PHYSICS.BACKWARD_ACCELERATION * speedMultiplier * delta);
      acceleration.add(backwardForce);
    }

    return acceleration;
  }

  /**
   * Apply physics to calculate new velocity
   */
  function updateVelocity(acceleration: THREE.Vector3): THREE.Vector3 {
    const newVelocity = velocity
      .clone()
      .add(acceleration)
      .multiplyScalar(SHIP_PHYSICS.DRAG);

    setVelocity(newVelocity);
    return newVelocity;
  }

  /**
   * Check for collisions using BVH or legacy circle-based detection
   */
  function checkCollisions(
    currentPosition: THREE.Vector3,
    futurePosition: THREE.Vector3,
    shipRadius: number,
    safetyMargin: number
  ) {
    const useBVH = MeshCollisionRegistry.isInitialized();

    if (useBVH) {
      const currentCollision = BVHCollisionService.checkSphereCollision(
        currentPosition,
        shipRadius
      );
      const futureCollision = BVHCollisionService.checkSphereCollision(
        futurePosition,
        shipRadius + safetyMargin
      );

      return {
        useBVH: true,
        currentCollision,
        futureCollision,
        hasCurrentCollision: currentCollision?.isColliding ?? false,
        hasFutureCollision: futureCollision?.isColliding ?? false,
      };
    } else {
      const currentPositionCollision = collisionHandler.checkPointCollision(
        currentPosition,
        shipRadius
      );
      const futurePositionCollision = collisionHandler.checkPointCollision(
        futurePosition,
        shipRadius + safetyMargin
      );

      return {
        useBVH: false,
        currentPositionCollision,
        futurePositionCollision,
        hasCurrentCollision: !!currentPositionCollision,
        hasFutureCollision: !!futurePositionCollision,
      };
    }
  }

  /**
   * Handle BVH collision response
   */
  function handleBVHCollisionResponse(
    currentPosition: THREE.Vector3,
    activeCollision: ReturnType<typeof BVHCollisionService.checkSphereCollision>,
    isCurrentCollision: boolean,
    shipRadius: number,
    safetyMargin: number
  ): THREE.Vector3 {
    if (!activeCollision?.isColliding) {
      return currentPosition.clone();
    }

    if (isCurrentCollision) {
      // Already inside - push out
      const safePosition = BVHCollisionService.calculateSafePosition(
        currentPosition,
        activeCollision,
        shipRadius,
        safetyMargin + 5
      );
      safePosition.y = currentPosition.y;
      setVelocity(new THREE.Vector3(0, 0, 0));
      return safePosition;
    } else {
      // Future collision - deflect
      if (activeCollision.pushDirection) {
        const horizontalPushDirection = activeCollision.pushDirection.clone();
        horizontalPushDirection.y = 0;
        horizontalPushDirection.normalize();

        const deflectionVelocity = horizontalPushDirection
          .clone()
          .multiplyScalar(velocity.length() * 0.8);
        deflectionVelocity.y = 0;
        setVelocity(deflectionVelocity);

        const newPosition = currentPosition
          .clone()
          .add(horizontalPushDirection.clone().multiplyScalar(0.5));
        newPosition.y = currentPosition.y;
        return newPosition;
      }
      return currentPosition.clone();
    }
  }

  /**
   * Handle legacy circle-based collision response
   */
  function handleLegacyCollisionResponse(
    currentPosition: THREE.Vector3,
    currentPositionCollision: ReturnType<typeof collisionHandler.checkPointCollision>,
    futurePositionCollision: ReturnType<typeof collisionHandler.checkPointCollision>,
    shipRadius: number,
    safetyMargin: number
  ): THREE.Vector3 {
    const collidingFeature = currentPositionCollision || futurePositionCollision;

    if (!collidingFeature) {
      return currentPosition.clone();
    }

    const originalY = currentPosition.y;

    if (currentPositionCollision) {
      // Already inside - push out
      const safePosition = collisionHandler.calculateSafePosition(
        currentPosition,
        collidingFeature,
        shipRadius,
        safetyMargin + 10
      );
      safePosition.y = originalY;
      setVelocity(new THREE.Vector3(0, 0, 0));
      return safePosition;
    } else {
      // Future collision - deflect
      const toFeatureDirection = new THREE.Vector3()
        .subVectors(
          new THREE.Vector3(collidingFeature.x, 0, collidingFeature.z),
          currentPosition
        )
        .normalize();

      const deflectionAngle =
        Math.atan2(toFeatureDirection.x, toFeatureDirection.z) + Math.PI / 2;
      const deflectionDirection = new THREE.Vector3(
        Math.sin(deflectionAngle),
        0,
        Math.cos(deflectionAngle)
      ).normalize();

      const deflectionVelocity = deflectionDirection.multiplyScalar(
        velocity.length() * 0.8
      );
      setVelocity(deflectionVelocity);

      const newPosition = currentPosition
        .clone()
        .add(deflectionDirection.multiplyScalar(0.5));
      newPosition.y = originalY;
      return newPosition;
    }
  }

  /**
   * Clamp position to world boundaries
   */
  function clampToWorldBounds(pos: THREE.Vector3): THREE.Vector3 {
    const boundary = SHIP_PHYSICS.WORLD_BOUNDARY;
    pos.x = Math.max(-boundary, Math.min(boundary, pos.x));
    pos.z = Math.max(-boundary, Math.min(boundary, pos.z));
    return pos;
  }

  /**
   * Main movement update function - call this from useFrame
   */
  function updateMovement(keys: KeyState, delta: number): MovementResult {
    // Guard: position must be initialized
    if (!position) {
      return {
        newPosition: new THREE.Vector3(0, 0, 0),
        newRotation: rotation,
        newVelocity: velocity,
        hasCollision: false,
      };
    }

    const shipRadius = SHIP_PHYSICS.PLAYER_COLLISION_RADIUS;
    const safetyMargin = SHIP_PHYSICS.SAFETY_MARGIN;

    // 1. Update rotation
    const newRotation = updateRotation(keys, delta);

    // 2. Calculate movement direction
    const direction = getMovementDirection(newRotation.y);

    // 3. Calculate acceleration
    const acceleration = calculateAcceleration(keys, direction, delta);

    // 4. Update velocity
    const newVelocity = updateVelocity(acceleration);

    // 5. Calculate proposed future position
    const futurePosition = position.clone().add(
      newVelocity.clone().multiplyScalar(delta)
    );

    // 6. Check for collisions
    const collisionResult = checkCollisions(
      position,
      futurePosition,
      shipRadius,
      safetyMargin
    );

    const hasCurrentCollision = collisionResult.hasCurrentCollision;
    const hasFutureCollision = collisionResult.hasFutureCollision;
    const hasAnyCollision = hasCurrentCollision || hasFutureCollision;

    // Trigger crew response on future collision approach
    if (hasFutureCollision && !hasCurrentCollision && !lastCollisionRef.current) {
      playerNearCollision();
    }
    lastCollisionRef.current = hasAnyCollision;

    // 7. Calculate final position
    let newPosition: THREE.Vector3;

    if (hasAnyCollision) {
      if (collisionResult.useBVH) {
        const activeCollision = hasCurrentCollision
          ? collisionResult.currentCollision
          : collisionResult.futureCollision;

        newPosition = handleBVHCollisionResponse(
          position,
          activeCollision!,
          hasCurrentCollision,
          shipRadius,
          safetyMargin
        );
      } else {
        newPosition = handleLegacyCollisionResponse(
          position,
          collisionResult.currentPositionCollision!,
          collisionResult.futurePositionCollision!,
          shipRadius,
          safetyMargin
        );
      }
    } else {
      newPosition = clampToWorldBounds(futurePosition);
    }

    // 8. Update position in store
    setPosition(newPosition);

    return {
      newPosition,
      newRotation,
      newVelocity,
      hasCollision: hasAnyCollision,
    };
  }

  return {
    position,
    rotation,
    velocity,
    updateMovement,
  };
}
