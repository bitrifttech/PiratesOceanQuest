import * as THREE from "three";
import { useEnemies } from "../stores/useEnemies";
import { POSITION } from "../constants";

/**
 * Service for managing enemy ships in the game
 */
export class EnemyManager {
  /**
   * Spawns a single enemy at a fixed position
   * Used for testing and demo purposes
   */
  static spawnSingleEnemy(x: number, z: number): void {
    // Clear existing enemies to ensure we only have one
    useEnemies.getState().resetEnemies();
    
    // Create a position and rotation
    const fixedEnemyPosition = new THREE.Vector3(x, POSITION.SHIP_HEIGHT, z);
    const fixedEnemyRotation = new THREE.Euler(0, 0, 0);
    
    // Add the enemy directly to the store
    useEnemies.setState({
      enemies: [{
        id: 'fixed-enemy-ship',
        position: fixedEnemyPosition,
        rotation: fixedEnemyRotation,
        velocity: new THREE.Vector3(0, 0, 0),
        health: 100,
        maxHealth: 100
      }]
    });
    
    console.log(`[ENEMY] Spawned single enemy ship at (${x}, ${POSITION.SHIP_HEIGHT}, ${z})`);
  }
  
  /**
   * Spawns multiple enemies at random positions around the player
   */
  static spawnEnemies(count: number, playerPosition?: THREE.Vector3): void {
    // Use the store's built-in spawn function
    useEnemies.getState().spawnEnemies(count);
    
    console.log(`[ENEMY] Spawned ${count} enemy ships around player`);
  }
  
  /**
   * Removes all enemies from the game
   */
  static clearEnemies(): void {
    useEnemies.getState().resetEnemies();
    console.log("[ENEMY] Cleared all enemy ships");
  }
}