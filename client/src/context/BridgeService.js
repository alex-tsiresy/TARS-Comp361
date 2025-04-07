/**
 * BridgeService - A bridge between the 3D world and React context
 * 
 * This service handles the transition from the event-based system to the context-based system.
 * It provides methods that the 3D world can call, which will then be translated to 
 * appropriate context actions.
 */

class BridgeService {
  constructor() {
    this._contextDispatch = null;
    this._contextActions = null;
    this._eventListeners = new Map();
    this._migratedToDirectMode = true;
    this._terrainManager = null;
    this._pendingOperations = [];
  }
  
  /**
   * Register the context dispatch and actions
   * Called by the RobotContext during initialization
   */
  registerContext(dispatch, actions) {
    this._contextDispatch = dispatch;
    this._contextActions = actions;
    console.log('Context registered with BridgeService');
  }
  
  /**
   * Subscribe to an event type directly through the bridge
   * This allows components to eventually migrate away from DOM events
   */
  subscribe(eventType, callback) {
    if (!this._eventListeners.has(eventType)) {
      this._eventListeners.set(eventType, new Set());
    }
    this._eventListeners.get(eventType).add(callback);
    
    return () => {
      const listeners = this._eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
  
  /**
   * Notify subscribers directly without using DOM events
   */
  _notifySubscribers(eventType, data) {
    const listeners = this._eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in BridgeService subscriber for ${eventType}:`, error);
        }
      });
    }
  }
  
  /**
   * Called by TerrainManager when the renderer is initialized
   */
  notifyRendererInitialized(renderer) {
    // If context is registered, update it directly
    if (this._contextDispatch && this._contextActions) {
      this._contextDispatch({
        type: this._contextActions.SET_RENDERER,
        payload: renderer
      });
    }
    
    // Notify direct subscribers
    this._notifySubscribers('rendererInitialized', renderer);
    
    // For backward compatibility, dispatch the event unless in direct mode
    if (!this._migratedToDirectMode) {
      const event = new CustomEvent('rendererInitialized', {
        detail: { renderer }
      });
      window.dispatchEvent(event);
    }
  }
  
  /**
   * Called by RobotManager when a robot is added
   */
  notifyRobotAdded(robotData) {
    // If context is registered, update it directly
    if (this._contextDispatch && this._contextActions) {
      this._contextDispatch({
        type: this._contextActions.ADD_ROBOT,
        payload: robotData
      });
    }
    
    // Notify direct subscribers
    this._notifySubscribers('robotAdded', robotData);
    
    // For backward compatibility, dispatch the event unless in direct mode
    if (!this._migratedToDirectMode) {
      const event = new CustomEvent('robotAdded', {
        detail: { robot: robotData }
      });
      window.dispatchEvent(event);
    }
  }
  
  /**
   * Called by RobotManager when a robot is updated
   */
  notifyRobotUpdated(robotData) {
    // If context is registered, update it directly
    if (this._contextDispatch && this._contextActions) {
      this._contextDispatch({
        type: this._contextActions.UPDATE_ROBOT,
        payload: robotData
      });
    }
    
    // Notify direct subscribers
    this._notifySubscribers('robotUpdated', robotData);
    
    // For backward compatibility, dispatch the event unless in direct mode
    if (!this._migratedToDirectMode) {
      const event = new CustomEvent('robotUpdated', {
        detail: { robot: robotData }
      });
      window.dispatchEvent(event);
    }
  }
  
  /**
   * Called by RobotManager when a robot is selected
   */
  notifyRobotSelected(robotData) {
    // If context is registered, update it directly
    if (this._contextDispatch && this._contextActions) {
      this._contextDispatch({
        type: this._contextActions.SELECT_ROBOT,
        payload: robotData ? robotData.id : null
      });
    }
    
    // Notify direct subscribers
    this._notifySubscribers('robotSelected', robotData);
    
    // For backward compatibility, dispatch the event unless in direct mode
    if (!this._migratedToDirectMode) {
      const event = new CustomEvent('robotSelected', {
        detail: { robot: robotData }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Called by TerrainRenderer when terrain dimensions change after loading a new map
   */
  notifyTerrainDimensionsChanged(dimensions) {
    // Notify direct subscribers
    this._notifySubscribers('terrainDimensionsChanged', dimensions);
    
    // No DOM event needed for this as it's internal context state
    console.log('BridgeService: Notified subscribers of terrain dimension change:', dimensions);
  }
  
  /**
   * Called by components to request adding a robot
   * This replaces the 'addRobotRequest' event
   */
  requestAddRobot(x, z) {
    // Notify subscribers who want to handle robot addition
    this._notifySubscribers('addRobotRequest', { position: { x, z } });
    
    // For backward compatibility
    if (!this._migratedToDirectMode) {
      const event = new CustomEvent('addRobotRequest', {
        detail: { position: { x, z } }
      });
      window.dispatchEvent(event);
    }
  }
  
  /**
   * Complete migration to direct communication
   * This method should be called once all components have been migrated
   * It will:
   * 1. Enable direct mode (stop emitting DOM events)
   * 2. Add a warning for any attempts to use DOM events
   * 3. Log migration completion message
   */
  completeMigration() {
    this._migratedToDirectMode = true;
    console.log('Migration to direct communication completed. DOM events will no longer be dispatched.');
    
    // Override window.dispatchEvent and window.addEventListener with warnings
    const originalDispatchEvent = window.dispatchEvent;
    const originalAddEventListener = window.addEventListener;
    
    // Override dispatchEvent for robot-related events
    window.dispatchEvent = function(event) {
      if (event.type.includes('robot') || event.type === 'rendererInitialized') {
        console.warn(
          `Warning: Attempting to dispatch '${event.type}' event directly. ` +
          `Use BridgeService methods instead.`
        );
      }
      return originalDispatchEvent.apply(this, arguments);
    };
    
    // Override addEventListener for robot-related events
    window.addEventListener = function(type, listener, options) {
      if (type.includes('robot') || type === 'rendererInitialized') {
        console.warn(
          `Warning: Attempting to listen for '${type}' event directly. ` +
          `Use BridgeService.subscribe() method instead.`
        );
      }
      return originalAddEventListener.apply(this, arguments);
    };
    
    return {
      // Method to restore original behavior if needed
      restore: () => {
        window.dispatchEvent = originalDispatchEvent;
        window.addEventListener = originalAddEventListener;
        this._migratedToDirectMode = false;
        console.log('Restored original event dispatch behavior.');
      }
    };
  }
  
  /**
   * Called by the UI to set a robot task
   */
  setRobotTask(robotId, task) {
    if (this._terrainManager && this._terrainManager.renderer) {
      this._terrainManager.renderer.setRobotTask(robotId, task);
      return true;
    }
    // Queue for when terrainManager is ready
    this._pendingOperations.push(() => this.setRobotTask(robotId, task));
    return false;
  }
  
  /**
   * Called by the UI to set robot capabilities
   */
  setRobotCapabilities(robotId, capabilities) {
    if (this._terrainManager && this._terrainManager.renderer) {
      this._terrainManager.renderer.setRobotCapabilities(robotId, capabilities);
      return true;
    }
    // Queue for when terrainManager is ready
    this._pendingOperations.push(() => this.setRobotCapabilities(robotId, capabilities));
    return false;
  }
}

// Create a singleton instance
const bridgeService = new BridgeService();

export default bridgeService;
