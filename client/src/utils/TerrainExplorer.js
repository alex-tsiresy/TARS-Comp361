import * as THREE from 'three';

class TerrainExplorer {
  constructor(container) {
    //initiate the scene object
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    //setup cam
    this.camera = new THREE.PerspectiveCamera(
      75, 
      container.clientWidth / container.clientHeight, 
      0.1, 
      10000
    );
    this.camera.position.set(0, 50, 0);

    //setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Store container reference for resize
    this.container = container;

    container.appendChild(this.renderer.domElement);

    this.setupLights();

    //movement controls
    this.moveSpeed = 2.0;
    this.rotateSpeed = 0.03;
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };

    // Flags to disable controls
    this.disableKeyboardControls = false;
    this.disablePointerLock = false;

    //camera position
    this.position = new THREE.Vector3(0, 50, 0);
    this.direction = new THREE.Vector3(0, 0, -1);
    this.heightOffset = 2.0; //height above terrain

    //terrain data
    this.terrainMesh = null;
    this.heightCanvas = document.createElement('canvas');
    this.heightContext = this.heightCanvas.getContext('2d');
    this.heightmapData = null;

    this.isPointerLocked = false;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.PI_2 = Math.PI / 2;
    this.mouseSpeed = 0.002;

    // Robot data
    this.robots = {};
    this.selectedRobotId = null;
    this.robotMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    this.selectedRobotMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    
    // First person view camera for robot
    this.robotCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.robotCameraHelper = new THREE.CameraHelper(this.robotCamera);
    this.scene.add(this.robotCameraHelper);
    this.robotCameraHelper.visible = false;

    // Robot view renderer
    this.robotViewRenderer = null;
    this.robotRadarRenderer = null;

    //event listeners
    this.setupEventListeners();

    this.init();
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    //setup the light, i tried to make it look like the sun
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

  setupEventListeners() {
    //for control
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
        this.keys[e.key.toLowerCase()] = true;
      }
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
        this.keys[e.key.toLowerCase()] = false;
      }
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = false;
      }
    });

    //for the mouse - only add this listener if pointer lock is enabled
    this.renderer.domElement.addEventListener('click', () => {
      if (!this.disablePointerLock && !this.isPointerLocked) {
        this.renderer.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.renderer.domElement);
    });

    document.addEventListener('mousemove', (event) => {
      if (this.isPointerLocked) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.euler.y -= movementX * this.mouseSpeed;
        this.euler.x -= movementY * this.mouseSpeed;

        //clamp vertical rotation
        this.euler.x = Math.max(-this.PI_2 + 0.1, Math.min(this.PI_2 - 0.1, this.euler.x));

        //update camera rotation
        this.camera.quaternion.setFromEuler(this.euler);

        //update direction vector for movement
        this.direction.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
      }
    });

    window.addEventListener('resize', () => {
      if (this.container) {
        // Use container dimensions instead of window
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        
        // Also update robot view renderers if they exist
        if (this.robotViewRenderer && this.robotViewContainer) {
          this.robotViewRenderer.setSize(this.robotViewContainer.clientWidth, this.robotViewContainer.clientHeight);
        }
        
        if (this.robotRadarRenderer && this.robotRadarContainer) {
          this.robotRadarRenderer.setSize(this.robotRadarContainer.clientWidth, this.robotRadarContainer.clientHeight);
        }
      }
    });

    // Add event listener for robot selection
    this.renderer.domElement.addEventListener('mousedown', (event) => {
      this.selectRobotFromClick(event);
    });
  }

  init() {
    //load terrain
    this.loadTerrain();

    //start animation loop
    this.animate();
  }

  loadTerrain() {
    const textureLoader = new THREE.TextureLoader();

    //load textures
    const colorTexture = textureLoader.load('rock01.jpg');
    const normalTexture = textureLoader.load('rock02.jpg');

    //configure texture wrapping
    colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
    colorTexture.repeat.set(50, 50);
    normalTexture.repeat.set(50, 50);

    //load heightmap
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

    //ai generated: tried to come up with shaders that would create an organge color in teh background
    //but the rock texture closeby
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


  //this should allow our avatar to stay a certain distance above the terrain height (urface)
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

  updateMovement() {
    if (!this.heightmapData || this.disableKeyboardControls) return;

    //calculate movement speed
    const currentSpeed = this.moveSpeed;

    //get forward and right vectors from camera direction
    const forward = new THREE.Vector3();
    forward.copy(this.direction);
    forward.y = 0; //keep movement on xz plane
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

    //calculate movement delta
    const moveDelta = new THREE.Vector3(0, 0, 0);

    //forward/backward
    if (this.keys.w || this.keys.ArrowUp) {
      moveDelta.add(forward.multiplyScalar(currentSpeed));
    }
    if (this.keys.s || this.keys.ArrowDown) {
      moveDelta.sub(forward.multiplyScalar(currentSpeed));
    }

    //left/right strafing
    if (this.keys.a || this.keys.ArrowLeft) {
      moveDelta.add(right.multiplyScalar(currentSpeed));
    }
    if (this.keys.d || this.keys.ArrowRight) {
      moveDelta.sub(right.multiplyScalar(currentSpeed));
    }

    //apply movement
    if (moveDelta.length() > 0) {
      //calculate new position
      const newX = this.position.x + moveDelta.x;
      const newZ = this.position.z + moveDelta.z;

      //clamp to terrain bounds
      const halfTerrainSize = 1000;
      const clampedX = Math.max(-halfTerrainSize + 1, Math.min(halfTerrainSize - 1, newX));
      const clampedZ = Math.max(-halfTerrainSize + 1, Math.min(halfTerrainSize - 1, newZ));

      //get terrain height at new position
      const terrainHeight = this.getHeightAtPosition(clampedX, clampedZ);

      //update position
      this.position.set(clampedX, terrainHeight + this.heightOffset, clampedZ);

      //update camera position
      this.camera.position.copy(this.position);
    }
  }

  // Robot methods
  addRobot(robotData) {
    const { id, position } = robotData;
    
    // Create a robot mesh
    const geometry = new THREE.SphereGeometry(5, 16, 16);
    const mesh = new THREE.Mesh(geometry, this.robotMaterial);
    
    // Position the robot
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add to scene
    this.scene.add(mesh);
    
    // Store robot data
    this.robots[id] = {
      ...robotData,
      mesh,
      direction: new THREE.Vector3(1, 0, 0), // Default direction
      speed: 0.5, // Movement speed
      moveTimer: 0, // Timer for random movement
      moveInterval: Math.random() * 5000 + 2000 // Random interval for direction change
    };
    
    return id;
  }
  
  selectRobot(robotId) {
    // Deselect previous robot
    if (this.selectedRobotId && this.robots[this.selectedRobotId]) {
      this.robots[this.selectedRobotId].mesh.material = this.robotMaterial;
    }
    
    // Select new robot
    this.selectedRobotId = robotId;
    
    if (robotId && this.robots[robotId]) {
      this.robots[robotId].mesh.material = this.selectedRobotMaterial;
      
      // Set up the robot camera
      const robotPos = this.robots[robotId].mesh.position;
      this.robotCamera.position.set(robotPos.x, robotPos.y + 2, robotPos.z);
      this.robotCamera.lookAt(
        robotPos.x + this.robots[robotId].direction.x * 10,
        robotPos.y + 2,
        robotPos.z + this.robots[robotId].direction.z * 10
      );
    }
  }
  
  selectRobotFromClick(event) {
    if (this.isPointerLocked) return; // Don't select when in pointer lock mode
    
    // Calculate mouse position in normalized device coordinates
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    // Get all robot meshes
    const robotMeshes = Object.values(this.robots).map(robot => robot.mesh);
    
    // Check for intersections
    const intersects = raycaster.intersectObjects(robotMeshes);
    
    if (intersects.length > 0) {
      // Find which robot was clicked
      const clickedMesh = intersects[0].object;
      const clickedRobot = Object.values(this.robots).find(robot => robot.mesh === clickedMesh);
      
      if (clickedRobot) {
        this.selectRobot(clickedRobot.id);
        
        // Dispatch custom event for robot selection
        const event = new CustomEvent('robotSelected', { detail: { robotId: clickedRobot.id } });
        window.dispatchEvent(event);
      }
    }
  }
  
  updateRobots(deltaTime) {
    // Update all robots
    Object.values(this.robots).forEach(robot => {
      // Random movement
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
      const newX = robot.mesh.position.x + robot.direction.x * robot.speed;
      const newZ = robot.mesh.position.z + robot.direction.z * robot.speed;
      
      // Clamp to terrain bounds
      const halfTerrainSize = 950; // Slightly smaller than terrain to prevent falling off
      const clampedX = Math.max(-halfTerrainSize, Math.min(halfTerrainSize, newX));
      const clampedZ = Math.max(-halfTerrainSize, Math.min(halfTerrainSize, newZ));
      
      // Get terrain height at new position
      const terrainHeight = this.getHeightAtPosition(clampedX, clampedZ);
      
      // Update position
      robot.mesh.position.set(clampedX, terrainHeight + 2, clampedZ);
      
      // Update robot data
      robot.position = {
        x: clampedX,
        y: terrainHeight + 2,
        z: clampedZ
      };
      robot.height = Math.round(terrainHeight);
      robot.coordinates = {
        x: Math.round(clampedX + 1000),
        z: Math.round(clampedZ + 1000)
      };
    });
    
    // Update selected robot camera
    if (this.selectedRobotId && this.robots[this.selectedRobotId]) {
      const robot = this.robots[this.selectedRobotId];
      const robotPos = robot.mesh.position;
      
      this.robotCamera.position.set(robotPos.x, robotPos.y + 2, robotPos.z);
      this.robotCamera.lookAt(
        robotPos.x + robot.direction.x * 10,
        robotPos.y + 2,
        robotPos.z + robot.direction.z * 10
      );
    }
  }
  
  // Set up robot view renderer for first person view
  setupRobotViewRenderer(container) {
    this.robotViewRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.robotViewRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.robotViewRenderer.domElement);
    this.robotViewContainer = container;
  }
  
  // Set up radar view renderer
  setupRadarRenderer(container) {
    this.robotRadarRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.robotRadarRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.robotRadarRenderer.domElement);
    this.robotRadarContainer = container;
  }
  
  // Render robot views
  renderRobotViews() {
    if (this.robotViewRenderer && this.selectedRobotId && this.robots[this.selectedRobotId]) {
      this.robotViewRenderer.render(this.scene, this.robotCamera);
    }
    
    if (this.robotRadarRenderer && this.selectedRobotId && this.robots[this.selectedRobotId]) {
      // Simple radar view - just a top-down perspective
      const robot = this.robots[this.selectedRobotId];
      const radarCamera = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 1000);
      radarCamera.position.set(robot.position.x, robot.position.y + 50, robot.position.z);
      radarCamera.lookAt(robot.position.x, robot.position.y, robot.position.z);
      
      this.robotRadarRenderer.render(this.scene, radarCamera);
    }
  }

  // Add this method to allow for proper camera updates from outside
  updateCamera() {
    if (this.renderer && this.camera) {
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Adjust zoom level more smoothly
  setZoomLevel(height) {
    if (!this.camera) return;
    
    // Clamp height between reasonable values
    const newHeight = Math.max(100, Math.min(2000, height));
    
    // Smoothly update the camera position
    this.camera.position.y = newHeight;
    
    // Keep looking at the center (0,0,0) for birds-eye view
    this.camera.lookAt(0, 0, 0);
    
    // Update the projection matrix and renderer
    this.camera.updateProjectionMatrix();
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    const now = Date.now();
    const deltaTime = now - (this.lastTime || now);
    this.lastTime = now;

    this.updateMovement();
    
    // Update robots
    this.updateRobots(deltaTime);
    
    this.renderer.render(this.scene, this.camera);
    
    // Render robot views
    this.renderRobotViews();
  }
}

export { TerrainExplorer };
