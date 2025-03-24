import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import RobotManager from './RobotManager';

class TerrainRenderer {
  constructor(container) {
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
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
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
      
      // Create terrain material
      const material = new THREE.MeshStandardMaterial({
        map: colorTexture,
        normalMap: normalTexture,
        displacementMap: heightMap,
        displacementScale: 300,
        roughness: 0.8,
        metalness: 0.2
      });
      
      // Create and add terrain mesh - check again for null references
      if (this.scene) {
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);
        
        // Process heightmap for height sampling
        this.processHeightmap(heightMap);
        
        // Initialize robot manager once terrain is ready
        this.robotManager = new RobotManager(this.scene, this);
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
  
  getHeightAtPosition(x, z) {
    if (!this.heightmapData) return 0;
    
    // Convert world coordinates to heightmap coordinates
    const halfSize = this.terrainSize / 2;
    const u = ((x + halfSize) / this.terrainSize) * this.heightmapWidth;
    const v = ((z + halfSize) / this.terrainSize) * this.heightmapHeight;
    
    // Get pixel coordinates
    const px = Math.floor(Math.max(0, Math.min(this.heightmapWidth - 1, u)));
    const py = Math.floor(Math.max(0, Math.min(this.heightmapHeight - 1, v)));
    
    // Get pixel data
    const index = (py * this.heightmapWidth + px) * 4;
    const height = this.heightmapData[index] / 255.0;
    
    return height * 300; // Scale to match displacement scale
  }
  
  // Handle mouse clicks for robot selection
  handleClick(event) {
    if (this.robotManager) {
      this.robotManager.handleClick(event, this.camera, this.renderer);
    }
  }
  
  // Add a new robot
  addRobot() {
    if (!this.robotManager) return null;
    
    const robotId = this.robotManager.createRobot();
    return this.robotManager.getRobotData(robotId);
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
  
  // Set up robot view renderer
  setupRobotViewRenderer(container) {
    // Clean up existing renderer if it exists
    if (this.robotViewRenderer && this.robotViewContainer) {
      this.robotViewContainer.removeChild(this.robotViewRenderer.domElement);
      this.robotViewRenderer.dispose();
      this.robotViewRenderer = null;
    }
    
    // Create new renderer
    this.robotViewRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.robotViewRenderer.setSize(container.clientWidth, container.clientHeight);
    this.robotViewRenderer.shadowMap.enabled = true;
    container.appendChild(this.robotViewRenderer.domElement);
    this.robotViewContainer = container;
  }
  
  // Set up radar view renderer
  setupRadarRenderer(container) {
    // Clean up existing renderer if it exists
    if (this.robotRadarRenderer && this.robotRadarContainer) {
      this.robotRadarContainer.removeChild(this.robotRadarRenderer.domElement);
      this.robotRadarRenderer.dispose();
      this.robotRadarRenderer = null;
    }
    
    // Create new renderer
    this.robotRadarRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.robotRadarRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.robotRadarRenderer.domElement);
    this.robotRadarContainer = container;
  }
  
  // Render robot views
  renderRobotViews() {
    if (!this.robotManager) return;
    
    // First-person view
    if (this.robotViewRenderer && this.robotManager.selectedRobotId) {
      this.robotViewRenderer.render(this.scene, this.robotManager.robotCamera);
    }
    
    // Radar view (top-down)
    if (this.robotRadarRenderer && this.robotManager.selectedRobotId) {
      const robot = this.robotManager.robots[this.robotManager.selectedRobotId];
      if (robot) {
        // Create a top-down orthographic camera for radar view
        const radarCamera = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 1000);
        radarCamera.position.set(robot.position.x, robot.position.y + 50, robot.position.z);
        radarCamera.lookAt(robot.position.x, robot.position.y, robot.position.z);
        
        this.robotRadarRenderer.render(this.scene, radarCamera);
      }
    }
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
    
    // Render robot views
    this.renderRobotViews();
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
}

export default TerrainRenderer; 