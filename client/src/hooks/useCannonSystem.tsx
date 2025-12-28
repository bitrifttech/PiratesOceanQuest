/**
 * useCannonSystem Hook
 * 
 * Manages cannon firing state, cooldowns, and cannonball/effect tracking.
 * Extracted from Ship.tsx to follow Single Responsibility Principle.
 */

import { useRef, useCallback } from "react";
import * as THREE from "three";
import { usePlayer } from "../lib/stores/usePlayer";
import { usePowerUps } from "../lib/stores/usePowerUps";
import { useShipEvents } from "../lib/stores/useShipEvents";
import { useAudio } from "../lib/stores/useAudio";
import { CannonService, CannonballSpawn } from "../lib/services/CannonService";

// Types for tracking cannonballs and effects
export interface CannonballInfo {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
}

export interface CannonFireEffectInfo {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
}

// Constants
const CANNONBALL_SPEED = 40;
const CANNONBALL_MAX_RANGE = 100;
const FIRE_EFFECT_LIFETIME = 0.5; // seconds

/**
 * Hook for managing the ship's cannon system
 */
export function useCannonSystem() {
  // Player state
  const { position, rotation, cannonReady, fireCannon } = usePlayer();

  // Ship events for crew animations
  const { firePlayerCannons } = useShipEvents();

  // Cannonball and effect tracking
  const cannonballs = useRef<CannonballInfo[]>([]);
  const cannonFireEffects = useRef<CannonFireEffectInfo[]>([]);

  /**
   * Fire all cannons in a broadside
   */
  const fireAllCannons = useCallback(() => {
    if (!cannonReady || !position) return;

    // Mark cannon as fired (starts cooldown)
    fireCannon();

    // Trigger crew firing animation
    firePlayerCannons();

    // Play cannon sound
    const { playHit } = useAudio.getState();
    if (playHit) {
      playHit();
    }

    // Check for triple shot power-up
    const hasTripleShot = usePowerUps.getState().hasPowerUp("triple_shot");

    // Calculate all cannonball spawns
    const spawns = CannonService.calculateBroadsideSpawns(
      position,
      rotation,
      hasTripleShot
    );

    // Add cannonballs and fire effects
    spawns.forEach((spawn) => {
      cannonballs.current.push({
        id: spawn.id,
        position: spawn.position.clone(),
        direction: spawn.direction.clone(),
      });

      cannonFireEffects.current.push({
        id: CannonService.getNextId(),
        position: spawn.position.clone(),
        direction: spawn.direction.clone(),
      });
    });
  }, [cannonReady, position, rotation, fireCannon, firePlayerCannons]);

  /**
   * Update cannonballs - move them and remove expired ones
   * Call this from useFrame
   */
  const updateCannonballs = useCallback(
    (delta: number) => {
      if (!position) return;

      cannonballs.current = cannonballs.current.filter((ball) => {
        // Move the cannonball
        ball.position.add(
          ball.direction.clone().multiplyScalar(CANNONBALL_SPEED * delta)
        );

        // Remove if below grid level
        if (ball.position.y < 0) {
          return false;
        }

        // Remove if out of range
        if (ball.position.distanceTo(position) > CANNONBALL_MAX_RANGE) {
          return false;
        }

        return true;
      });
    },
    [position]
  );

  /**
   * Update fire effects - remove expired ones
   * Call this from useFrame
   */
  const updateFireEffects = useCallback(() => {
    const now = Date.now();
    const lifetimeMs = FIRE_EFFECT_LIFETIME * 1000;

    cannonFireEffects.current = cannonFireEffects.current.filter((effect) => {
      return now - effect.id < lifetimeMs;
    });
  }, []);

  return {
    fireAllCannons,
    updateCannonballs,
    updateFireEffects,
    // Expose refs for rendering
    cannonballsRef: cannonballs,
    fireEffectsRef: cannonFireEffects,
  };
}
