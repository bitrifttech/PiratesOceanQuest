import * as THREE from "three";
import { useEnemies } from "../stores/useEnemies";
import { usePlayer } from "../stores/usePlayer";
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
   * Spawns an enemy ship very close to the player for testing purposes
   */
  static spawnTestEnemyNearPlayer(): void {
    // Clear existing enemies to ensure we only have one
    useEnemies.getState().resetEnemies();
    
    // Get player position
    const playerPos = usePlayer.getState().position;
    
    if (!playerPos) {
      console.error("[ENEMY] Cannot spawn test enemy - player position is undefined");
      return;
    }
    
    // Create a position offset from player (15 units in front)
    const playerRotation = usePlayer.getState().rotation;
    const angleY = playerRotation?.y || 0;
    
    // Calculate direction vector in front of player
    const offsetX = Math.sin(angleY) * -15; // Negative because ship faces -Z
    const offsetZ = Math.cos(angleY) * -15;
    
    const enemyPosition = new THREE.Vector3(
      playerPos.x + offsetX,
      POSITION.SHIP_HEIGHT,
      playerPos.z + offsetZ
    );
    
    // Face toward player
    const angleToPlayer = Math.atan2(
      playerPos.x - enemyPosition.x,
      playerPos.z - enemyPosition.z
    );
    const enemyRotation = new THREE.Euler(0, angleToPlayer, 0);
    
    // Add the enemy directly to the store
    useEnemies.setState({
      enemies: [{
        id: 'test-enemy-ship',
        position: enemyPosition,
        rotation: enemyRotation,
        velocity: new THREE.Vector3(0, 0, 0),
        health: 100,
        maxHealth: 100
      }]
    });
    
    console.log(`[ENEMY] Spawned test enemy ship at (${enemyPosition.x.toFixed(1)}, ${POSITION.SHIP_HEIGHT}, ${enemyPosition.z.toFixed(1)}), facing player`);
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