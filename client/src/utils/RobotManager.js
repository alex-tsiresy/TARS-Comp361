import * as THREE from 'three';

class RobotManager {
  constructor(scene, terrainRenderer) {
    this.scene = scene;
    this.terrainRenderer = terrainRenderer;
    this.robots = {};
    this.selectedRobotId = null;
    
    // Materials for robots
    this.robotMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xf44336,
      metalness: 0.7,
      roughness: 0.3
    });
    
    this.selectedRobotMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4caf50,
      metalness: 0.7,
      roughness: 0.3
    });
    
    // For robot camera views
    this.robotCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.robotCameraHelper = new THREE.CameraHelper(this.robotCamera);
    this.scene.add(this.robotCameraHelper);
    this.robotCameraHelper.visible = false; // Hide by default
    
    // Create a raycaster for robot selection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }
  
  // Create a new robot
  createRobot(position) {
    const id = Date.now().toString();
    
    // If no position is provided, generate a random one
    if (!position) {
      const x = (Math.random() - 0.5) * 1600; // -800 to 800
      const z = (Math.random() - 0.5) * 1600; // -800 to 800
      const y = this.terrainRenderer.getHeightAtPosition(x, z) + 5; // 5 units above terrain
      position = { x, y, z };
    }
    
    // Create robot mesh - a simple sphere for now
    const geometry = new THREE.SphereGeometry(5, 16, 16);
    const mesh = new THREE.Mesh(geometry, this.robotMaterial);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.userData.robotId = id; // Store ID in the mesh for picking
    
    // Add robot to scene
    this.scene.add(mesh);
    
    // Store robot data
    this.robots[id] = {
      id,
      mesh,
      position,
      direction: new THREE.Vector3(1, 0, 0), // Default direction
      speed: 0.5, // Default speed
      task: 'Idle',
      lastUpdate: Date.now(),
      moveTimer: 0,
      moveInterval: Math.random() * 5000 + 2000 // Random interval for movement changes
    };
    
    return id;
  }
  
  // Select a robot
  selectRobot(robotId) {
    // Deselect previous robot
    if (this.selectedRobotId && this.robots[this.selectedRobotId]) {
      this.robots[this.selectedRobotId].mesh.material = this.robotMaterial;
    }
    
    this.selectedRobotId = robotId;
    
    // Select new robot
    if (robotId && this.robots[robotId]) {
      const robot = this.robots[robotId];
      robot.mesh.material = this.selectedRobotMaterial;
      
      // Position the robot camera
      const pos = robot.position;
      this.robotCamera.position.set(pos.x, pos.y + 3, pos.z); // Slightly above robot
      this.robotCamera.lookAt(
        pos.x + robot.direction.x * 10,
        pos.y + 2,
        pos.z + robot.direction.z * 10
      );
      
      // Make camera helper visible
      this.robotCameraHelper.visible = true;
      
      // Dispatch event for UI
      const event = new CustomEvent('robotSelected', { detail: { robot: this.getRobotData(robotId) } });
      window.dispatchEvent(event);
    } else {
      // No robot selected
      this.robotCameraHelper.visible = false;
      
      // Dispatch event for UI
      const event = new CustomEvent('robotSelected', { detail: { robot: null } });
      window.dispatchEvent(event);
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
    const robotMeshes = Object.values(this.robots).map(robot => robot.mesh);
    
    // Check for intersections
    const intersects = this.raycaster.intersectObjects(robotMeshes);
    
    if (intersects.length > 0) {
      // Find clicked robot
      const robotId = intersects[0].object.userData.robotId;
      this.selectRobot(robotId);
      return true;
    } else {
      // Deselect if clicking empty space
      this.selectRobot(null);
      return false;
    }
  }
  
  // Update all robots
  update(deltaTime) {
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
      
      // Update position
      robot.position = {
        x: clampedX,
        y: terrainHeight + 5, // 5 units above terrain
        z: clampedZ
      };
      
      // Update mesh position
      robot.mesh.position.set(clampedX, terrainHeight + 5, clampedZ);
    });
    
    // Update selected robot camera
    if (this.selectedRobotId && this.robots[this.selectedRobotId]) {
      const robot = this.robots[this.selectedRobotId];
      const pos = robot.position;
      
      this.robotCamera.position.set(pos.x, pos.y + 3, pos.z);
      this.robotCamera.lookAt(
        pos.x + robot.direction.x * 10,
        pos.y + 2,
        pos.z + robot.direction.z * 10
      );
      
      // Update camera helper
      this.robotCameraHelper.update();
    }
  }
  
  // Get formatted robot data for UI
  getRobotData(robotId) {
    if (!robotId || !this.robots[robotId]) return null;
    
    const robot = this.robots[robotId];
    return {
      id: robot.id,
      position: {
        x: Math.round(robot.position.x),
        y: Math.round(robot.position.y),
        z: Math.round(robot.position.z)
      },
      task: robot.task,
      coordinates: {
        x: Math.round(robot.position.x + 1000), // Convert to 0-2000 range for UI
        z: Math.round(robot.position.z + 1000)
      },
      height: Math.round(robot.position.y - 5) // Actual terrain height
    };
  }
  
  // Set a new task for a robot
  setRobotTask(robotId, task) {
    if (robotId && this.robots[robotId]) {
      this.robots[robotId].task = task;
      
      // If selected, update UI
      if (robotId === this.selectedRobotId) {
        const event = new CustomEvent('robotUpdated', { 
          detail: { robot: this.getRobotData(robotId) } 
        });
        window.dispatchEvent(event);
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