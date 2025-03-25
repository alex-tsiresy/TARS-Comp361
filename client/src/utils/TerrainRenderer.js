import * as THREE from 'three';
import RobotManager from './RobotManager';
import CameraController from './CameraController';
import TerrainObjectManager from './TerrainObjectManager';
import RobotViewManager from './RobotViewManager';

/**
 * TerrainRenderer - Core 3D rendering class for the Mars terrain simulation
 * Refactored to use specialized manager classes for better separation of concerns
 */
class TerrainRenderer {
  constructor(container) {
    console.log('TerrainRenderer constructor called with container:', container);
    
    // Enable WebGL debugging
    if (typeof window !== 'undefined') {
      window.THREE = THREE;
      console.log('THREE debugging enabled');
    }
    
    // Core setup: scene, renderer, camera
    this.setupScene();
    this.setupRenderer(container);
    this.setupCamera(container);
    this.setupCoreLights();
    
    // Store container reference
    this.container = container;
    
    // Animation timing
    this.clock = new THREE.Clock();
    
    // Set up specialized managers
    this.initializeManagers();
    
    // Handle events
    this.setupEventListeners();
    
    // Animation loop
    this.animate();
  }
  
  /**
   * Set up the Three.js scene
   */
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);
  }
  
  /**
   * Set up the WebGL renderer
   */
  setupRenderer(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
  }
  
  /**
   * Set up the main camera
   */
  setupCamera(container) {
    this.camera = new THREE.PerspectiveCamera(
      60, 
      container.clientWidth / container.clientHeight, 
      0.1, 
      10000
    );
    this.camera.position.set(0, 500, 500);
    this.camera.lookAt(0, 0, 0);
  }
  
  /**
   * Set up core scene lighting
   */
  setupCoreLights() {
    // Ambient light - increase intensity for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(1000, 1000, 1000);
    directionalLight.castShadow = true;
    
    // Shadow settings
    directionalLight.shadow.camera.left = -1000;
    directionalLight.shadow.camera.right = 1000;
    directionalLight.shadow.camera.top = 1000;
    directionalLight.shadow.camera.bottom = -1000;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 3500;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    
    this.scene.add(directionalLight);
    
    // Add a secondary light source for better visibility
    const secondaryLight = new THREE.DirectionalLight(0xffffcc, 0.8);
    secondaryLight.position.set(-1000, 800, -1000);
    this.scene.add(secondaryLight);
  }
  
  /**
   * Initialize all manager components
   */
  initializeManagers() {
    // Camera controller for orbit controls
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    
    // Robot manager needs to be initialized first as other managers depend on it
    this.robotManager = new RobotManager(this.scene, this);
    
    // Object manager for terrain objects (rocks, beacons, etc.)
    this.objectManager = new TerrainObjectManager(this.scene, this);
    
    // View manager for robot-specific views (first-person and radar)
    this.viewManager = new RobotViewManager(this.scene, this, this.robotManager);
    
    // Define terrain size (used by various managers)
    this.terrainSize = 2000;
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Handle click events for robot selection
    if (this.container) {
      this.container.addEventListener('click', this.handleClick.bind(this));
    }
  }
  
  /**
   * Handle window resize
   */
  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    
    // Update core renderer
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    
    // Update camera via controller
    this.cameraController.handleResize(
      this.container.clientWidth, 
      this.container.clientHeight
    );
    
    // Update robot view renderers
    if (this.viewManager) {
      this.viewManager.handleResize();
    }
  }
  
  /**
   * Public method for handling resize (can be called from outside)
   */
  handleResize() {
    this.onWindowResize();
  }
  
  /**
   * Handle click events for robot selection
   */
  handleClick(event) {
    if (this.robotManager) {
      this.robotManager.handleClick(event, this.camera, this.renderer);
    }
  }
  
  /**
   * Load the terrain and initialize objects
   */
  loadTerrain() {
    // Early return if scene is disposed
    if (!this.scene) return;
    
    const textureLoader = new THREE.TextureLoader();
    
    // Load terrain textures
    Promise.all([
      textureLoader.loadAsync('rock01.jpg'),  // Color texture
      textureLoader.loadAsync('rock02.jpg'),  // Normal map
      textureLoader.loadAsync('/out.png')     // Height map
    ]).then(([colorTexture, normalTexture, heightMap]) => {
      // Check if component is still mounted
      if (!this.scene) return;
      
      // Configure texture wrapping
      colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping;
      normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
      colorTexture.repeat.set(50, 50);
      normalTexture.repeat.set(50, 50);
      
      // Create terrain geometry
      const geometry = new THREE.PlaneGeometry(
        this.terrainSize, 
        this.terrainSize, 
        256, 
        256
      );
      geometry.rotateX(-Math.PI / 2); // Make it horizontal
      
      // Create terrain material - add some emissive for better visibility
      const material = new THREE.MeshStandardMaterial({
        map: colorTexture,
        normalMap: normalTexture,
        displacementMap: heightMap,
        displacementScale: 300,
        roughness: 0.8,
        metalness: 0.2,
        emissive: 0x111111, // Very subtle emissive
        emissiveIntensity: 0.1
      });
      
      // Create and add terrain mesh - check again for null references
      if (this.scene) {
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);
        
        // Process heightmap for height sampling
        this.processHeightmap(heightMap);
        
        // Add grid helper via object manager
        this.objectManager.addGridHelper();
        
        // Add ambient objects via object manager
        this.objectManager.addAmbientObjects();
      } else {
        // Clean up resources if scene is gone
        geometry.dispose();
        material.dispose();
      }
    }).catch(error => {
      console.error('Error loading terrain textures:', error);
    });
  }
  
  /**
   * Process heightmap for height sampling
   */
  processHeightmap(heightMap) {
    // Create a canvas to read height data
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas size to match the heightmap
    canvas.width = heightMap.image.width;
    canvas.height = heightMap.image.height;
    
    // Draw the heightmap to the canvas
    context.drawImage(heightMap.image, 0, 0);
    
    // Store height data
    this.heightmapData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    this.heightmapWidth = canvas.width;
    this.heightmapHeight = canvas.height;
  }
  
  /**
   * Get height at a specific position on the terrain
   */
  getHeightAtPosition(x, z) {
    // If we don't have heightmap data yet, return a default height
    if (!this.heightmapData || !this.heightmapWidth || !this.heightmapHeight) {
      return 0;
    }
    
    try {
      // Convert world coordinates to terrain grid coordinates
      const gridSize = this.terrainSize / 2;
      
      // Normalize x and z to 0-1 range
      const normalizedX = (x + gridSize) / this.terrainSize;
      const normalizedZ = (z + gridSize) / this.terrainSize;
      
      // Calculate pixel coordinates in the heightmap
      const pixelX = Math.floor(normalizedX * this.heightmapWidth);
      const pixelZ = Math.floor(normalizedZ * this.heightmapHeight);
      
      // Validate pixel coordinates
      if (pixelX < 0 || pixelX >= this.heightmapWidth || pixelZ < 0 || pixelZ >= this.heightmapHeight) {
        return 0;
      }
      
      // Get pixel index in the heightmap data array
      const pixelIndex = (pixelZ * this.heightmapWidth + pixelX) * 4;
      
      // Get red channel value (0-255)
      const heightValue = this.heightmapData[pixelIndex];
      
      // Scale height value (0-255) to terrain height
      // Assuming max height is 300 (from displacementScale)
      const terrainHeight = (heightValue / 255) * 300;
      
      return terrainHeight;
    } catch (error) {
      console.error('Error calculating height from heightmap:', error);
      return 0;
    }
  }
  
  /**
   * Add a robot at a specific position
   */
  addRobotAtPosition(x, z) {
    if (!this.robotManager) {
      console.error('Robot manager not initialized');
      return null;
    }
    
    // Get terrain height at position
    const terrainHeight = this.getHeightAtPosition(x, z);
    
    // Use a minimum height to ensure robot is visible
    const actualHeight = Math.abs(terrainHeight) < 0.1 ? 20 : terrainHeight;
    
    // Position robot above terrain
    const y = actualHeight + 5;
    
    console.log(`Adding robot at (${x}, ${y}, ${z}) - Terrain height: ${terrainHeight}, Using height: ${actualHeight}`);
    
    return this.robotManager.addRobot({ x, y, z });
  }
  
  /**
   * Set up the first-person view renderer (delegate to view manager)
   */
  setupRobotViewRenderer(container) {
    if (this.viewManager) {
      this.viewManager.setupRobotViewRenderer(container);
    } else {
      console.error('View manager not initialized');
    }
  }
  
  /**
   * Set up the radar view renderer (delegate to view manager)
   */
  setupRadarRenderer(container) {
    if (this.viewManager) {
      this.viewManager.setupRadarRenderer(container);
    } else {
      console.error('View manager not initialized');
    }
  }
  
  /**
   * Get selected robot data
   */
  getSelectedRobot() {
    if (!this.robotManager || !this.robotManager.selectedRobotId) {
      return null;
    }
    
    return this.robotManager.getRobotData(this.robotManager.selectedRobotId);
  }
  
  /**
   * Set robot task
   */
  setRobotTask(robotId, task) {
    if (this.robotManager) {
      this.robotManager.setRobotTask(robotId, task);
    }
  }
  
  /**
   * Set robot capabilities
   */
  setRobotCapabilities(robotId, capabilities) {
    if (this.robotManager) {
      this.robotManager.setRobotCapabilities(robotId, capabilities);
    }
  }
  
  /**
   * Animation loop
   */
  animate() {
    // Store animation frame ID so we can cancel it during cleanup
    this._animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Skip animation if we're in cleanup process
    if (!this.renderer || !this.scene || !this.camera) return;
    
    // Get delta time
    const delta = this.clock.getDelta();
    
    // Update camera controls via controller
    if (this.cameraController) {
      this.cameraController.update();
    }
    
    // Update robots
    if (this.robotManager) {
      this.robotManager.update(delta * 1000); // Convert to milliseconds
    }
    
    // Render main view
    this.renderer.render(this.scene, this.camera);
    
    // Render robot views if a robot is selected
    if (this.robotManager && this.robotManager.selectedRobotId) {
      const selectedRobot = this.robotManager.robots[this.robotManager.selectedRobotId];
      if (this.viewManager) {
        this.viewManager.renderRobotViews(selectedRobot);
      }
    }
  }
  
  /**
   * Helper methods for zoom (delegate to camera controller)
   */
  zoomIn() {
    if (this.cameraController) {
      this.cameraController.zoomIn();
    }
  }
  
  zoomOut() {
    if (this.cameraController) {
      this.cameraController.zoomOut();
    }
  }
  
  /**
   * Clean up all resources
   */
  dispose() {
    console.log('TerrainRenderer dispose called');
    
    try {
      // Stop animation loop
      if (this._animationFrameId) {
        cancelAnimationFrame(this._animationFrameId);
        this._animationFrameId = null;
      }
      
      // Clean up event listeners
      window.removeEventListener('resize', this.onWindowResize);
      if (this.container) {
        this.container.removeEventListener('click', this.handleClick);
      }
      
      // Dispose all managers
      if (this.cameraController) this.cameraController.dispose();
      if (this.robotManager) this.robotManager.dispose();
      if (this.objectManager) this.objectManager.dispose();
      if (this.viewManager) this.viewManager.dispose();
      
      // Clean up terrain
      if (this.terrain) {
        if (this.terrain.geometry) this.terrain.geometry.dispose();
        if (this.terrain.material) this.terrain.material.dispose();
        if (this.scene) this.scene.remove(this.terrain);
      }
      
      // Clean up the scene
      if (this.scene) {
        this.scene.clear();
      }
      
      // Dispose of renderer
      if (this.renderer) {
        this.renderer.dispose();
        if (this.container && this.renderer.domElement && 
            this.renderer.domElement.parentNode === this.container) {
          this.container.removeChild(this.renderer.domElement);
        }
      }
    } catch (error) {
      console.error('Error in TerrainRenderer dispose:', error);
    } finally {
      // Null out references to avoid memory leaks
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.terrain = null;
      this.container = null;
      
      // Null out managers
      this.cameraController = null;
      this.robotManager = null;
      this.objectManager = null;
      this.viewManager = null;
      
      console.log('TerrainRenderer dispose completed');
    }
  }
}

export default TerrainRenderer; 