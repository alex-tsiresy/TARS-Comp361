import * as THREE from 'three';

export class CameraController {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.target = null;
        this.cubeManager = null;
        this.povOffset = { x: 0, y: 2, z: 0 };
        
        // Mouse look variables
        this.isLocked = false;
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.PI_2 = Math.PI / 2;
        this.mouseSpeed = 0.002;
        
        // Initialize pointer lock
        this.setupPointerLock();
    }

    setupPointerLock() {
        // Setup pointer lock event listeners
        this.renderer.domElement.addEventListener('click', () => {
            if (!this.isLocked) {
                this.renderer.domElement.requestPointerLock();
            }
        });

        // Pointer lock change event
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.renderer.domElement;
        });

        // Mouse movement event
        document.addEventListener('mousemove', (event) => {
            if (this.isLocked) {
                const movementX = event.movementX || 0;
                const movementY = event.movementY || 0;

                // Update camera rotation based on mouse movement
                this.euler.y -= movementX * this.mouseSpeed;
                this.euler.x -= movementY * this.mouseSpeed;

                // Clamp vertical rotation to prevent camera flipping
                this.euler.x = Math.max(-this.PI_2 + 0.1, Math.min(this.PI_2 - 0.1, this.euler.x));
                
                // Apply rotation to camera
                this.camera.quaternion.setFromEuler(this.euler);
                
                // Update active cube direction based on camera direction
                if (this.cubeManager) {
                    const direction = new THREE.Vector3(0, 0, -1);
                    direction.applyQuaternion(this.camera.quaternion);
                    direction.y = 0; // Keep movement on the xz plane
                    direction.normalize();
                    this.cubeManager.setActiveDirection(direction);
                }
            }
        });

        // Create UI for switching between cubes
        this.createSwitchUI();
    }
    
    createSwitchUI() {
        // Add instructions
        const instructions = document.createElement('div');
        instructions.style.position = 'fixed';
        instructions.style.top = '20px';
        instructions.style.width = '100%';
        instructions.style.textAlign = 'center';
        instructions.style.color = 'white';
        instructions.style.fontSize = '16px';
        instructions.style.fontFamily = 'Arial, sans-serif';
        instructions.style.zIndex = '1000';
        instructions.innerHTML = 'Click to enable mouse control<br>Use arrow keys to move';
        document.body.appendChild(instructions);
        
        // Create switch button
        const switchButton = document.createElement('button');
        switchButton.textContent = 'Switch Cube';
        switchButton.style.position = 'fixed';
        switchButton.style.bottom = '20px';
        switchButton.style.left = '50%';
        switchButton.style.transform = 'translateX(-50%)';
        switchButton.style.padding = '10px 20px';
        switchButton.style.backgroundColor = '#4CAF50';
        switchButton.style.color = 'white';
        switchButton.style.border = 'none';
        switchButton.style.borderRadius = '5px';
        switchButton.style.cursor = 'pointer';
        switchButton.style.zIndex = '1000';
        
        // Add event listener to switch button
        switchButton.addEventListener('click', () => {
            if (this.cubeManager) {
                // Deactivate all cubes first
                this.cubeManager.cubes.forEach(cube => {
                    cube.setActive(false);
                });
                
                // Switch to the next cube
                const activeCube = this.cubeManager.switchToNextCube();
                
                // Activate the new cube
                activeCube.setActive(true);
                
                // Update the target
                this.target = activeCube.getPosition();
                
                console.log(`Switched to cube ${activeCube.id}`);
            }
        });
        
        document.body.appendChild(switchButton);
    }

    setTarget(target, cubeManager) {
        this.target = target;
        this.cubeManager = cubeManager;
    }

    update() {
        if (this.target && this.cubeManager) {
            // Get the current active cube's position
            const activePosition = this.cubeManager.getActivePosition();
            
            // Always in POV mode - position camera at eye level
            this.camera.position.x = activePosition.x + this.povOffset.x;
            this.camera.position.y = activePosition.y + this.povOffset.y;
            this.camera.position.z = activePosition.z + this.povOffset.z;
        }
    }
}
