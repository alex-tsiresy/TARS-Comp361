import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * CameraController - Handles camera positioning and controls
 * Extracted from TerrainRenderer to better separate concerns
 */
class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.initialPosition = camera.position.clone();
    
    // Setup orbit controls
    this.controls = new OrbitControls(camera, domElement);
    this.setupControls();
  }
  
  setupControls() {
    // Configure orbit controls with good defaults
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 2; // Limit to horizon
    this.controls.target.set(0, 0, 0); // Look at center by default
  }
  
  zoomIn() {
    const position = this.camera.position.clone();
    position.multiplyScalar(0.9); // Move 10% closer
    this.camera.position.copy(position);
    this.camera.updateProjectionMatrix();
  }
  
  zoomOut() {
    const position = this.camera.position.clone();
    position.multiplyScalar(1.1); // Move 10% further
    this.camera.position.copy(position);
    this.camera.updateProjectionMatrix();
  }
  
  resetView() {
    this.camera.position.copy(this.initialPosition);
    this.controls.target.set(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  
  update() {
    if (this.controls) {
      this.controls.update();
    }
  }
  
  handleResize(width, height) {
    if (!this.camera) return;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  
  // Adjust zoom level (used by UI controls)
  setZoomLevel(height) {
    if (!this.camera) return;
    
    // Clamp height between reasonable values
    const newHeight = Math.max(100, Math.min(2000, height));
    
    // Smoothly update the camera position
    this.camera.position.y = newHeight;
    
    // Keep looking at the center (0,0,0) for birds-eye view
    this.camera.lookAt(0, 0, 0);
    
    // Update the projection matrix
    this.camera.updateProjectionMatrix();
  }
  
  dispose() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
  }
}

export default CameraController; 