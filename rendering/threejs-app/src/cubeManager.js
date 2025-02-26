import * as THREE from 'three';
import { CubeController } from './cube.js';

export class CubeManager {
    constructor(scene, terrainManager) {
        this.scene = scene;
        this.terrainManager = terrainManager;
        this.cubes = [];
        this.activeCubeIndex = 0;
        this.colors = [0x00ff00, 0xff0000, 0x0000ff]; // Green, Red, Blue
        this.initialPositions = [
            { x: 0, y: 50, z: 0 },
            { x: 20, y: 50, z: 20 },
            { x: -20, y: 50, z: -20 }
        ];
        
        // Shared key state for all cubes
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };
        
        // Set up event listeners for key controls
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = false;
            }
        });
    }

    initialize() {
        // Create multiple cubes with different colors and positions
        for (let i = 0; i < this.colors.length; i++) {
            const cube = new CubeController(
                this.scene, 
                this.terrainManager, 
                this.colors[i], 
                this.initialPositions[i],
                i,
                this.keys // Pass the shared key state
            );
            this.cubes.push(cube);
        }
        
        // Set the first cube as active
        this.cubes[0].setActive(true);
    }

    getActiveCube() {
        return this.cubes[this.activeCubeIndex];
    }

    switchToNextCube() {
        this.activeCubeIndex = (this.activeCubeIndex + 1) % this.cubes.length;
        return this.getActiveCube();
    }

    switchToCube(index) {
        if (index >= 0 && index < this.cubes.length) {
            this.activeCubeIndex = index;
        }
        return this.getActiveCube();
    }

    update() {
        // Update all cubes
        for (const cube of this.cubes) {
            cube.update();
        }
    }

    getActivePosition() {
        return this.getActiveCube().getPosition();
    }

    getActiveDirection() {
        return this.getActiveCube().getDirection();
    }

    setActiveDirection(direction) {
        this.getActiveCube().setDirection(direction);
    }
}
