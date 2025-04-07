import * as THREE from 'three';
import bridgeService from '../context/BridgeService';
import RobotBehaviors from './RobotBehaviors';
import RobotMovement from './RobotMovement';

class RobotManager {
  constructor(scene, terrainRenderer) {
    this.scene = scene;
    this.terrainRenderer = terrainRenderer;
    this.robots = {};
    this.selectedRobotId = null;
    this.lastUpdateTime = {};
    
    // Initialize the behavior and movement managers
    this.behaviors = new RobotBehaviors(this);
    this.movement = new RobotMovement(this);
    
    // Materials for robots
    this.robotMaterial = new THREE.MeshLambertMaterial({ color: 0x3399FF });
    this.selectedMaterial = new THREE.MeshLambertMaterial({ color: 0x22CC44 });
    this.lowBatteryMaterial = new THREE.MeshLambertMaterial({ color: 0xFF3300 });
    
    // For robot camera views
    this.robotCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    this.robotCamera.fov = 75; // Wide FOV for better visibility
    this.robotCamera.updateProjectionMatrix();
    
    // Create a raycaster for robot selection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }
  
  // Update the view helper positions - simplify by removing helper objects
  updateViewHelpers() {
    // This method is kept empty but we keep it to avoid breaking existing code
    // that might call this method
  }
  
  // Calculate terrain height and position - extracted to avoid duplication
  _getTerrainPositionY(x, z) {
    const terrainHeight = this.terrainRenderer.getHeightAtPosition(x, z);
    // Use a default height if the terrain height is too close to zero
    const actualHeight = Math.abs(terrainHeight) < 0.1 ? 20 : terrainHeight;
    return {
      y: actualHeight + 5, // 5 units above terrain
      terrainHeight: actualHeight
    };
  }
  
  // Create a new robot
  createRobot(position) {
    const id = Date.now().toString();
    
    // If no position is provided, generate a random one
    if (!position) {
      const x = (Math.random() - 0.5) * 1600; // -800 to 800
      const z = (Math.random() - 0.5) * 1600; // -800 to 800
      const heightData = this._getTerrainPositionY(x, z);
      position = { x, y: heightData.y, z };
      console.log(`Creating robot at position (${x}, ${heightData.y}) with terrain height ${heightData.terrainHeight}`);
    } else {
      const heightData = this._getTerrainPositionY(position.x, position.z);
      position.y = heightData.y; // Ensure robot is above terrain
      console.log(`Creating robot at provided position (${position.x}, ${position.y}) with terrain height ${heightData.terrainHeight}`);
    }
    
    // Create robot mesh - use a combined geometry for better visibility
    const robotGroup = new THREE.Group();
    
    // Main body - larger sphere
    const bodyGeometry = new THREE.SphereGeometry(10, 20, 20);
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.robotMaterial);
    bodyMesh.castShadow = true;
    robotGroup.add(bodyMesh);
    
    // Position the entire group
    robotGroup.position.set(position.x, position.y, position.z);
    robotGroup.userData.robotId = id; // Store ID for picking
    
    // Add to scene
    this.scene.add(robotGroup);
    
    // Generate initial direction (random angle)
    const initialAngle = Math.random() * Math.PI * 2;
    const directionVector = new THREE.Vector3(Math.cos(initialAngle), 0, Math.sin(initialAngle));
    
    // Update the rotation of the group to match the initial direction
    robotGroup.rotation.y = initialAngle;
    
    // Store robot data with explicit terrain height
    this.robots[id] = {
      id,
      mesh: robotGroup, // Store the group instead of a single mesh
      position: { ...position },
      terrainHeight: position.y - 5, // Store the actual terrain height
      task: '',
      coordinates: {
        x: position.x,
        z: position.z
      },
      // Add missing properties for robot movement/direction
      direction: directionVector, // Initial direction vector
      speed: 0.2, // Lower initial speed
      targetSpeed: 0.5, // Lower initial target speed
      targetDirection: { x: directionVector.x, z: directionVector.z }, // For smooth turning
      moveTimer: 0,
      moveInterval: Math.random() * 1500 + 800, // Even shorter intervals for more frequent direction changes
      selected: false,
      // Add this flag to ensure the robot is always visible in views
      forceVisible: true,
      // New properties for enhanced capabilities and behavior
      capabilities: {
        maxSpeed: 5.0, // Set a higher default speed within the new range (0.1-10.0)
        turnRate: 0.08, // Higher turn rate for more responsive turning (from 0.06)
        sensorRange: 120, // Slightly increased sensor range
        batteryLevel: 100,
        batteryCapacity: 100,
        batteryDrainRate: 0.5 // Increased drain rate
      },
      behaviorGoal: 'random', // Default goal: random movement
      behaviorState: {
        targetPosition: null,
        patrolPoints: [],
        patrolIndex: 0,
        searchRadius: 200,
        lastDetection: null,
        thinkTime: 0
      }
    };
    
    // Dispatch an event to notify about the new robot
    const robotData = this.getRobotData(id);
    bridgeService.notifyRobotAdded(robotData);
    
    return id;
  }
  
  // Public method to add a robot
  addRobot(position) {
    const id = this.createRobot(position);
    const robotData = this.getRobotData(id);
    
    // Select the newly added robot
    this.selectRobot(id);
    
    return robotData;
  }
  
  // Select a robot
  selectRobot(robotId) {
    console.log(`SelectRobot called with ID: ${robotId}`);
    
    // If attempting to select a robot that doesn't exist, log an error
    if (robotId && !this.robots[robotId]) {
      console.error(`Attempted to select non-existent robot with ID: ${robotId}`);
      return;
    }
    
    // Deselect previous robot
    if (this.selectedRobotId && this.robots[this.selectedRobotId]) {
      const prevRobot = this.robots[this.selectedRobotId];
      
      // Since we're using a simpler model now, just change the material of the children
      prevRobot.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.material = this.robotMaterial;
        }
      });
      
      prevRobot.selected = false;
      console.log(`Deselected previous robot: ${this.selectedRobotId}`);
    }
    
    this.selectedRobotId = robotId;
    
    // Select new robot
    if (robotId && this.robots[robotId]) {
      const robot = this.robots[robotId];
      
      // Since we're using a simpler model now, just change the material of the children
      robot.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.material = this.selectedMaterial;
        }
      });
      
      robot.selected = true;
      
      // Position the robot camera
      const pos = robot.position;
      this.robotCamera.position.set(pos.x, pos.y + 3, pos.z); // Slightly above robot
      this.robotCamera.lookAt(
        pos.x + robot.direction.x * 10,
        pos.y + 2,
        pos.z + robot.direction.z * 10
      );
      
      console.log(`Selected robot ${robotId.substring(0, 8)} at position:`, pos);
      
      // Dispatch event for UI using BridgeService
      bridgeService.notifyRobotSelected(this.getRobotData(robotId));
    } else {
      // No robot selected
      console.log('No robot selected');
      
      // Dispatch event for UI using BridgeService
      bridgeService.notifyRobotSelected(null);
    }
  }
  
  // Handle click for robot selection
  handleClick(event, camera, renderer) {
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Set raycaster
    this.raycaster.setFromCamera(this.mouse, camera);
    
    // Get all robot meshes
    const robotGroups = Object.values(this.robots).map(robot => robot.mesh);
    
    // Debug log robots
    console.log(`Checking for robot clicks among ${robotGroups.length} robots`);
    
    // Check for intersections
    const intersects = this.raycaster.intersectObjects(robotGroups, true); // Use recursive search
    
    if (intersects.length > 0) {
      console.log(`Found ${intersects.length} intersections`);
      
      // Find the parent group that has the robotId
      let currentObject = intersects[0].object;
      while (currentObject && !currentObject.userData.robotId) {
        currentObject = currentObject.parent;
      }
      
      // If we found a robot group, select it
      if (currentObject && currentObject.userData.robotId) {
        const robotId = currentObject.userData.robotId;
        console.log(`Found robot with ID: ${robotId}`);
        
        // Verify robot exists
        if (this.robots[robotId]) {
          console.log(`Selecting robot ${robotId}`);
          this.selectRobot(robotId);
          return true;
        } else {
          console.warn(`Robot with ID ${robotId} found in scene but not in robots collection`);
        }
      }
    }
    
    // Deselect if clicking empty space
    this.selectRobot(null);
    return false;
  }
  
  // Update all robots
  update(deltaTime) {
    // Clone robots first to avoid mutation errors if a robot is deleted during update
    const robotIds = Object.keys(this.robots);
    
    for (let id of robotIds) {
      const robot = this.robots[id];
      if (!robot) continue; // Skip if robot was removed
      
      // Update battery according to activity
      this.updateRobotBattery(robot, deltaTime);
      
      // Skip behavior updates if battery is critically low
      if (robot.capabilities.batteryLevel <= 0) {
        // Battery dead - robot can't move
        robot.targetSpeed = 0;
        robot.speed = 0;
        continue;
      }
      
      // Apply the behavior using the behavior manager instead of duplicating switch logic
      this.behaviors.applyRobotBehavior(robot, deltaTime);
      
      // Ensure appropriate mesh updates
      this.updateRobotMesh(robot);
      
      // If this is the selected robot, update the camera to follow it
      if (id === this.selectedRobotId) {
        this.updateCameraForSelectedRobot();
      }
      
      // Update UI with current robot data for ALL robots
      // Check if enough time has passed since the last update for this robot
      const now = Date.now();
      if (!this.lastUpdateTime[id] || now - this.lastUpdateTime[id] > 100) { // Update UI every 100ms
        bridgeService.notifyRobotUpdated(this.getRobotData(id));
        this.lastUpdateTime[id] = now;
      }
    }
  }
  
  // New method to update robot battery based on activities
  updateRobotBattery(robot, deltaTime) {
    // Base drain rate from capabilities
    let drainAmount = robot.capabilities.batteryDrainRate * deltaTime / 1000;
    
    // Moving costs more energy
    if (robot.speed > 0) {
      // Higher speeds drain battery faster (quadratic relationship)
      drainAmount += (robot.speed * robot.speed) * 0.01 * deltaTime / 1000;
    }
    
    // Turning costs energy
    if (robot.targetDirection && 
        (robot.direction.x !== robot.targetDirection.x || 
         robot.direction.z !== robot.targetDirection.z)) {
      drainAmount += 0.005 * deltaTime / 1000;
    }
    
    // Different behaviors may have different energy costs
    switch (robot.behaviorGoal) {
      case 'patrol':
        // Patrol uses sensors too
        drainAmount += 0.01 * deltaTime / 1000;
        break;
      case 'standby':
        // Standby uses minimal energy
        drainAmount *= 0.5;
        break;
      case 'findRocks':
        // Find rocks uses minimal energy
        drainAmount += 0.02 * deltaTime / 1000;
        break;
      case 'findWater':
        // Find water uses minimal energy
        drainAmount *= 0.5;
        break;
      case 'findFlatSurface':
        // Find flat surface uses minimal energy
        drainAmount *= 0.5;
        break;
      case 'findGoodWeather':
        // Find good weather uses minimal energy
        drainAmount *= 0.5;
        break;
      case 'findGoodSoil':
        // Find good soil uses minimal energy
        drainAmount *= 0.5;
        break;
      
    }
    // Apply drain
    robot.capabilities.batteryLevel = Math.max(0, robot.capabilities.batteryLevel - drainAmount);
    
    // If battery is getting low, reduce max speed to conserve energy
    if (robot.capabilities.batteryLevel < robot.capabilities.batteryCapacity * 0.2) {
      const energyFactor = robot.capabilities.batteryLevel / (robot.capabilities.batteryCapacity * 0.2);
      // Reduce speed more as battery gets lower
      const maxPossibleSpeed = robot.capabilities.maxSpeed * (0.3 + (energyFactor * 0.7));
      
      // If current target speed is higher than what's possible, adjust it
      if (robot.targetSpeed > maxPossibleSpeed) {
        robot.targetSpeed = maxPossibleSpeed;
      }
      
      // For very low battery, start flashing the robot to indicate distress
      if (robot.capabilities.batteryLevel < robot.capabilities.batteryCapacity * 0.05) {
        // Flash the robot material between normal and red
        const flashRate = 500; // ms
        const timeMs = Date.now();
        if ((timeMs % flashRate) < flashRate / 2) {
          robot.mesh.children[0].material = this.lowBatteryMaterial;
        } else {
          robot.mesh.children[0].material = this.robotMaterial;
        }
      }
    } else {
      // Normal operation - ensure robot has normal material
      robot.mesh.children[0].material = this.robotMaterial;
    }
  }
  
  // Get formatted robot data for UI
  getRobotData(robotId) {
    if (!robotId || !this.robots[robotId]) return null;
    
    const robot = this.robots[robotId];
    return {
      id: robot.id,
      position: {
        x: Math.round(robot.position.x * 100) / 100, // Round to 2 decimal places
        y: Math.round(robot.position.y * 100) / 100,
        z: Math.round(robot.position.z * 100) / 100
      },
      direction: {
        x: robot.direction.x,
        y: robot.direction.y,
        z: robot.direction.z
      },
      task: robot.task,
      speed: robot.speed,
      coordinates: {
        x: Math.round(robot.position.x + 1000), // Convert to 0-2000 range for UI
        z: Math.round(robot.position.z + 1000)
      },
      height: Math.round(robot.terrainHeight), // Use the actual terrain height
      selected: robot.id === this.selectedRobotId,
      // Include capabilities and behavior information
      capabilities: { ...robot.capabilities },
      behaviorGoal: robot.behaviorGoal
    };
  }
  
  // Set robot task (now combines both concepts of task and behavior)
  setRobotTask(robotId, task) {
    if (robotId && this.robots[robotId]) {
      const robot = this.robots[robotId];
      
      // Set the task string
      robot.task = task;
      
      // Directly set the behavior goal (no parsing needed)
      this._setRobotBehaviorGoal(robotId, task);
      
      // If selected, update UI
      if (robotId === this.selectedRobotId) {
        bridgeService.notifyRobotUpdated(this.getRobotData(robotId));
      }
    }
  }
  
  // For external calls, redirect to setRobotTask to avoid duplication
  setRobotBehaviorGoal(robotId, goal, params = {}) {
    this.setRobotTask(robotId, goal);
  }
  
  // Remove a robot
  removeRobot(robotId) {
    if (robotId && this.robots[robotId]) {
      // Remove from scene
      this.scene.remove(this.robots[robotId].mesh);
      
      // If selected, deselect
      if (robotId === this.selectedRobotId) {
        this.selectRobot(null);
      }
      
      // Remove from collection
      delete this.robots[robotId];
    }
  }
  
  // Get all robots for UI
  getAllRobots() {
    return Object.values(this.robots).map(robot => this.getRobotData(robot.id));
  }
  
  // Update robot mesh position and rotation
  updateRobotMesh(robot) {
    // Clamp to terrain bounds
    const halfTerrainSize = 950; // Slightly smaller than terrain to prevent falling off
    const clampedX = Math.max(-halfTerrainSize, Math.min(halfTerrainSize, robot.position.x));
    const clampedZ = Math.max(-halfTerrainSize, Math.min(halfTerrainSize, robot.position.z));
    
    // Get terrain height at new position using our helper method
    const heightData = this._getTerrainPositionY(clampedX, clampedZ);
    
    // Update position
    robot.position = {
      x: clampedX,
      y: heightData.y,
      z: clampedZ
    };
    robot.terrainHeight = heightData.terrainHeight; // Update the terrain height
    
    // Update mesh position
    robot.mesh.position.set(clampedX, heightData.y, clampedZ);
    
    // Calculate and apply rotation based on direction
    const rotationAngle = Math.atan2(robot.direction.z, robot.direction.x);
    robot.rotationAngle = rotationAngle;
    
    // Rotate the entire group to face the direction of travel
    robot.mesh.rotation.y = rotationAngle;
  }
  
  // Update camera for selected robot
  updateCameraForSelectedRobot() {
    if (this.selectedRobotId && this.robots[this.selectedRobotId]) {
      const robot = this.robots[this.selectedRobotId];
      const pos = robot.position;
      
      // Position the camera at the robot's eye level
      this.robotCamera.position.set(pos.x, pos.y + 3, pos.z);
      
      // Look in the direction the robot is facing
      this.robotCamera.lookAt(
        pos.x + robot.direction.x * 10,
        pos.y + 2,
        pos.z + robot.direction.z * 10
      );
    }
  }
  
  // Set robot capabilities - simplified to just handle the UI-exposed capabilities
  setRobotCapabilities(robotId, capabilities) {
    if (robotId && this.robots[robotId]) {
      const robot = this.robots[robotId];
      
      // Just update the capabilities directly
      Object.assign(robot.capabilities, capabilities);
      
      // Handle special cases
      
      // If setting battery capacity, adjust current level proportionally
      if (capabilities.batteryCapacity !== undefined && 
          capabilities.batteryLevel === undefined) {
        const currentPercentage = robot.capabilities.batteryLevel / robot.capabilities.batteryCapacity;
        robot.capabilities.batteryLevel = capabilities.batteryCapacity * currentPercentage;
      }
      
      // Simple validation - keep values in reasonable ranges
      this.validateCapabilities(robot);
      
      // Update UI if selected
      if (robotId === this.selectedRobotId) {
        bridgeService.notifyRobotUpdated(this.getRobotData(robotId));
      }
    }
  }
  
  // Validate and normalize robot capabilities
  validateCapabilities(robot) {
    // Ensure all capabilities are within reasonable ranges
    // Updated ranges based on user request (adjusted for simulation context)
    robot.capabilities.maxSpeed = Math.max(0.1, Math.min(10.0, robot.capabilities.maxSpeed)); // Range: 0.1 - 10.0 m/s
    robot.capabilities.turnRate = Math.max(0.01, Math.min(1.0, robot.capabilities.turnRate)); // Range: 0.01 - 1.0 rad/s
    robot.capabilities.sensorRange = Math.max(10, Math.min(500, robot.capabilities.sensorRange)); // Range: 10 - 500 m
    robot.capabilities.batteryCapacity = Math.max(50, Math.min(500, robot.capabilities.batteryCapacity)); // Range: 50 - 500 units
    robot.capabilities.batteryLevel = Math.max(0, Math.min(robot.capabilities.batteryCapacity, 
                                                           robot.capabilities.batteryLevel));
    robot.capabilities.batteryDrainRate = Math.max(0.001, Math.min(0.1, robot.capabilities.batteryDrainRate)); // Increased max drain rate
  }
  
  // Set robot behavior goal directly (internal use)
  _setRobotBehaviorGoal(robotId, goal, params = {}) {
    if (robotId && this.robots[robotId]) {
      const robot = this.robots[robotId];
      
      // Normalize behavior names - simplify this to just basic behaviors we need for UI
      let normalizedGoal = goal;
      // We only need to support the behaviors that have UI buttons:
      // 'random', 'patrol', 'findRocks', and 'standby'
      if (goal === 'find_rocks') normalizedGoal = 'findRocks';
      
      robot.behaviorGoal = normalizedGoal;
      
      // Reset behavior state for new goal - keep only essential state
      robot.behaviorState = {
        ...robot.behaviorState,
        targetPosition: null,
        patrolPoints: [],
        patrolIndex: 0,
        thinkTime: 0,
      };
      
      // Set target speed based on behavior - simple default values
      switch (normalizedGoal) {
        case 'patrol':
          robot.targetSpeed = robot.capabilities.maxSpeed * 0.9;
          break;
        case 'standby':
          robot.targetSpeed = 0;
          break;
        case 'random':
          robot.targetSpeed = robot.capabilities.maxSpeed * 0.3; // Lower target speed for random behavior
          break;
        case 'findRocks':
          robot.targetSpeed = robot.capabilities.maxSpeed * 0.8;
          break;
      }
      
      // Update UI if this is the selected robot
      if (robotId === this.selectedRobotId) {
        bridgeService.notifyRobotUpdated(this.getRobotData(robotId));
      }
    }
  }
}

export default RobotManager;
