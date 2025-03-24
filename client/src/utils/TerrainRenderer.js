import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import RobotManager from './RobotManager';

class TerrainRenderer {
  constructor(container) {
    console.log('TerrainRenderer constructor called with container:', container);
    
    // Enable WebGL debugging
    if (typeof window !== 'undefined') {
      window.THREE = THREE;
      console.log('THREE debugging enabled');
    }
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);
    
    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      60, 
      container.clientWidth / container.clientHeight, 
      0.1, 
      10000
    );
    this.camera.position.set(0, 500, 500);
    this.camera.lookAt(0, 0, 0);
    
    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add to container
    this.container = container;
    container.appendChild(this.renderer.domElement);
    
    // Controls for bird's eye view
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 2; // Limit to horizon
    
    // Lighting
    this.setupLights();
    
    // Terrain
    this.terrain = null;
    this.terrainSize = 2000;
    
    // Robot manager - initialize after terrain is loaded
    this.robotManager = null;
    
    // For robot views
    this.robotViewRenderer = null;
    this.robotRadarRenderer = null;
    
    // Animation timing
    this.clock = new THREE.Clock();
    
    // Handle resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Handle click events for robot selection
    this.container.addEventListener('click', this.handleClick.bind(this));
    
    // Animation loop
    this.animate();
  }
  
  setupLights() {
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
        
        // Add grid helper for better spatial awareness
        const gridHelper = new THREE.GridHelper(this.terrainSize, 20, 0x555555, 0x333333);
        gridHelper.position.y = 1; // Slightly above terrain
        this.scene.add(gridHelper);
        
        // Initialize robot manager once terrain is ready
        this.robotManager = new RobotManager(this.scene, this);
        
        // Add a default directional marker for north
        const northMarker = this.createDirectionMarker(0x0000ff); // Blue for north
        northMarker.position.set(0, 50, -500);
        this.scene.add(northMarker);
        
        // Add ambient objects to make the scene more interesting/visible
        this.addAmbientObjects();
      } else {
        // Clean up resources if scene is gone
        geometry.dispose();
        material.dispose();
      }
    }).catch(error => {
      console.error('Error loading terrain textures:', error);
    });
  }
  
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
  
  // Add a special debug function to validate height data
  validateHeightData(x, z) {
    // If we don't have heightmap data yet, return a default height
    if (!this.heightmapData || !this.heightmapWidth || !this.heightmapHeight) {
      console.warn('No heightmap data available yet, using default height');
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
        console.warn(`Invalid pixel coordinates (${pixelX}, ${pixelZ}) for heightmap of size ${this.heightmapWidth}x${this.heightmapHeight}`);
        return 0;
      }
      
      // Get pixel index in the heightmap data array
      const pixelIndex = (pixelZ * this.heightmapWidth + pixelX) * 4;
      
      // Get red channel value (0-255)
      const heightValue = this.heightmapData[pixelIndex];
      
      // Scale height value (0-255) to terrain height
      // Assuming max height is 300 (from displacementScale)
      const terrainHeight = (heightValue / 255) * 300;
      
      console.log(`Height at (${x}, ${z}): ${terrainHeight} (pixel value: ${heightValue})`);
      
      return terrainHeight;
    } catch (error) {
      console.error('Error calculating height from heightmap:', error);
      return 0;
    }
  }
  
  getHeightAtPosition(x, z) {
    // Validate height data first
    const validatedHeight = this.validateHeightData(x, z);
    
    // If we have a valid height from the heightmap data, use it
    if (validatedHeight > 0) {
      return validatedHeight;
    }
    
    // Otherwise use the terrain mesh vertices
    if (!this.terrain) {
      console.warn('Terrain not loaded yet, returning default height');
      return 0;
    }
    
    try {
      // Convert world coordinates to terrain grid coordinates
      const gridSize = this.terrainSize / 2;
      
      // Normalize x and z to 0-1 range
      const normalizedX = (x + gridSize) / this.terrainSize;
      const normalizedZ = (z + gridSize) / this.terrainSize;
      
      // Get terrain vertices
      const vertices = this.terrain.geometry.attributes.position.array;
      
      // Calculate terrain grid resolution
      const resolution = Math.sqrt(vertices.length / 3);
      
      // Calculate grid position
      const gridX = Math.floor(normalizedX * (resolution - 1));
      const gridZ = Math.floor(normalizedZ * (resolution - 1));
      
      // Clamp to valid grid positions
      const clampedGridX = Math.max(0, Math.min(resolution - 2, gridX));
      const clampedGridZ = Math.max(0, Math.min(resolution - 2, gridZ));
      
      // Get heights at the four corners of the grid cell
      const idx00 = 3 * (clampedGridZ * resolution + clampedGridX) + 1; // +1 to get Y component
      const idx10 = 3 * (clampedGridZ * resolution + (clampedGridX + 1)) + 1;
      const idx01 = 3 * ((clampedGridZ + 1) * resolution + clampedGridX) + 1;
      const idx11 = 3 * ((clampedGridZ + 1) * resolution + (clampedGridX + 1)) + 1;
      
      const h00 = vertices[idx00];
      const h10 = vertices[idx10];
      const h01 = vertices[idx01];
      const h11 = vertices[idx11];
      
      // Calculate fractional position within the cell
      const fracX = normalizedX * (resolution - 1) - clampedGridX;
      const fracZ = normalizedZ * (resolution - 1) - clampedGridZ;
      
      // Bilinear interpolation
      const h0 = h00 * (1 - fracX) + h10 * fracX;
      const h1 = h01 * (1 - fracX) + h11 * fracX;
      
      // Log the intermediate values for debugging
      const result = h0 * (1 - fracZ) + h1 * fracZ;
      console.log(`Height at (${x}, ${z}) from terrain vertices: ${result}`);
      
      return result || 0; // Return 0 if result is NaN or undefined
    } catch (error) {
      console.error('Error calculating height from terrain vertices:', error);
      return 0;
    }
  }
  
  // Handle mouse clicks for robot selection
  handleClick(event) {
    if (this.robotManager) {
      this.robotManager.handleClick(event, this.camera, this.renderer);
    }
  }
  
  // Add a new robot
  addRobot() {
    if (!this.robotManager) {
      console.error('Robot manager not initialized');
      return null;
    }
    return this.robotManager.addRobot();
  }
  
  // Add a robot at a specific position
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
  
  // Get selected robot data
  getSelectedRobot() {
    if (!this.robotManager || !this.robotManager.selectedRobotId) {
      return null;
    }
    
    return this.robotManager.getRobotData(this.robotManager.selectedRobotId);
  }
  
  // Set robot task
  setRobotTask(robotId, task) {
    if (this.robotManager) {
      this.robotManager.setRobotTask(robotId, task);
    }
  }
  
  // Render robot views - make this more robust with extra error handling
  renderRobotViews() {
    if (!this.robotManager || !this.robotManager.selectedRobotId) return;
    
    const selectedRobot = this.robotManager.robots[this.robotManager.selectedRobotId];
    if (!selectedRobot) {
      console.warn('No selected robot found for views');
      return;
    }
    
    const robotPos = selectedRobot.position;
    const robotDir = selectedRobot.direction;
    
    if (!robotPos || !robotDir) {
      console.warn('Robot position or direction is undefined');
      return;
    }
    
    // --- First-person view ---
    if (this.robotViewRenderer) {
      try {
        // Position camera at robot's eye level
        this.robotManager.robotCamera.position.set(
          robotPos.x, 
          robotPos.y + 5, // Eye level
          robotPos.z
        );
        
        // Look in the direction the robot is facing
        this.robotManager.robotCamera.lookAt(
          robotPos.x + robotDir.x * 20,
          robotPos.y + 3, // Slightly above horizon
          robotPos.z + robotDir.z * 20
        );
        
        this.robotManager.robotCamera.near = 0.1;
        this.robotManager.robotCamera.far = 2000;
        this.robotManager.robotCamera.updateProjectionMatrix();
        
        // Ensure terrain is visible
        if (this.terrain) this.terrain.visible = true;
        
        // Update spotlight position
        if (this.robotSpotlight && this.spotlightTarget) {
          this.robotSpotlight.position.copy(this.robotManager.robotCamera.position);
          this.spotlightTarget.position.set(
            robotPos.x + robotDir.x * 20,
            robotPos.y + 2,
            robotPos.z + robotDir.z * 20
          );
        }
        
        // Position the FPV visibility box
        if (this.fpvVisibilityBox) {
          const dirVector = new THREE.Vector3();
          this.robotManager.robotCamera.getWorldDirection(dirVector);
          this.fpvVisibilityBox.position.copy(this.robotManager.robotCamera.position);
          this.fpvVisibilityBox.position.add(dirVector.multiplyScalar(30));
        }
        
        // Update the direction indicator
        if (this.fpvDirectionIndicator) {
          const dirVector = new THREE.Vector3();
          this.robotManager.robotCamera.getWorldDirection(dirVector);
          this.fpvDirectionIndicator.position.copy(this.robotManager.robotCamera.position);
          this.fpvDirectionIndicator.position.add(dirVector.multiplyScalar(20));
          this.fpvDirectionIndicator.rotation.copy(this.robotManager.robotCamera.rotation);
        }
        
        // Render with clear background
        this.robotViewRenderer.setClearColor(0x000000);
        this.robotViewRenderer.render(this.scene, this.robotManager.robotCamera);
      } catch (error) {
        console.error('Error rendering first-person view:', error);
      }
    }
    
    // --- Radar view (top-down) ---
    if (this.robotRadarRenderer) {
      try {
        // Create or update radar camera
        if (!this.radarCamera) {
          this.radarCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 1000);
        }
        
        // Position camera above robot
        this.radarCamera.position.set(
          robotPos.x, 
          robotPos.y + 200, 
          robotPos.z
        );
        this.radarCamera.lookAt(robotPos.x, robotPos.y, robotPos.z);
        this.radarCamera.near = 1;
        this.radarCamera.far = 1000;
        this.radarCamera.updateProjectionMatrix();
        
        // Ensure terrain is visible
        if (this.terrain) this.terrain.visible = true;
        
        // Update visibility circle position
        if (this.radarVisibilityCircle) {
          this.radarVisibilityCircle.position.set(
            robotPos.x,
            robotPos.y + 2,
            robotPos.z
          );
        }
        
        // Update spotlight
        if (this.radarSpotlight && this.radarSpotlightTarget) {
          this.radarSpotlight.position.set(robotPos.x, robotPos.y + 300, robotPos.z);
          this.radarSpotlightTarget.position.set(robotPos.x, robotPos.y, robotPos.z);
        }
        
        // Update direction indicator
        if (this.radarDirectionIndicator) {
          this.radarDirectionIndicator.position.set(robotPos.x, robotPos.y + 1, robotPos.z);
          this.radarDirectionIndicator.rotation.y = Math.atan2(robotDir.z, robotDir.x);
        }
        
        // Render with clear background
        this.robotRadarRenderer.setClearColor(0x000000);
        this.robotRadarRenderer.render(this.scene, this.radarCamera);
      } catch (error) {
        console.error('Error rendering radar view:', error);
      }
    }
  }
  
  // Set up robot view renderer
  setupRobotViewRenderer(container) {
    console.log('Setting up robot view renderer');
    
    // Clean up existing renderer
    this.cleanupRenderer(this.robotViewRenderer, this.robotViewContainer);
    
    try {
      // Create new renderer
      this.robotViewRenderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
      });
      this.robotViewRenderer.setSize(container.clientWidth, container.clientHeight);
      this.robotViewRenderer.shadowMap.enabled = true;
      this.robotViewRenderer.setClearColor(0x111111);
      
      // Add to container
      this.clearAndAppendRenderer(container, this.robotViewRenderer);
      this.robotViewContainer = container;
      
      // Update camera aspect ratio
      if (this.robotManager && this.robotManager.robotCamera) {
        this.robotManager.robotCamera.aspect = container.clientWidth / container.clientHeight;
        this.robotManager.robotCamera.updateProjectionMatrix();
      }
      
      // Create spotlight for robot view if needed
      if (!this.robotSpotlight) {
        this.createRobotSpotlight();
      }
      
      // Create visibility box if it doesn't exist
      if (!this.fpvVisibilityBox) {
        this.createFPVVisibilityBox();
      }
      
      // Create direction indicator if it doesn't exist
      if (!this.fpvDirectionIndicator) {
        this.createFPVDirectionIndicator();
      }
      
      console.log('Robot view renderer ready');
    } catch (error) {
      console.error('Error setting up robot view renderer:', error);
    }
  }
  
  // Set up radar view renderer
  setupRadarRenderer(container) {
    console.log('Setting up radar renderer');
    
    // Clean up existing renderer
    this.cleanupRenderer(this.robotRadarRenderer, this.robotRadarContainer);
    
    try {
      // Create new renderer
      this.robotRadarRenderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
      });
      this.robotRadarRenderer.setSize(container.clientWidth, container.clientHeight);
      this.robotRadarRenderer.shadowMap.enabled = true;
      this.robotRadarRenderer.setClearColor(0x111111);
      
      // Add to container
      this.clearAndAppendRenderer(container, this.robotRadarRenderer);
      this.robotRadarContainer = container;
      
      // Create spotlight for radar view if needed
      if (!this.radarSpotlight) {
        this.createRadarSpotlight();
      }
      
      // Create visibility circle if it doesn't exist
      if (!this.radarVisibilityCircle) {
        this.createRadarVisibilityCircle();
      }
      
      // Create direction indicator if it doesn't exist
      if (!this.radarDirectionIndicator) {
        this.createRadarDirectionIndicator();
      }
      
      console.log('Radar renderer ready');
    } catch (error) {
      console.error('Error setting up radar renderer:', error);
    }
  }
  
  // Helper method to clean up a renderer
  cleanupRenderer(renderer, container) {
    if (renderer && container) {
      try {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      } catch (error) {
        console.error('Error cleaning up renderer:', error);
      }
    }
  }
  
  // Helper method to clear container and append renderer
  clearAndAppendRenderer(container, renderer) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);
  }
  
  // Create spotlight for robot view
  createRobotSpotlight() {
    this.robotSpotlight = new THREE.SpotLight(0xffffff, 3);
    this.robotSpotlight.angle = Math.PI / 3;
    this.robotSpotlight.penumbra = 0.5;
    this.robotSpotlight.decay = 1;
    this.robotSpotlight.distance = 300;
    this.robotSpotlight.castShadow = true;
    
    // Create a target for the spotlight
    this.spotlightTarget = new THREE.Object3D();
    this.scene.add(this.spotlightTarget);
    this.robotSpotlight.target = this.spotlightTarget;
    
    this.scene.add(this.robotSpotlight);
    console.log('Added robot spotlight');
  }
  
  // Create spotlight for radar view
  createRadarSpotlight() {
    this.radarSpotlight = new THREE.SpotLight(0xffffff, 5);
    this.radarSpotlight.angle = Math.PI / 2;
    this.radarSpotlight.penumbra = 0.5;
    this.radarSpotlight.decay = 1;
    this.radarSpotlight.distance = 1000;
    this.radarSpotlight.castShadow = true;
    
    // Create a target for the spotlight
    this.radarSpotlightTarget = new THREE.Object3D();
    this.scene.add(this.radarSpotlightTarget);
    this.radarSpotlight.target = this.radarSpotlightTarget;
    
    this.scene.add(this.radarSpotlight);
    console.log('Added radar spotlight');
  }
  
  // Create visibility box for first-person view
  createFPVVisibilityBox() {
    const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
    const boxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      wireframe: true
    });
    this.fpvVisibilityBox = new THREE.Mesh(boxGeometry, boxMaterial);
    this.scene.add(this.fpvVisibilityBox);
    console.log('Added visibility box to first-person view');
  }
  
  // Create direction indicator for first-person view
  createFPVDirectionIndicator() {
    const geometry = new THREE.ConeGeometry(2, 6, 4);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      wireframe: true
    });
    this.fpvDirectionIndicator = new THREE.Mesh(geometry, material);
    this.fpvDirectionIndicator.userData.isHelper = true;
    this.scene.add(this.fpvDirectionIndicator);
    console.log('Added direction indicator to first-person view');
  }
  
  // Create visibility circle for radar view
  createRadarVisibilityCircle() {
    const circleGeometry = new THREE.RingGeometry(20, 25, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      side: THREE.DoubleSide
    });
    this.radarVisibilityCircle = new THREE.Mesh(circleGeometry, circleMaterial);
    this.radarVisibilityCircle.rotation.x = Math.PI / 2; // Make it horizontal
    this.scene.add(this.radarVisibilityCircle);
    console.log('Added visibility circle to radar view');
  }
  
  // Create direction indicator for radar view
  createRadarDirectionIndicator() {
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 30)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.radarDirectionIndicator = new THREE.Line(geometry, material);
    this.radarDirectionIndicator.userData.isHelper = true;
    this.scene.add(this.radarDirectionIndicator);
    console.log('Added direction indicator to radar view');
  }
  
  onWindowResize() {
    // Skip resize if required objects aren't available
    if (!this.container || !this.camera || !this.renderer) return;
    
    // Update camera
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    
    // Update renderer
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    
    // Update robot view renderers
    if (this.robotViewRenderer && this.robotViewContainer) {
      this.robotViewRenderer.setSize(
        this.robotViewContainer.clientWidth,
        this.robotViewContainer.clientHeight
      );
    }
    
    if (this.robotRadarRenderer && this.robotRadarContainer) {
      this.robotRadarRenderer.setSize(
        this.robotRadarContainer.clientWidth,
        this.robotRadarContainer.clientHeight
      );
    }
  }
  
  animate() {
    // Store animation frame ID so we can cancel it during cleanup
    this._animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Skip animation if we're in cleanup process
    if (!this.renderer || !this.scene || !this.camera) return;
    
    // Get delta time
    const delta = this.clock.getDelta();
    
    // Update controls
    if (this.controls) {
      this.controls.update();
    }
    
    // Update robots
    if (this.robotManager) {
      this.robotManager.update(delta * 1000); // Convert to milliseconds
    }
    
    // Render main view
    this.renderer.render(this.scene, this.camera);
    
    // Render robot views if a robot is selected
    if (this.robotManager && this.robotManager.selectedRobotId) {
      this.renderRobotViews();
    }
  }
  
  // Helper methods for zoom
  zoomIn() {
    const position = this.camera.position.clone();
    position.multiplyScalar(0.9);
    this.camera.position.copy(position);
  }
  
  zoomOut() {
    const position = this.camera.position.clone();
    position.multiplyScalar(1.1);
    this.camera.position.copy(position);
  }
  
  dispose() {
    console.log('TerrainRenderer dispose called');
    
    try {
      // Stop animation loop
      if (this._animationFrameId) {
        cancelAnimationFrame(this._animationFrameId);
        this._animationFrameId = null;
      }
      
      // Clean up resources
      if (this.controls) {
        this.controls.dispose();
      }
      
      // Clean up event listeners
      window.removeEventListener('resize', this.onWindowResize);
      if (this.container) {
        this.container.removeEventListener('click', this.handleClick);
      }
      
      // Clean up robot manager if it exists
      if (this.robotManager) {
        try {
          // Clean up any robot-specific resources
          Object.values(this.robotManager.robots || {}).forEach(robot => {
            try {
              if (robot.mesh) {
                if (robot.mesh.geometry) robot.mesh.geometry.dispose();
                if (robot.mesh.material) robot.mesh.material.dispose();
                if (this.scene) this.scene.remove(robot.mesh);
              }
            } catch (robotError) {
              console.error('Error cleaning up robot:', robotError);
            }
          });
        } catch (robotManagerError) {
          console.error('Error cleaning up robot manager:', robotManagerError);
        }
      }
      
      // Clean up scenes
      if (this.scene) {
        try {
          this.scene.clear();
        } catch (sceneError) {
          console.error('Error clearing scene:', sceneError);
        }
      }
      
      // Dispose of renderers to free up WebGL contexts
      // Main renderer
      try {
        if (this.renderer) {
          this.renderer.dispose();
          if (this.container && this.renderer.domElement && this.renderer.domElement.parentNode === this.container) {
            this.container.removeChild(this.renderer.domElement);
          }
        }
      } catch (rendererError) {
        console.error('Error disposing main renderer:', rendererError);
      }
      
      // Robot view renderer
      try {
        if (this.robotViewRenderer) {
          this.robotViewRenderer.dispose();
          if (this.robotViewContainer && this.robotViewRenderer.domElement && 
              this.robotViewRenderer.domElement.parentNode === this.robotViewContainer) {
            this.robotViewContainer.removeChild(this.robotViewRenderer.domElement);
          }
        }
      } catch (robotViewError) {
        console.error('Error disposing robot view renderer:', robotViewError);
      }
      
      // Radar renderer
      try {
        if (this.robotRadarRenderer) {
          this.robotRadarRenderer.dispose();
          if (this.robotRadarContainer && this.robotRadarRenderer.domElement && 
              this.robotRadarRenderer.domElement.parentNode === this.robotRadarContainer) {
            this.robotRadarContainer.removeChild(this.robotRadarRenderer.domElement);
          }
        }
      } catch (radarError) {
        console.error('Error disposing radar renderer:', radarError);
      }
    } catch (error) {
      console.error('Error in TerrainRenderer dispose:', error);
    } finally {
      // Null out references to avoid memory leaks
      this.renderer = null;
      this.robotViewRenderer = null;
      this.robotRadarRenderer = null;
      this.controls = null;
      this.robotManager = null;
      this.scene = null;
      this.camera = null;
      this.robotCamera = null;
      this.terrain = null;
      this.container = null;
      this.robotViewContainer = null;
      this.robotRadarContainer = null;
      console.log('TerrainRenderer dispose completed');
    }
  }
  
  // Create a direction marker
  createDirectionMarker(color) {
    const group = new THREE.Group();
    
    // Create arrow
    const arrowHeight = 30;
    const coneGeometry = new THREE.ConeGeometry(5, 15, 8);
    const coneMaterial = new THREE.MeshStandardMaterial({ 
      color: color,
      emissive: color,
      emissiveIntensity: 0.5
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = arrowHeight / 2;
    cone.rotation.x = Math.PI;
    group.add(cone);
    
    // Create shaft
    const cylinderGeometry = new THREE.CylinderGeometry(2, 2, arrowHeight, 8);
    const cylinder = new THREE.Mesh(cylinderGeometry, coneMaterial);
    cylinder.position.y = -arrowHeight / 2;
    group.add(cylinder);
    
    return group;
  }
  
  // Add some recognizable objects to the terrain
  addAmbientObjects() {
    console.log('Adding ambient objects to terrain...');
    
    // Add a large platform at the center for reference
    const platformGeometry = new THREE.BoxGeometry(50, 10, 50);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0x220000,
      emissiveIntensity: 0.5
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(0, 5, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.scene.add(platform);
    console.log('Added central platform at (0, 5, 0)');
    
    // Add some large rocks
    for (let i = 0; i < 20; i++) {
      const size = Math.random() * 30 + 10;
      const x = (Math.random() - 0.5) * 1800;
      const z = (Math.random() - 0.5) * 1800;
      const y = this.getHeightAtPosition(x, z);
      
      const rockGeometry = new THREE.SphereGeometry(size, 6, 4);
      const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
        emissive: 0x222222,
        emissiveIntensity: 0.2
      });
      
      // Distort the geometry for a more natural rock look
      const positions = rockGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positions, i);
        
        // Add some noise to the vertex
        vertex.x += (Math.random() - 0.5) * 4;
        vertex.y += (Math.random() - 0.5) * 4;
        vertex.z += (Math.random() - 0.5) * 4;
        
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      
      rockGeometry.computeVertexNormals();
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(x, y + size / 2, z);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
    
    // Add some beacons/markers (bright emissive pillars)
    const beaconColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    for (let i = 0; i < 8; i++) {
      const x = -800 + i * 200; // Place in a line for easier visibility
      const z = 0;
      const y = this.getHeightAtPosition(x, z);
      const color = beaconColors[i % beaconColors.length];
      
      const beaconGeometry = new THREE.CylinderGeometry(2, 2, 40, 8);
      const beaconMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8
      });
      
      const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
      beacon.position.set(x, y + 20, z);
      beacon.castShadow = true;
      
      // Add a light at the top of the beacon
      const beaconLight = new THREE.PointLight(color, 1, 100);
      beaconLight.position.set(0, 25, 0);
      beacon.add(beaconLight);
      
      this.scene.add(beacon);
      console.log(`Added beacon at (${x}, ${y+20}, ${z}) with color 0x${color.toString(16)}`);
    }
    
    // Add some floating markers that will always be visible
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 1600;
      const z = (Math.random() - 0.5) * 1600;
      const y = this.getHeightAtPosition(x, z) + 50; // Float high above terrain
      
      const markerGeometry = new THREE.SphereGeometry(10, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        wireframe: true
      });
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(x, y, z);
      this.scene.add(marker);
      
      console.log(`Added floating marker at (${x}, ${y}, ${z})`);
    }
  }
}

export default TerrainRenderer; 