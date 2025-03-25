import * as THREE from 'three';

class RobotBehaviors {
  constructor(robotManager) {
    this.robotManager = robotManager;
  }

  // Apply behavior based on the robot's goal
  applyRobotBehavior(robot, deltaTime) {
    // If battery is depleted, robot can't move
    if (robot.capabilities.batteryLevel <= 0) {
      robot.speed = 0;
      return;
    }
    
    // Update thinking time for decision making
    robot.behaviorState.thinkTime += deltaTime;
    
    // Apply appropriate behavior based on the goal - only keep behaviors that are directly in the UI
    switch (robot.behaviorGoal) {
      case 'random':
        this.applyRandomBehavior(robot, deltaTime);
        break;
      case 'patrol':
        this.applyPatrolBehavior(robot, deltaTime);
        break;
      case 'findRocks':
        this.applyFindRocksBehavior(robot, deltaTime);
        break;
      case 'standby':
        // Do nothing, robot stays in place
        robot.speed = 0;
        break;
      default:
        // Default to random movement
        this.applyRandomBehavior(robot, deltaTime);
    }
  }
  
  // Helper function to calculate distance to target
  _distanceToTarget(robot, target) {
    return Math.sqrt(
      Math.pow(robot.position.x - target.x, 2) +
      Math.pow(robot.position.z - target.z, 2)
    );
  }
  
  // Random movement behavior - simplified
  applyRandomBehavior(robot, deltaTime) {
    robot.moveTimer += deltaTime;
    
    // Change direction randomly at intervals - but much less frequently
    if (robot.moveTimer > robot.moveInterval) {
      // Calculate new direction
      const currentAngle = Math.atan2(robot.direction.z, robot.direction.x);
      
      // Calculate new direction with a smaller maximum turn angle
      // and a preference for continuing straight
      const straightLinePreference = 0.6; // 60% chance to mostly continue straight
      let maxTurnAngle;
      let randomTurn;
      
      if (Math.random() < straightLinePreference) {
        // Small adjustment to current direction (up to 15 degrees)
        maxTurnAngle = Math.PI / 12; 
        randomTurn = (Math.random() * 2 - 1) * maxTurnAngle;
      } else {
        // Larger direction change when needed (up to 45 degrees)
        maxTurnAngle = Math.PI / 4; 
        randomTurn = (Math.random() * 2 - 1) * maxTurnAngle;
      }
      
      const newAngle = currentAngle + randomTurn;
      
      // Set target direction
      robot.targetDirection = {
        x: Math.cos(newAngle),
        z: Math.sin(newAngle)
      };
      
      // Reset timer and set new interval - much longer for longer straight paths
      robot.moveTimer = 0;
      robot.moveInterval = Math.random() * 3500 + 1500; // 1.5 to 5 seconds of straight movement
      
      // Randomize speed with a preference for consistent motion
      const speedVariance = 0.2; // Only vary speed by 20%
      const baseSpeed = robot.capabilities.maxSpeed * 0.9; // Base at 90% of max speed
      const speedAdjustment = (Math.random() * 2 - 1) * speedVariance;
      robot.targetSpeed = baseSpeed * (1 + speedAdjustment);
    }
    
    // Update direction and speed
    this.robotManager.movement.smoothlyUpdateDirectionAndSpeed(robot, deltaTime);
    
    // Apply movement at full strength
    const moveFactor = 1.2; // Boost straight-line movement
    robot.position.x += robot.direction.x * robot.speed * moveFactor;
    robot.position.z += robot.direction.z * robot.speed * moveFactor;
  }
  
  // Patrol behavior - simplified square path
  applyPatrolBehavior(robot, deltaTime) {
    // Initialize patrol points if not set
    if (robot.behaviorState.patrolPoints.length === 0) {
      // Create a simple square patrol path around current position
      const radius = robot.capabilities.sensorRange * 2;
      const centerX = robot.position.x;
      const centerZ = robot.position.z;
      
      robot.behaviorState.patrolPoints = [
        { x: centerX + radius, z: centerZ + radius },
        { x: centerX - radius, z: centerZ + radius },
        { x: centerX - radius, z: centerZ - radius },
        { x: centerX + radius, z: centerZ - radius }
      ];
    }
    
    // Get current target point
    const targetPoint = robot.behaviorState.patrolPoints[robot.behaviorState.patrolIndex];
    
    // Move toward the target point with increased directness
    const directPathFactor = 1.1; // Move more directly toward target
    
    // Set a higher speed for patrol to cover ground faster
    robot.targetSpeed = robot.capabilities.maxSpeed * 0.95; // Almost full speed for patrol
    
    // Move toward target with direct path preference
    this.robotManager.movement.moveTowardPoint(robot, targetPoint, deltaTime);
    
    // Boost forward movement for more direct paths
    robot.position.x += robot.direction.x * robot.speed * 0.1; // Additional forward momentum
    robot.position.z += robot.direction.z * robot.speed * 0.1;
    
    // Check if we've reached the target
    const distanceToTarget = this._distanceToTarget(robot, targetPoint);
    
    if (distanceToTarget < 15) { // Reduced from 20 to spend less time near waypoints
      // Move to next patrol point
      robot.behaviorState.patrolIndex = 
        (robot.behaviorState.patrolIndex + 1) % robot.behaviorState.patrolPoints.length;
      
      // Shorter pause at waypoints
      robot.targetSpeed = robot.capabilities.maxSpeed * 0.6; // Less slowdown at waypoints
      setTimeout(() => {
        if (robot && robot.behaviorGoal === 'patrol') {
          robot.targetSpeed = robot.capabilities.maxSpeed * 0.95;
        }
      }, 200); // Shorter pause (was 400ms)
    }
  }
  
  // Find rocks behavior - simplified scanning behavior
  applyFindRocksBehavior(robot, deltaTime) {
    // Check if we have a target rock position
    if (!robot.behaviorState.targetPosition) {
      // If we need to think, find a potential rock location
      if (robot.behaviorState.thinkTime > 600) { // Reduced from 1000ms to 600ms for quicker decisions
        robot.behaviorState.thinkTime = 0;
        
        // Pick a more directed search pattern with larger steps
        const currentAngle = Math.atan2(robot.direction.z, robot.direction.x);
        
        // Use smaller angle variations for more purposeful searching
        const searchAngleVariation = (Math.random() * 2 - 1) * Math.PI / 3; // ±60 degrees
        const searchAngle = currentAngle + searchAngleVariation;
        
        // Use longer search distances to cover more ground
        const minDistance = robot.capabilities.sensorRange * 0.7; // Minimum distance
        const maxDistance = robot.capabilities.sensorRange * 1.2; // Sometimes go beyond sensor range
        const searchDistance = minDistance + Math.random() * (maxDistance - minDistance);
        
        robot.behaviorState.targetPosition = {
          x: robot.position.x + Math.cos(searchAngle) * searchDistance,
          z: robot.position.z + Math.sin(searchAngle) * searchDistance
        };
        
        // Set a high travel speed for faster exploration
        robot.targetSpeed = robot.capabilities.maxSpeed * 1.0; // Full speed to target
      } else {
        // Even while "thinking", move more purposefully in current direction
        // instead of wandering randomly
        robot.targetSpeed = robot.capabilities.maxSpeed * 0.8;
        
        // Move forward in current direction without random turns
        robot.position.x += robot.direction.x * robot.speed * 1.1;
        robot.position.z += robot.direction.z * robot.speed * 1.1;
      }
    } else {
      // Move directly toward the target position with high speed
      robot.targetSpeed = robot.capabilities.maxSpeed * 1.0; // Full speed
      this.robotManager.movement.moveTowardPoint(robot, robot.behaviorState.targetPosition, deltaTime);
      
      // Add extra momentum for more direct movement
      robot.position.x += robot.direction.x * robot.speed * 0.1;
      robot.position.z += robot.direction.z * robot.speed * 0.1;
      
      // Check if we've reached the target
      const distanceToTarget = this._distanceToTarget(robot, robot.behaviorState.targetPosition);
      
      if (distanceToTarget < 10) {
        // Simulate a chance of finding a rock
        const foundRock = Math.random() < 0.3;
        
        if (foundRock) {
          // Examine the rock, then continue - shorter examination time
          robot.targetSpeed = 0;
          setTimeout(() => {
            if (robot && robot.behaviorGoal === 'findRocks') {
              robot.behaviorState.targetPosition = null;
              robot.targetSpeed = robot.capabilities.maxSpeed * 0.9; // Higher speed after finding rock
            }
          }, 500); // Reduced from 800ms to 500ms
        } else {
          // No rock found, continue searching immediately
          robot.behaviorState.targetPosition = null;
        }
      }
    }
  }
}

export default RobotBehaviors; 