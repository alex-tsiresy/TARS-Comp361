import TerrainRenderer from './TerrainRenderer';

// This class manages the terrain renderer in the background
// so we can use it for positioning robots and other operations
// without having to display the actual 3D scene
class TerrainManager {
  constructor() {
    this.renderer = null;
    this.initialize();
  }
  
  initialize() {
    console.log('Initializing TerrainManager with hidden renderer...');
    
    // Create a hidden div to host the renderer
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'absolute';
    hiddenContainer.style.width = '10px';
    hiddenContainer.style.height = '10px';
    hiddenContainer.style.overflow = 'hidden';
    hiddenContainer.style.opacity = '0';
    hiddenContainer.style.pointerEvents = 'none';
    document.body.appendChild(hiddenContainer);
    
    // Initialize the renderer
    this.renderer = new TerrainRenderer(hiddenContainer);
    this.renderer.loadTerrain();
    console.log('Terrain loading started...');
    
    // Listen for add robot requests
    window.addEventListener('addRobotRequest', this.handleAddRobotRequest.bind(this));
    
    // Notify that the renderer is ready
    setTimeout(() => {
      console.log('Terrain should be loaded now, dispatching initialization event...');
      const event = new CustomEvent('rendererInitialized', {
        detail: { renderer: this.renderer }
      });
      window.dispatchEvent(event);
    }, 1500); // Wait a bit longer for terrain to load
  }
  
  handleAddRobotRequest(event) {
    const { position } = event.detail;
    if (this.renderer) {
      console.log(`TerrainManager: Adding robot at position (${position.x}, ${position.z})`);
      const robotData = this.renderer.addRobotAtPosition(position.x, position.z);
      console.log('Robot added, data:', robotData);
      
      // Ensure robot selection is properly propagated to UI
      if (robotData) {
        console.log('TerrainManager: Broadcasting robot selection event for:', robotData.id);
        
        // Dispatch a single robot selection event
        const selectEvent = new CustomEvent('robotSelected', {
          detail: { robot: { ...robotData } }
        });
        window.dispatchEvent(selectEvent);
      }
    }
  }
  
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    window.removeEventListener('addRobotRequest', this.handleAddRobotRequest);
  }
}

// Create a singleton instance
const terrainManager = new TerrainManager();

export default terrainManager; 