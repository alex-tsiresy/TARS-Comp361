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
      case 'findWater':
        this.applyFindWaterBehavior(robot, deltaTime);
        break;
      case 'findFlatSurface':
        this.applyFindFlatSurfaceBehavior(robot, deltaTime);
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
      const baseSpeed = robot.capabilities.maxSpeed * 0.4; // Lower base speed for random behavior
      const speedAdjustment = (Math.random() * 2 - 1) * speedVariance;
      robot.targetSpeed = baseSpeed * (1 + speedAdjustment);
    }
    
    // Update direction and speed
    this.robotManager.movement.smoothlyUpdateDirectionAndSpeed(robot, deltaTime);
    
    // Apply movement with further reduced factor for even slower visual speed
    const moveFactor = 0.1; // Further reduced from 0.5
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
  // Find water behavior - simulates searching for water sources
  applyFindWaterBehavior(robot, deltaTime) {
    // Check if we have a target water position
    if (!robot.behaviorState.targetPosition) {
      // If we need to think, find a potential water location
      if (robot.behaviorState.thinkTime > 500) { // Quick decision making for water search
        robot.behaviorState.thinkTime = 0;
        
        // Water is often found in lower elevations, so bias search toward downhill directions
        const currentAngle = Math.atan2(robot.direction.z, robot.direction.x);
        
        // Use wider angle variations for water search (water can be anywhere)
        const searchAngleVariation = (Math.random() * 2 - 1) * Math.PI / 2; // +-90 degrees
        const searchAngle = currentAngle + searchAngleVariation;
        
        // Use variable search distances with preference for nearby water sources
        const minDistance = robot.capabilities.sensorRange * 0.5; // Closer search for water
        const maxDistance = robot.capabilities.sensorRange * 1.0; // Stay within sensor range
        const searchDistance = minDistance + Math.random() * (maxDistance - minDistance);
        
        robot.behaviorState.targetPosition = {
          x: robot.position.x + Math.cos(searchAngle) * searchDistance,
          z: robot.position.z + Math.sin(searchAngle) * searchDistance
        };
        
        // Set moderate speed for careful water searching
        robot.targetSpeed = robot.capabilities.maxSpeed * 0.85; // Slightly slower for careful searching
      } else {
        // While "thinking", move in a meandering pattern to simulate looking for water
        robot.targetSpeed = robot.capabilities.maxSpeed * 0.7;
        
        // Slight zigzag movement to simulate searching for water
        const zigzagFactor = Math.sin(robot.behaviorState.thinkTime * 0.01) * 0.3;
        const forwardVector = {
          x: robot.direction.x,
          z: robot.direction.z
        };
        const sideVector = {
          x: -robot.direction.z,
          z: robot.direction.x
        };
        
        robot.position.x += (forwardVector.x + sideVector.x * zigzagFactor) * robot.speed;
        robot.position.z += (forwardVector.z + sideVector.z * zigzagFactor) * robot.speed;
      }
    } else {
      // Move toward the target position with moderate speed (careful approach to water)
      robot.targetSpeed = robot.capabilities.maxSpeed * 0.85;
      this.robotManager.movement.moveTowardPoint(robot, robot.behaviorState.targetPosition, deltaTime);
      
      // Check if we've reached the target
      const distanceToTarget = this._distanceToTarget(robot, robot.behaviorState.targetPosition);
      
      if (distanceToTarget < 12) {
        // Simulate a chance of finding water
        const foundWater = Math.random() < 0.35; // 35% chance to find water
        
        if (foundWater) {
          // Examine the water source, then continue
          robot.targetSpeed = 0;
          setTimeout(() => {
            if (robot && robot.behaviorGoal === 'findWater') {
              robot.behaviorState.targetPosition = null;
              robot.targetSpeed = robot.capabilities.maxSpeed * 0.8;
            }
          }, 700); // Longer examination time for water analysis
        } else {
          // No water found, continue searching after a brief pause
          robot.targetSpeed = robot.capabilities.maxSpeed * 0.4; // Slow down briefly
          setTimeout(() => {
            if (robot && robot.behaviorGoal === 'findWater') {
              robot.behaviorState.targetPosition = null;
            }
          }, 300); // Brief pause before continuing search
        }
      }
    }
  }
  
  // Find flat surface behavior - simulates searching for suitable landing or construction areas
  applyFindFlatSurfaceBehavior(robot, deltaTime) {
    // Check if we have a target flat surface position
    if (!robot.behaviorState.targetPosition) {
      // If we need to think, find a potential flat area
      if (robot.behaviorState.thinkTime > 450) { // Quick decisions for flat surface search
        robot.behaviorState.thinkTime = 0;
        
        // Flat surfaces are more likely to be found in open areas
        // Use a more methodical search pattern with grid-like movement
        
        // Create a spiral search pattern
        const spiralAngle = robot.behaviorState.searchIterations || 0;
        const spiralRadius = 50 + (robot.behaviorState.searchIterations || 0) * 15;
        
        // Increment search iteration counter
        robot.behaviorState.searchIterations = (robot.behaviorState.searchIterations || 0) + 1;
        if (robot.behaviorState.searchIterations > 12) {
          robot.behaviorState.searchIterations = 0; // Reset after completing a full search
        }
        
        // Calculate position in spiral pattern
        robot.behaviorState.targetPosition = {
          x: robot.position.x + Math.cos(spiralAngle) * spiralRadius,
          z: robot.position.z + Math.sin(spiralAngle) * spiralRadius
        };
        
        // Set efficient speed for methodical searching
        robot.targetSpeed = robot.capabilities.maxSpeed * 0.9;
      } else {
        // While "thinking", move in a straight line to efficiently cover ground
        robot.targetSpeed = robot.capabilities.maxSpeed * 0.8;
        
        // Move forward in current direction with slight scanning motion
        const scanFactor = Math.sin(robot.behaviorState.thinkTime * 0.005) * 0.1;
        robot.position.x += robot.direction.x * robot.speed;
        robot.position.z += robot.direction.z * robot.speed;
        
        // Slightly adjust direction to scan the terrain
        const currentAngle = Math.atan2(robot.direction.z, robot.direction.x);
        const scanAngle = currentAngle + scanFactor;
        robot.direction.x = Math.cos(scanAngle);
        robot.direction.z = Math.sin(scanAngle);
      }
    } else {
      // Move toward the target position with high efficiency
      robot.targetSpeed = robot.capabilities.maxSpeed * 0.95;
      this.robotManager.movement.moveTowardPoint(robot, robot.behaviorState.targetPosition, deltaTime);
      
      // Check if we've reached the target
      const distanceToTarget = this._distanceToTarget(robot, robot.behaviorState.targetPosition);
      
      if (distanceToTarget < 15) {
        // Simulate analyzing the surface
        const foundFlatSurface = Math.random() < 0.4; // 40% chance to find suitable flat surface
        
        if (foundFlatSurface) {
          // Analyze the flat surface thoroughly
          robot.targetSpeed = 0;
          
          // Simulate a scanning pattern
          const scanDuration = 800; // Longer scan for detailed surface analysis
          setTimeout(() => {
            if (robot && robot.behaviorGoal === 'findFlatSurface') {
              robot.behaviorState.targetPosition = null;
              robot.targetSpeed = robot.capabilities.maxSpeed * 0.9;
            }
          }, scanDuration);
        } else {
          // Not flat enough, continue searching immediately
          robot.behaviorState.targetPosition = null;
          
          // Reset search iterations occasionally to avoid getting stuck in a pattern
          if (Math.random() < 0.3) {
            robot.behaviorState.searchIterations = 0;
          }
        }
      }
    }
  }

  // Find good weather behavior - searches for areas with optimal weather conditions
  applyFindGoodWeatherBehavior(robot, deltaTime) {
    if (!robot.behaviorState.targetPosition) {
      if (robot.behaviorState.thinkTime > 500) {
        robot.behaviorState.thinkTime = 0;

        // Favor searching in open areas and away from obstacles
        const searchAngle = Math.random() * Math.PI * 2;
        const searchDistance = robot.capabilities.sensorRange * (0.8 + Math.random() * 0.4);

        robot.behaviorState.targetPosition = {
          x: robot.position.x + Math.cos(searchAngle) * searchDistance,
          z: robot.position.z + Math.sin(searchAngle) * searchDistance
        };
      } else {
        // While "thinking", move in a meandering pattern to simulate looking for water
        robot.targetSpeed = robot.capabilities.maxSpeed * 0.7;
        
        // Slight zigzag movement to simulate searching for water
        const zigzagFactor = Math.sin(robot.behaviorState.thinkTime * 0.01) * 0.3;
        const forwardVector = {
          x: robot.direction.x,
          z: robot.direction.z
        };
        const sideVector = {
          x: -robot.direction.z,
          z: robot.direction.x
        };
        
        robot.position.x += (forwardVector.x + sideVector.x * zigzagFactor) * robot.speed;
        robot.position.z += (forwardVector.z + sideVector.z * zigzagFactor) * robot.speed;
      }
    } else {
      robot.targetSpeed = robot.capabilities.maxSpeed * 0.85;

      this.robotManager.movement.moveTowardPoint(robot, robot.behaviorState.targetPosition, deltaTime);
      
      if (this._distanceToTarget(robot, robot.behaviorState.targetPosition) < 12) {
        const foundGoodWeather = Math.random() < 0.5;
        if (foundGoodWeather) {
          robot.targetSpeed = 0;
          setTimeout(() => {
            robot.behaviorState.targetPosition = null;
            robot.targetSpeed = robot.capabilities.maxSpeed * 0.9;
          }, 700);
        } else {
          robot.behaviorState.targetPosition = null;
        }
      }
    }
  }

  // Find good soil behavior - searches for fertile soil for plants
  applyFindGoodSoilBehavior(robot, deltaTime) {
    if (!robot.behaviorState.targetPosition) {
      if (robot.behaviorState.thinkTime > 600) {
        robot.behaviorState.thinkTime = 0;

        const searchAngle = Math.random() * Math.PI * 2;
        const searchDistance = robot.capabilities.sensorRange * (0.6 + Math.random() * 0.5);

        robot.behaviorState.targetPosition = {
          x: robot.position.x + Math.cos(searchAngle) * searchDistance,
          z: robot.position.z + Math.sin(searchAngle) * searchDistance
        };
      
      } else {
        // While "thinking", move in a meandering pattern to simulate looking for water
        robot.targetSpeed = robot.capabilities.maxSpeed * 0.7;
        
        // Slight zigzag movement to simulate searching for water
        const zigzagFactor = Math.sin(robot.behaviorState.thinkTime * 0.01) * 0.3;
        const forwardVector = {
          x: robot.direction.x,
          z: robot.direction.z
        };
        const sideVector = {
          x: -robot.direction.z,
          z: robot.direction.x
        };
        
        robot.position.x += (forwardVector.x + sideVector.x * zigzagFactor) * robot.speed;
        robot.position.z += (forwardVector.z + sideVector.z * zigzagFactor) * robot.speed;
      }
      
    } else {
      robot.targetSpeed = robot.capabilities.maxSpeed * 0.85;

      this.robotManager.movement.moveTowardPoint(robot, robot.behaviorState.targetPosition, deltaTime);
      
      if (this._distanceToTarget(robot, robot.behaviorState.targetPosition) < 10) {
        const foundGoodSoil = Math.random() < 0.4;
        if (foundGoodSoil) {
          robot.targetSpeed = 0;
          setTimeout(() => {
            robot.behaviorState.targetPosition = null;
            robot.targetSpeed = robot.capabilities.maxSpeed * 0.8;
          }, 800);
        } else {
          robot.behaviorState.targetPosition = null;
        }
      }
    }
  }

}

export default RobotBehaviors;
