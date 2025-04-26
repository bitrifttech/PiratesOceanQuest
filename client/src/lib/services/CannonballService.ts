import * as THREE from "three";
import { EnvironmentFeature } from "../../components/Environment";
import { collisionHandler } from "./CollisionHandler";
import { useEnemies } from "../stores/useEnemies";
import { usePlayer } from "../stores/usePlayer";

/**
 * Manages cannonball physics, collisions, and effects
 */
export class CannonballService {
  /**
   * Checks if a cannonball hits any environment feature
   * @returns The hit feature or null if no hit
   */
  static checkEnvironmentCollision(
    position: THREE.Vector3,
    radius: number = 1
  ): EnvironmentFeature | null {
    return collisionHandler.checkPointCollision(position, radius);
  }
  
  /**
   * Checks if a cannonball hits a specific ship
   * @returns true if hit
   */
  static checkShipCollision(
    cannonballPosition: THREE.Vector3,
    shipPosition: THREE.Vector3,
    cannonballRadius: number = 1,
    shipRadius: number = 5
  ): boolean {
    const distance = cannonballPosition.distanceTo(shipPosition);
    return distance < (cannonballRadius + shipRadius);
  }
  
  /**
   * Checks if a cannonball from the player hits any enemy ship
   * @returns true if an enemy was hit
   */
  static checkEnemyHits(
    cannonballPosition: THREE.Vector3,
    cannonballRadius: number = 1,
    damageAmount: number = 10
  ): boolean {
    const enemies = useEnemies.getState().enemies;
    const damageEnemy = useEnemies.getState().damageEnemy;
    
    for (const enemy of enemies) {
      if (this.checkShipCollision(
        cannonballPosition,
        enemy.position,
        cannonballRadius
      )) {
        console.log(`[CANNON] Hit enemy ship ${enemy.id}`);
        damageEnemy(enemy.id, damageAmount);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Checks if a cannonball from an enemy hits the player
   * @returns true if player was hit
   */
  static checkPlayerHit(
    cannonballPosition: THREE.Vector3,
    cannonballRadius: number = 1,
    damageAmount: number = 10
  ): boolean {
    const playerPosition = usePlayer.getState().position;
    const takeDamage = usePlayer.getState().takeDamage;
    
    if (!playerPosition) return false;
    
    if (this.checkShipCollision(
      cannonballPosition,
      playerPosition,
      cannonballRadius
    )) {
      console.log(`[CANNON] Player ship hit!`);
      takeDamage(damageAmount);
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculates the appropriate trajectory for a new cannonball
   * @param origin Starting position
   * @param shipDirection Ship's facing direction
   * @param side Which side of the ship ('left' or 'right')
   * @param variation Angle variation (front/middle/back cannon position)
   * @returns The direction vector
   */
  static calculateCannonballTrajectory(
    origin: THREE.Vector3,
    shipDirection: THREE.Vector3,
    side: 'left' | 'right',
    variation: 'front' | 'middle' | 'back' = 'middle'
  ): THREE.Vector3 {
    // Base vector perpendicular to ship direction
    let baseDirection: THREE.Vector3;
    
    if (side === 'right') {
      // Right side - perpendicular in positive direction
      baseDirection = new THREE.Vector3(
        shipDirection.z,
        0.15, // Slight upward arc
        -shipDirection.x
      ).normalize();
    } else {
      // Left side - perpendicular in negative direction
      baseDirection = new THREE.Vector3(
        -shipDirection.z,
        0.15, // Slight upward arc
        shipDirection.x
      ).normalize();
    }
    
    // Apply variation based on cannon position
    let angleVariation = 0;
    
    if (variation === 'front') {
      // Front cannons angle slightly forward
      angleVariation = side === 'right' ? -0.2 : 0.2;
    } else if (variation === 'back') {
      // Back cannons angle slightly backward
      angleVariation = side === 'right' ? 0.2 : -0.2;
    }
    
    // Apply rotation if needed
    if (angleVariation !== 0) {
      const spreadMatrix = new THREE.Matrix4().makeRotationY(angleVariation);
      baseDirection.applyMatrix4(spreadMatrix);
    }
    
    return baseDirection.normalize();
  }
}