import * as THREE from 'three';

export class CubeController {
    constructor(scene, terrainManager, color = 0x00ff00, initialPosition = { x: 0, y: 50, z: 0 }, id = 0, sharedKeys = null) {
        this.scene = scene;
        this.terrainManager = terrainManager;
        this.id = id;
        this.color = color;
        this.initialPosition = initialPosition;
        this.cube = this.createCube();
        this.moveSpeed = 0.5;
        this.direction = new THREE.Vector3(0, 0, -1);
        this.right = new THREE.Vector3(1, 0, 0);
        this.isActive = false;
        
        // Use shared keys from CubeManager if provided, otherwise create local keys
        this.keys = sharedKeys || {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };
    }

    createCube() {
        const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
        const cubeMaterial = new THREE.MeshStandardMaterial({ color: this.color });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(this.initialPosition.x, this.initialPosition.y, this.initialPosition.z);
        cube.castShadow = true;
        this.scene.add(cube);
        return cube;
    }
    
    setActive(active) {
        this.isActive = active;
    }

    // Set direction from camera
    setDirection(direction) {
        this.direction.copy(direction);
        // Calculate right vector (perpendicular to direction for strafing)
        this.right.set(this.direction.z, 0, -this.direction.x).normalize();
    }

    update() {
        if (!this.terrainManager.heightmapData) return;

        const halfTerrainSize = 1000;
        const cubeSize = 1;

        // Only process movement for the active cube
        if (this.isActive) {
            // Update position based on movement keys
            let newX = this.cube.position.x;
            let newZ = this.cube.position.z;

            // Forward/backward movement
            if (this.keys.ArrowUp) {
                newX += this.direction.x * this.moveSpeed;
                newZ += this.direction.z * this.moveSpeed;
            }
            if (this.keys.ArrowDown) {
                newX -= this.direction.x * this.moveSpeed;
                newZ -= this.direction.z * this.moveSpeed;
            }

            // Strafe left/right movement
            if (this.keys.ArrowLeft) {
                newX -= this.right.x * this.moveSpeed;
                newZ -= this.right.z * this.moveSpeed;
            }
            if (this.keys.ArrowRight) {
                newX += this.right.x * this.moveSpeed;
                newZ += this.right.z * this.moveSpeed;
            }

            // Clamp position to terrain bounds
            newX = Math.max(-halfTerrainSize + cubeSize, Math.min(halfTerrainSize - cubeSize, newX));
            newZ = Math.max(-halfTerrainSize + cubeSize, Math.min(halfTerrainSize - cubeSize, newZ));

            const terrainHeight = this.terrainManager.getHeightAtPosition(newX, newZ);
            
            this.cube.position.x = newX;
            this.cube.position.z = newZ;
            this.cube.position.y = terrainHeight + 0.5;
            
            // Update cube rotation to face the direction of movement
            if (this.direction.x !== 0 || this.direction.z !== 0) {
                this.cube.rotation.y = Math.atan2(this.direction.x, this.direction.z);
            }
        }
    }

    getPosition() {
        return this.cube.position;
    }

    getDirection() {
        return this.direction;
    }
}
