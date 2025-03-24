import * as THREE from 'three';
import CameraController from './CameraController';
import RobotManager from './RobotManager';
import RobotViewManager from './RobotViewManager';
import { InputHandler } from './InputHandler';
import bridgeService from '../context/BridgeService';

class TerrainExplorer {
  constructor(container) {
    // Core properties
    this.container = container;
    this.heightOffset = 2.0; // height above terrain
    
    // Initialize scene
    this.initScene();
    
    // Initialize managers
    this.cameraController = new CameraController(this.scene, this.camera, this.container);
    this.robotManager = new RobotManager(this.scene);
    this.robotViewManager = new RobotViewManager(this.scene, this.renderer, this.robotManager);
    this.inputHandler = new InputHandler(
      this.container, 
      this.camera,
      this.renderer.domElement,
      this.handleMovement.bind(this)
    );
    
    // Initialize terrain
    this.initTerrain();
    
    // Start animation loop
    this.animate();
  }

  initScene() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      this.container.clientWidth / this.container.clientHeight, 
      0.1, 
      10000
    );
    this.camera.position.set(0, 50, 0);

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.container.appendChild(this.renderer.domElement);
    
    // Setup lights
    this.setupLights();
    
    // Setup position tracking
    this.position = new THREE.Vector3(0, 50, 0);
    this.direction = new THREE.Vector3(0, 0, -1);
    
    // Setup resizing
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight("white", 1);
    directionalLight.castShadow = true;
    directionalLight.position.set(1000, 1000, 0);
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    const d = 2000;
    directionalLight.shadow.camera.left = -d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = -d;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 5000;
    directionalLight.shadow.bias = -0.0001;
    this.scene.add(directionalLight);
  }

  initTerrain() {
    // Initialize terrain data
    this.terrainMesh = null;
    this.heightCanvas = document.createElement('canvas');
    this.heightContext = this.heightCanvas.getContext('2d');
    this.heightmapData = null;
    
    // Load terrain
    this.loadTerrain();
  }

  loadTerrain() {
    const textureLoader = new THREE.TextureLoader();

    // Load textures
    const colorTexture = textureLoader.load('rock01.jpg');
    const normalTexture = textureLoader.load('rock02.jpg');

    // Configure texture wrapping
    colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
    colorTexture.repeat.set(50, 50);
    normalTexture.repeat.set(50, 50);

    // Load heightmap
    textureLoader.load(
      '/out.png',
      (heightmapTexture) => {
        heightmapTexture.minFilter = THREE.LinearFilter;
        this.setupHeightmap(heightmapTexture);
        this.createTerrain(colorTexture, normalTexture, heightmapTexture);
      },
      undefined,
      (error) => console.error('Error loading heightmap:', error)
    );
  }

  setupHeightmap(heightmapTexture) {
    const img = heightmapTexture.image;
    this.heightCanvas.width = img.width;
    this.heightCanvas.height = img.height;
    this.heightContext.drawImage(img, 0, 0);
    this.heightmapData = this.heightContext.getImageData(0, 0, img.width, img.height).data;
  }

  createTerrain(colorTexture, normalTexture, heightmapTexture) {
    const terrainWidth = 2000;
    const terrainHeight = 2000;
    const segments = 1024;

    const geometry = new THREE.PlaneGeometry(terrainWidth, terrainHeight, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      map: colorTexture,
      normalMap: normalTexture,
      displacementMap: heightmapTexture,
      displacementScale: 300,
      roughness: 1.0,
      metalness: 0.0
    });

    // Shader for distance fading
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = `
        uniform float nearDistance;
        uniform float farDistance;
        uniform vec3 plainColor;
        ${shader.fragmentShader}
      `;

      shader.uniforms.nearDistance = { value: 50.0 };
      shader.uniforms.farDistance = { value: 500.0 };
      shader.uniforms.plainColor = { value: new THREE.Color("orange") };

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
          float d = length(vViewPosition);
          float blendFactor = smoothstep(nearDistance, farDistance, d);
          float lum = dot(gl_FragColor.rgb, vec3(0.3333));
          vec3 litPlainColor = plainColor * lum;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, litPlainColor, blendFactor);
          #include <dithering_fragment>
        `
      );
    };

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.castShadow = true;
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  getHeightAtPosition(x, z) {
    if (!this.heightmapData) return 0;

    const halfWidth = 1000;
    const halfHeight = 1000;

    const u = ((x + halfWidth) / 2000) * this.heightCanvas.width;
    const v = ((z + halfHeight) / 2000) * this.heightCanvas.height;

    const px = Math.floor(Math.max(0, Math.min(this.heightCanvas.width - 1, u)));
    const py = Math.floor(Math.max(0, Math.min(this.heightCanvas.height - 1, v)));

    const index = (py * this.heightCanvas.width + px) * 4;
    const height = this.heightmapData[index] / 255.0;

    return height * 300;
  }

  handleMovement(moveDelta) {
    if (!this.heightmapData) return;
    
    if (moveDelta.length() > 0) {
      // Calculate new position
      const newX = this.position.x + moveDelta.x;
      const newZ = this.position.z + moveDelta.z;

      // Clamp to terrain bounds
      const halfTerrainSize = 1000;
      const clampedX = Math.max(-halfTerrainSize + 1, Math.min(halfTerrainSize - 1, newX));
      const clampedZ = Math.max(-halfTerrainSize + 1, Math.min(halfTerrainSize - 1, newZ));

      // Get terrain height at new position
      const terrainHeight = this.getHeightAtPosition(clampedX, clampedZ);

      // Update position
      this.position.set(clampedX, terrainHeight + this.heightOffset, clampedZ);

      // Update camera position
      this.camera.position.copy(this.position);
    }
  }

  handleResize() {
    if (this.container) {
      // Update camera and renderer
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      
      // Also notify robot view manager
      this.robotViewManager.handleResize();
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    const now = Date.now();
    const deltaTime = now - (this.lastTime || now);
    this.lastTime = now;

    // Update input and movement
    this.inputHandler.update();
    
    // Update robots
    this.robotManager.update(deltaTime, this.getHeightAtPosition.bind(this));
    
    // Render main view
    this.renderer.render(this.scene, this.camera);
    
    // Render robot views
    this.robotViewManager.renderViews();
  }

  // Bridge methods for backward compatibility
  setupRobotViewRenderer(container) {
    if (this.robotViewManager) {
      this.robotViewManager.setupRobotViewRenderer(container);
    }
  }
  
  setupRadarRenderer(container) {
    if (this.robotViewManager) {
      this.robotViewManager.setupRadarRenderer(container);
    }
  }
  
  // Helper method to get the selected robot (for compatibility)
  getSelectedRobot() {
    if (this.robotManager && this.robotManager.selectedRobotId) {
      return this.robotManager.robots[this.robotManager.selectedRobotId];
    }
    return null;
  }
  
  // Set task for a robot (for compatibility)
  setRobotTask(robotId, task) {
    if (this.robotManager && robotId && this.robotManager.robots[robotId]) {
      this.robotManager.robots[robotId].task = task;
      
      // Use BridgeService to notify about the robot update
      const robot = this.robotManager.getRobotData(robotId);
      bridgeService.notifyRobotUpdated(robot);
      
      return true;
    }
    return false;
  }
}

export { TerrainExplorer };
