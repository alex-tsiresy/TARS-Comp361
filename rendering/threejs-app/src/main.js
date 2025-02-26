import * as THREE from 'three';
import { TerrainManager } from './terrain.js';
import { CubeManager } from './cubeManager.js';
import { CameraController } from './controls.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Camera - set up for first-person view
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 52, 0); // Start at cube height + eye level

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight("white", 1);
directionalLight.castShadow = true;
directionalLight.position.set(1000, 0, 0);
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
const d = 2000;
directionalLight.shadow.camera.left = -d;
directionalLight.shadow.camera.right = d;
directionalLight.shadow.camera.top = d;
directionalLight.shadow.camera.bottom = -d;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 5000;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);

// Initialize managers and controllers
const textureLoader = new THREE.TextureLoader();
const terrainManager = new TerrainManager(scene);
const cubeManager = new CubeManager(scene, terrainManager);
const cameraController = new CameraController(camera, renderer);

// Load terrain
terrainManager.loadTerrain(textureLoader);

// Initialize cubes
cubeManager.initialize();

// Set active cube as camera target and pass manager for direction
cameraController.setTarget(cubeManager.getActivePosition(), cubeManager);

// Set initial camera direction to cube
const initialDirection = new THREE.Vector3(0, 0, -1);
cubeManager.setActiveDirection(initialDirection);

// Animate
function animate() {
    requestAnimationFrame(animate);
    cubeManager.update();
    cameraController.update();
    renderer.render(scene, camera);
}
animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
