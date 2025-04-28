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
      // Random movement behavior
      case 'random':
        this.applyRandomBehavior(robot, deltaTime);
        break;
      // Patrol behavior
      case 'patrol':
        this.applyPatrolBehavior(robot, deltaTime);
        break;
      // Find rocks behavior
      case 'findRocks':
        this.applyFindRocksBehavior(robot, deltaTime);
        break;
      // Find water behavior
      case 'findWater':
        this.applyFindWaterBehavior(robot, deltaTime);
        break;
      // Find flat surface behavior
      case 'findFlatSurface':
        this.applyFindFlatSurfaceBehavior(robot, deltaTime);
        break;
      // Find good weather behavior
      case 'findGoodWeather':
        this.applyFindGoodWeatherBehavior(robot, deltaTime);
        break;
      // Find good soil behavior
      case 'findGoodSoil':
        this.applyFindGoodSoilBehavior(robot, deltaTime);
        break;
      // Standby behavior
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
  
  // Patrol behavior
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
  
  // Find rocks behavior
  applyFindRocksBehavior(robot, deltaTime) {
    // Get the terrain object manager from the robot manager
    const objectManager = this.robotManager.terrainRenderer.objectManager;
    
    // If we don't have a target rock, find the closest one
    if (!robot.behaviorState.targetPosition) {
      // Get all rocks from the object manager
      const rocks = objectManager.objects.filter(obj => 
        obj.geometry instanceof THREE.SphereGeometry && 
        obj !== robot.mesh // Exclude the robot itself
      );
      
      if (rocks.length > 0) {
        // Find the closest rock
        let closestRock = null;
        let minDistance = Infinity;
        
        for (const rock of rocks) {
          const distance = this._distanceToTarget(robot, rock.position);
          if (distance < minDistance) {
            minDistance = distance;
            closestRock = rock;
          }
        }
        
        if (closestRock) {
          // Set the target position to the rock's position
          robot.behaviorState.targetPosition = {
            x: closestRock.position.x,
            z: closestRock.position.z
          };
          
          // Set a high travel speed for faster exploration
          robot.targetSpeed = robot.capabilities.maxSpeed * 1.0;
        }
      } else {
        // No rocks found, move randomly to search
        robot.targetSpeed = robot.capabilities.maxSpeed * 0.8;
        this.applyRandomBehavior(robot, deltaTime);
      }
    } else {
      // Move toward the target rock with high speed
      robot.targetSpeed = robot.capabilities.maxSpeed * 1.0;
      this.robotManager.movement.moveTowardPoint(robot, robot.behaviorState.targetPosition, deltaTime);
      
      // Check if we've reached the rock
      const distanceToTarget = this._distanceToTarget(robot, robot.behaviorState.targetPosition);
      
      if (distanceToTarget < 15) {
        // Simulate examining the rock
        robot.targetSpeed = 0;
        setTimeout(() => {
          if (robot && robot.behaviorGoal === 'findRocks') {
            robot.behaviorState.targetPosition = null;
            robot.targetSpeed = robot.capabilities.maxSpeed * 0.9;
          }
        }, 500);
      }
    }
  }
  // Find water behavior
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
  
  // Find flat surface behavior
  applyFindFlatSurfaceBehavior(robot, deltaTime) {
    // Get the terrain renderer for height information
    const terrainRenderer = this.robotManager.terrainRenderer;
    
    if (!robot.behaviorState.targetPosition) {
      // If we need to think, find a potential flat area
      if (robot.behaviorState.thinkTime > 450) {
        robot.behaviorState.thinkTime = 0;
        
        // Sample heights in a grid pattern around the robot
        const sampleRadius = 100;
        const samplePoints = 8;
        let flattestPoint = null;
        let flattestHeight = Infinity;
        
        for (let i = 0; i < samplePoints; i++) {
          const angle = (i / samplePoints) * Math.PI * 2;
          const x = robot.position.x + Math.cos(angle) * sampleRadius;
          const z = robot.position.z + Math.sin(angle) * sampleRadius;
          const height = terrainRenderer.getHeightAtPosition(x, z);
          
          // Check if this point is flatter than our current flattest
          if (height < flattestHeight) {
            flattestHeight = height;
            flattestPoint = { x, z };
          }
        }
        
        if (flattestPoint) {
          robot.behaviorState.targetPosition = flattestPoint;
          robot.targetSpeed = robot.capabilities.maxSpeed * 0.9;
        } else {
          // If no flat point found, move randomly
          robot.targetSpeed = robot.capabilities.maxSpeed * 0.8;
          this.applyRandomBehavior(robot, deltaTime);
        }
      } else {
        // While "thinking", move in a straight line to efficiently cover ground
        robot.targetSpeed = robot.capabilities.maxSpeed * 0.8;
        robot.position.x += robot.direction.x * robot.speed;
        robot.position.z += robot.direction.z * robot.speed;
      }
    } else {
      // Move toward the target position with high efficiency
      robot.targetSpeed = robot.capabilities.maxSpeed * 0.95;
      this.robotManager.movement.moveTowardPoint(robot, robot.behaviorState.targetPosition, deltaTime);
      
      // Check if we've reached the target
      const distanceToTarget = this._distanceToTarget(robot, robot.behaviorState.targetPosition);
      
      if (distanceToTarget < 15) {
        // Simulate analyzing the surface
        const currentHeight = terrainRenderer.getHeightAtPosition(robot.position.x, robot.position.z);
        const targetHeight = terrainRenderer.getHeightAtPosition(robot.behaviorState.targetPosition.x, robot.behaviorState.targetPosition.z);
        
        // If the height difference is small, we found a flat surface
        if (Math.abs(currentHeight - targetHeight) < 5) {
          robot.targetSpeed = 0;
          setTimeout(() => {
            if (robot && robot.behaviorGoal === 'findFlatSurface') {
              robot.behaviorState.targetPosition = null;
              robot.targetSpeed = robot.capabilities.maxSpeed * 0.9;
            }
          }, 800);
        } else {
          // Not flat enough, continue searching
          robot.behaviorState.targetPosition = null;
        }
      }
    }
  }

  // Find good weather behavior
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
