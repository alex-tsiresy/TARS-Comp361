import * as THREE from 'three';

class RobotMovement {
  constructor(robotManager) {
    this.robotManager = robotManager;
  }

  // Move toward a target point
  moveTowardPoint(robot, targetPoint, deltaTime) {
    // Calculate direction to target
    const dx = targetPoint.x - robot.position.x;
    const dz = targetPoint.z - robot.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance > 0) {
      // Set target direction (normalized)
      robot.targetDirection = {
        x: dx / distance,
        z: dz / distance
      };
      
      // Always move at full speed unless very close to target
      if (distance < 20) {
        // Only slow down when very close to target
        robot.targetSpeed = robot.capabilities.maxSpeed * Math.max(0.4, distance / 20);
      } else {
        // Full speed at normal distances
        robot.targetSpeed = robot.capabilities.maxSpeed;
      }
      
      // Update direction and speed
      this.smoothlyUpdateDirectionAndSpeed(robot, deltaTime);
      
      // Apply movement - use more directional force for forward movement
      const forwardBias = 1.2; // Prefer forward movement even during turns
      robot.position.x += robot.direction.x * robot.speed * forwardBias;
      robot.position.z += robot.direction.z * robot.speed * forwardBias;
    }
  }
  
  // Handle smooth direction and speed changes
  smoothlyUpdateDirectionAndSpeed(robot, deltaTime) {
    // Update direction
    if (robot.targetDirection) {
      this._updateDirection(robot, deltaTime);
    }
    
    // Update speed
    if (robot.targetSpeed !== undefined) {
      this._updateSpeed(robot, deltaTime);
    }
  }
  
  // Update robot direction with simple turning
  _updateDirection(robot, deltaTime) {
    const currentAngle = Math.atan2(robot.direction.z, robot.direction.x);
    const targetAngle = Math.atan2(robot.targetDirection.z, robot.targetDirection.x);
    
    // Calculate angle difference
    let angleDiff = targetAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Increase turn rate significantly for faster turning
    const turnRateMultiplier = 2.5; // Was implicitly 1.0 before
    const turnRate = robot.capabilities.turnRate * turnRateMultiplier;
    const turnAmount = Math.min(Math.abs(angleDiff), turnRate * deltaTime / 1000) * Math.sign(angleDiff);
    
    // Apply rotation
    const newAngle = currentAngle + turnAmount;
    robot.direction.x = Math.cos(newAngle);
    robot.direction.z = Math.sin(newAngle);
  }
  
  // Update robot speed with simple acceleration
  _updateSpeed(robot, deltaTime) {
    const speedDiff = robot.targetSpeed - robot.speed;
    const acceleration = 0.3; // Increased from 0.2 for faster acceleration
    
    // Apply speed change
    robot.speed += speedDiff * Math.min(1, acceleration * deltaTime / 100);
    
    // Ensure minimum speed when moving
    if (robot.targetSpeed > 0 && robot.speed < 0.2) {
      robot.speed = 0.2;
    }
  }
}

export default RobotMovement; 