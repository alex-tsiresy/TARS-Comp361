import * as THREE from 'three';

class TerrainExplorer {
  constructor(container) {
    //initiate the scene object
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    //setup cam
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      10000
    );
    this.camera.position.set(0, 50, 0);

    //setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

    //for the mouse
    this.renderer.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
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
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
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
    if (!this.heightmapData) return;

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

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    this.updateMovement();

    this.renderer.render(this.scene, this.camera);
  }
}

export { TerrainExplorer };
