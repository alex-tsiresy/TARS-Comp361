import * as THREE from 'three';

/**
 * RobotViewManager - Handles robot-specific views (first-person and radar)
 * Extracted from TerrainRenderer to better separate concerns
 */
class RobotViewManager {
  constructor(scene, mainRenderer, robotManager) {
    this.scene = scene;
    this.mainRenderer = mainRenderer;
    this.robotManager = robotManager;
    
    // First-person view
    this.robotViewRenderer = null;
    this.robotViewContainer = null;
    
    // Radar view
    this.radarRenderer = null;
    this.radarContainer = null;
    
    // Radar camera
    this.radarCamera = null;
    
    // Set up lights for robot views
    this.setupLights();
  }
  
  /**
   * Set up spotlights for the robot views
   */
  setupLights() {
    // Create spotlight for robot view
    this.robotSpotlight = new THREE.SpotLight(0xffffff, 3);
    this.robotSpotlight.angle = Math.PI / 3;
    this.robotSpotlight.penumbra = 0.5;
    this.robotSpotlight.decay = 1;
    this.robotSpotlight.distance = 300;
    this.robotSpotlight.castShadow = true;
    
    // Create a target for the spotlight
    this.spotlightTarget = new THREE.Object3D();
    this.scene.add(this.spotlightTarget);
    this.robotSpotlight.target = this.spotlightTarget;
    this.scene.add(this.robotSpotlight);
    
    // Create spotlight for radar view
    this.radarSpotlight = new THREE.SpotLight(0xffffff, 5);
    this.radarSpotlight.angle = Math.PI / 2;
    this.radarSpotlight.penumbra = 0.5;
    this.radarSpotlight.decay = 1;
    this.radarSpotlight.distance = 1000;
    this.radarSpotlight.castShadow = true;
    
    // Create a target for the spotlight
    this.radarSpotlightTarget = new THREE.Object3D();
    this.scene.add(this.radarSpotlightTarget);
    this.radarSpotlight.target = this.radarSpotlightTarget;
    this.scene.add(this.radarSpotlight);
  }
  
  /**
   * Set up the first-person view renderer
   */
  setupRobotViewRenderer(container) {
    console.log('Setting up robot view renderer');
    
    // Clean up existing renderer
    this.cleanupRenderer(this.robotViewRenderer, this.robotViewContainer);
    
    try {
      // Create new renderer
      this.robotViewRenderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
      });
      this.robotViewRenderer.setSize(container.clientWidth, container.clientHeight);
      this.robotViewRenderer.shadowMap.enabled = true;
      this.robotViewRenderer.setClearColor(0x111111);
      
      // Add to container
      this.clearAndAppendRenderer(container, this.robotViewRenderer);
      this.robotViewContainer = container;
      
      // Update camera aspect ratio
      if (this.robotManager && this.robotManager.robotCamera) {
        this.robotManager.robotCamera.aspect = container.clientWidth / container.clientHeight;
        this.robotManager.robotCamera.updateProjectionMatrix();
      }
      
      console.log('Robot view renderer ready');
    } catch (error) {
      console.error('Error setting up robot view renderer:', error);
    }
  }
  
  /**
   * Set up the radar view renderer
   */
  setupRadarRenderer(container) {
    console.log('Setting up radar renderer');
    
    // Clean up existing renderer
    this.cleanupRenderer(this.radarRenderer, this.radarContainer);
    
    try {
      // Create new renderer
      this.radarRenderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
      });
      this.radarRenderer.setSize(container.clientWidth, container.clientHeight);
      this.radarRenderer.shadowMap.enabled = true;
      this.radarRenderer.setClearColor(0x111111);
      
      // Add to container
      this.clearAndAppendRenderer(container, this.radarRenderer);
      this.radarContainer = container;
      
      console.log('Radar renderer ready');
    } catch (error) {
      console.error('Error setting up radar renderer:', error);
    }
  }
  
  /**
   * Helper method to clean up a renderer
   */
  cleanupRenderer(renderer, container) {
    if (renderer && container) {
      try {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      } catch (error) {
        console.error('Error cleaning up renderer:', error);
      }
    }
  }
  
  /**
   * Helper method to clear container and append renderer
   */
  clearAndAppendRenderer(container, renderer) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);
  }
  
  /**
   * Render robot views (first-person and radar)
   */
  renderRobotViews(selectedRobot) {
    if (!selectedRobot) return;
    
    const robotPos = selectedRobot.position;
    const robotDir = selectedRobot.direction;
    
    if (!robotPos || !robotDir) {
      console.warn('Robot position or direction is undefined');
      return;
    }
    
    // --- First-person view ---
    this.renderFirstPersonView(robotPos, robotDir);
    
    // --- Radar view (top-down) ---
    this.renderRadarView(robotPos, robotDir);
  }
  
  /**
   * Render the first-person view
   */
  renderFirstPersonView(robotPos, robotDir) {
    if (!this.robotViewRenderer || !this.robotManager.robotCamera) return;
    
    if (!this.robotViewRenderer || !this.robotManager || !this.robotManager.robotCamera) return;
    
    try {
      // Camera position and lookAt are now handled solely by RobotManager.updateCameraForSelectedRobot
      // Ensure projection matrix is up-to-date if FOV or aspect ratio changed
      this.robotManager.robotCamera.updateProjectionMatrix();
      
      // Update spotlight position
      if (this.robotSpotlight && this.spotlightTarget) {
        this.robotSpotlight.position.copy(this.robotManager.robotCamera.position);
        this.spotlightTarget.position.set(
          robotPos.x + robotDir.x * 20,
          robotPos.y + 2,
          robotPos.z + robotDir.z * 20
        );
      }
      
      // Render with clear background
      this.robotViewRenderer.setClearColor(0x000000);
      this.robotViewRenderer.render(this.scene, this.robotManager.robotCamera);
    } catch (error) {
      console.error('Error rendering first-person view:', error);
    }
  }
  
  /**
   * Render the radar view
   */
  renderRadarView(robotPos, robotDir) {
    if (!this.radarRenderer) return;
    
    try {
      // Create or update radar camera
      if (!this.radarCamera) {
        this.radarCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 1000);
      }
      
      // Position camera above robot
      this.radarCamera.position.set(
        robotPos.x, 
        robotPos.y + 200, 
        robotPos.z
      );
      this.radarCamera.lookAt(robotPos.x, robotPos.y, robotPos.z);
      this.radarCamera.near = 1;
      this.radarCamera.far = 1000;
      this.radarCamera.updateProjectionMatrix();
      
      // Update spotlight
      if (this.radarSpotlight && this.radarSpotlightTarget) {
        this.radarSpotlight.position.set(robotPos.x, robotPos.y + 300, robotPos.z);
        this.radarSpotlightTarget.position.set(robotPos.x, robotPos.y, robotPos.z);
      }
      
      // Render with clear background
      this.radarRenderer.setClearColor(0x000000);
      this.radarRenderer.render(this.scene, this.radarCamera);
    } catch (error) {
      console.error('Error rendering radar view:', error);
    }
  }
  
  /**
   * Handle window resize events
   */
  handleResize() {
    // Update first-person view renderer
    if (this.robotViewRenderer && this.robotViewContainer) {
      this.robotViewRenderer.setSize(
        this.robotViewContainer.clientWidth,
        this.robotViewContainer.clientHeight
      );
      
      if (this.robotManager && this.robotManager.robotCamera) {
        this.robotManager.robotCamera.aspect = 
          this.robotViewContainer.clientWidth / this.robotViewContainer.clientHeight;
        this.robotManager.robotCamera.updateProjectionMatrix();
      }
    }
    
    // Update radar renderer
    if (this.radarRenderer && this.radarContainer) {
      this.radarRenderer.setSize(
        this.radarContainer.clientWidth,
        this.radarContainer.clientHeight
      );
    }
  }
  
  /**
   * Render robot views
   */
  renderViews() {
    // Get the selected robot
    const selectedRobotId = this.robotManager.selectedRobotId;
    if (selectedRobotId && this.robotManager.robots[selectedRobotId]) {
      const selectedRobot = this.robotManager.robots[selectedRobotId];
      this.renderRobotViews(selectedRobot);
    }
  }
  
  /**
   * Clean up all renderers and resources
   */
  dispose() {
    // Clean up robot view renderer
    if (this.robotViewRenderer) {
      this.robotViewRenderer.dispose();
      if (this.robotViewContainer && this.robotViewRenderer.domElement && 
          this.robotViewRenderer.domElement.parentNode === this.robotViewContainer) {
        this.robotViewContainer.removeChild(this.robotViewRenderer.domElement);
      }
    }
    
    // Clean up radar renderer
    if (this.radarRenderer) {
      this.radarRenderer.dispose();
      if (this.radarContainer && this.radarRenderer.domElement && 
          this.radarRenderer.domElement.parentNode === this.radarContainer) {
        this.radarContainer.removeChild(this.radarRenderer.domElement);
      }
    }
    
    // Clean up lights
    if (this.scene) {
      if (this.robotSpotlight) this.scene.remove(this.robotSpotlight);
      if (this.spotlightTarget) this.scene.remove(this.spotlightTarget);
      if (this.radarSpotlight) this.scene.remove(this.radarSpotlight);
      if (this.radarSpotlightTarget) this.scene.remove(this.radarSpotlightTarget);
    }
    
    // Null out references
    this.robotViewRenderer = null;
    this.radarRenderer = null;
    this.robotViewContainer = null;
    this.radarContainer = null;
    this.radarCamera = null;
    this.robotSpotlight = null;
    this.spotlightTarget = null;
    this.radarSpotlight = null;
    this.radarSpotlightTarget = null;
  }
}

export default RobotViewManager;
