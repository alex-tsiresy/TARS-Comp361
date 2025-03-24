import * as THREE from 'three';

class InputHandler {
  constructor(container, camera, domElement, movementCallback) {
    // Store references
    this.container = container;
    this.camera = camera;
    this.domElement = domElement;
    this.movementCallback = movementCallback;
    
    // Movement state
    this.direction = new THREE.Vector3(0, 0, -1);
    this.moveSpeed = 2.0;
    this.rotateSpeed = 0.03;
    this.mouseSpeed = 0.002;
    
    // Movement keys
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
    
    // Control flags
    this.disableKeyboardControls = false;
    this.disablePointerLock = false;
    this.isPointerLocked = false;
    
    // Camera rotation state
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.PI_2 = Math.PI / 2;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Keyboard controls
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

    // Mouse controls for camera rotation
    this.domElement.addEventListener('click', () => {
      if (!this.disablePointerLock && !this.isPointerLocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
    });

    document.addEventListener('mousemove', (event) => {
      if (this.isPointerLocked) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.euler.y -= movementX * this.mouseSpeed;
        this.euler.x -= movementY * this.mouseSpeed;

        // Clamp vertical rotation
        this.euler.x = Math.max(-this.PI_2 + 0.1, Math.min(this.PI_2 - 0.1, this.euler.x));

        // Update camera rotation
        this.camera.quaternion.setFromEuler(this.euler);

        // Update direction vector for movement
        this.direction.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
      }
    });
  }
  
  update() {
    if (this.disableKeyboardControls) return;
    
    // Get forward and right vectors from camera direction
    const forward = new THREE.Vector3();
    forward.copy(this.direction);
    forward.y = 0; // keep movement on xz plane
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

    // Calculate movement delta
    const moveDelta = new THREE.Vector3(0, 0, 0);

    // Forward/backward
    if (this.keys.w || this.keys.ArrowUp) {
      moveDelta.add(forward.clone().multiplyScalar(this.moveSpeed));
    }
    if (this.keys.s || this.keys.ArrowDown) {
      moveDelta.sub(forward.clone().multiplyScalar(this.moveSpeed));
    }

    // Left/right strafing
    if (this.keys.a || this.keys.ArrowLeft) {
      moveDelta.add(right.clone().multiplyScalar(this.moveSpeed));
    }
    if (this.keys.d || this.keys.ArrowRight) {
      moveDelta.sub(right.clone().multiplyScalar(this.moveSpeed));
    }
    
    // Call the movement callback with the calculated movement delta
    if (this.movementCallback && moveDelta.length() > 0) {
      this.movementCallback(moveDelta);
    }
  }
  
  enableControls() {
    this.disableKeyboardControls = false;
  }
  
  disableControls() {
    this.disableKeyboardControls = true;
  }
  
  enablePointerLock() {
    this.disablePointerLock = false;
  }
  
  disablePointerLock() {
    this.disablePointerLock = true;
    if (this.isPointerLocked) {
      document.exitPointerLock();
    }
  }
}

export { InputHandler }; 