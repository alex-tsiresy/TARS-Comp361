import * as THREE from 'three';
import bridgeService from '../context/BridgeService';

class RobotManager {
  constructor(scene, terrainRenderer) {
    this.scene = scene;
    this.terrainRenderer = terrainRenderer;
    this.robots = {};
    this.selectedRobotId = null;
    this.lastUpdateTime = {};
    
    // Materials for robots
    this.robotMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xf44336,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x441111, // Add slight emissive property for better visibility
      emissiveIntensity: 0.3
    });
    
    this.selectedRobotMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4caf50,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x114411, // Add slight emissive property for better visibility
      emissiveIntensity: 0.3
    });
    
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
  
  // Create a new robot
  createRobot(position) {
    const id = Date.now().toString();
    
    // If no position is provided, generate a random one
    if (!position) {
      const x = (Math.random() - 0.5) * 1600; // -800 to 800
      const z = (Math.random() - 0.5) * 1600; // -800 to 800
      const terrainHeight = this.terrainRenderer.getHeightAtPosition(x, z);
      // Use a default height if the terrain height is too close to zero
      const actualHeight = Math.abs(terrainHeight) < 0.1 ? 20 : terrainHeight;
      const y = actualHeight + 5; // 5 units above terrain
      position = { x, y, z };
      console.log(`Creating robot at position (${x}, ${y}) with terrain height ${terrainHeight}, using actual height ${actualHeight}`);
    } else {
      const terrainHeight = this.terrainRenderer.getHeightAtPosition(position.x, position.z);
      // Use a default height if the terrain height is too close to zero
      const actualHeight = Math.abs(terrainHeight) < 0.1 ? 20 : terrainHeight;
      position.y = actualHeight + 5; // Ensure robot is above terrain
      console.log(`Creating robot at provided position (${position.x}, ${position.y}) with terrain height ${terrainHeight}, using actual height ${actualHeight}`);
    }
    
    // Create robot mesh - use a combined geometry for better visibility
    const robotGroup = new THREE.Group();
    
    // Main body - larger sphere (increased size since we're not using the direction cone)
    const bodyGeometry = new THREE.SphereGeometry(10, 20, 20);
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.robotMaterial);
    bodyMesh.castShadow = true;
    robotGroup.add(bodyMesh);
    
    // Direction indicator removed - we no longer need the visual cone
    // The robot still has a direction vector internally for movement,
    // but it's not visually represented anymore
    
    // Position the entire group
    robotGroup.position.set(position.x, position.y, position.z);
    robotGroup.userData.robotId = id; // Store ID for picking
    
    // Add to scene
    this.scene.add(robotGroup);
    
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
      direction: new THREE.Vector3(1, 0, 0), // Default direction - facing positive X
      speed: 0.5, // Default speed
      moveTimer: 0,
      moveInterval: Math.random() * 5000 + 2000, // Random interval for movement changes
      selected: false,
      // Add this flag to ensure the robot is always visible in views
      forceVisible: true
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
          child.material = this.selectedRobotMaterial;
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
    const currentTime = Date.now();
    const updateInterval = 100; // Only send updates every 100ms to prevent flooding
    
    Object.values(this.robots).forEach(robot => {
      // Random movement logic
      robot.moveTimer += deltaTime;
      
      if (robot.moveTimer > robot.moveInterval) {
        // Change direction randomly
        const angle = Math.random() * Math.PI * 2;
        robot.direction.x = Math.cos(angle);
        robot.direction.z = Math.sin(angle);
        robot.moveTimer = 0;
        robot.moveInterval = Math.random() * 5000 + 2000;
      }
      
      // Move the robot
      const newX = robot.position.x + robot.direction.x * robot.speed;
      const newZ = robot.position.z + robot.direction.z * robot.speed;
      
      // Clamp to terrain bounds
      const halfTerrainSize = 950; // Slightly smaller than terrain to prevent falling off
      const clampedX = Math.max(-halfTerrainSize, Math.min(halfTerrainSize, newX));
      const clampedZ = Math.max(-halfTerrainSize, Math.min(halfTerrainSize, newZ));
      
      // Get terrain height at new position
      const terrainHeight = this.terrainRenderer.getHeightAtPosition(clampedX, clampedZ);
      // Use a default height if the terrain height is too close to zero
      const actualHeight = Math.abs(terrainHeight) < 0.1 ? 20 : terrainHeight;
      
      // Update position
      robot.position = {
        x: clampedX,
        y: actualHeight + 5, // 5 units above terrain
        z: clampedZ
      };
      robot.terrainHeight = actualHeight; // Update the terrain height
      
      // Update mesh position
      robot.mesh.position.set(clampedX, actualHeight + 5, clampedZ);
      
      // We still track the rotation angle for camera purposes
      // but we no longer need to visually rotate the robot mesh since
      // we removed the direction cone
      const rotationAngle = Math.atan2(robot.direction.z, robot.direction.x);
      
      // Store the rotation angle but don't apply it to the mesh
      robot.rotationAngle = rotationAngle;
      
      // Notify about robot position update, but throttle to avoid too many events
      const lastUpdate = this.lastUpdateTime[robot.id] || 0;
      if (currentTime - lastUpdate > updateInterval) {
        this.lastUpdateTime[robot.id] = currentTime;
        
        // Use BridgeService to notify UI of robot position update
        bridgeService.notifyRobotUpdated(this.getRobotData(robot.id));
      }
    });
    
    // Update selected robot camera
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
      selected: robot.id === this.selectedRobotId
    };
  }
  
  // Set a new task for a robot
  setRobotTask(robotId, task) {
    if (robotId && this.robots[robotId]) {
      this.robots[robotId].task = task;
      
      // If selected, update UI using BridgeService
      if (robotId === this.selectedRobotId) {
        bridgeService.notifyRobotUpdated(this.getRobotData(robotId));
      }
    }
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
}

export default RobotManager; 