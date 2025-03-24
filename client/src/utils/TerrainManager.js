import TerrainRenderer from './TerrainRenderer';
import bridgeService from '../context/BridgeService';

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
    
    // Subscribe to addRobotRequest through BridgeService
    this._unsubscribeAddRobot = bridgeService.subscribe('addRobotRequest', (data) => {
      this.handleAddRobotRequest({ detail: data });
    });
    
    // Keep DOM event listener for backward compatibility
    window.addEventListener('addRobotRequest', this.handleAddRobotRequest.bind(this));
    
    // Notify that the renderer is ready
    setTimeout(() => {
      console.log('Terrain should be loaded now, dispatching initialization event...');
      
      // Notify through BridgeService
      this._notifyRendererInitialized();
      
      // For backward compatibility, still dispatch the DOM event
      const event = new CustomEvent('rendererInitialized', {
        detail: { renderer: this.renderer }
      });
      window.dispatchEvent(event);
    }, 1500); // Wait a bit longer for terrain to load
  }
  
  // Method to notify about renderer initialization through BridgeService
  _notifyRendererInitialized() {
    // Use the bridge service's dedicated method instead of direct subscriber notification
    bridgeService.notifyRendererInitialized(this.renderer);
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
        
        // Use BridgeService to notify about robot selection
        bridgeService.notifyRobotSelected({ ...robotData });
      }
    }
  }
  
  // Add a robot directly through code instead of through events
  addRobotAtPosition(x, z) {
    if (this.renderer) {
      console.log(`TerrainManager: Direct call to add robot at position (${x}, ${z})`);
      return this.renderer.addRobotAtPosition(x, z);
    }
    return null;
  }
  
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    // Clean up event listeners and subscriptions
    window.removeEventListener('addRobotRequest', this.handleAddRobotRequest);
    
    // Clean up BridgeService subscriptions
    if (this._unsubscribeAddRobot) {
      this._unsubscribeAddRobot();
      this._unsubscribeAddRobot = null;
    }
  }
}

// Create a singleton instance
const terrainManager = new TerrainManager();

export default terrainManager; 