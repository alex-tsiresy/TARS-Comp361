import React, { createContext, useContext, useState, useReducer, useEffect, useCallback } from 'react';
import { produce } from 'immer';
import terrainManager from '../utils/TerrainManager';
import bridgeService from './BridgeService';

// Create the context
const RobotContext = createContext();

// Action types
const actions = {
  ADD_ROBOT: 'ADD_ROBOT',
  UPDATE_ROBOT: 'UPDATE_ROBOT',
  SELECT_ROBOT: 'SELECT_ROBOT',
  SET_ROBOT_TASK: 'SET_ROBOT_TASK',
  SET_RENDERER: 'SET_RENDERER',
  SET_ROBOT_CAPABILITIES: 'SET_ROBOT_CAPABILITIES',
  UPDATE_TERRAIN_DIMENSIONS: 'UPDATE_TERRAIN_DIMENSIONS' // New action type
};

// Initial state
const initialState = {
  robots: {}, // Map of robotId -> robotData
  selectedRobotId: null,
  renderer: null,
  terrainDimensions: { width: 0, height: 0 } // Add terrain dimensions
};

// Reducer function using Immer to handle state updates
function robotReducer(state, action) {
  return produce(state, draft => {
    switch (action.type) {
      case actions.ADD_ROBOT:
        draft.robots[action.payload.id] = action.payload;
        break;
      
      case actions.UPDATE_ROBOT:
        if (draft.robots[action.payload.id]) {
          Object.assign(draft.robots[action.payload.id], action.payload);
        }
        break;
      
      case actions.SELECT_ROBOT:
        draft.selectedRobotId = action.payload;
        break;
      
      case actions.SET_ROBOT_TASK:
        if (draft.robots[action.payload.robotId]) {
          draft.robots[action.payload.robotId].task = action.payload.task;
        }
        break;
      
      case actions.SET_RENDERER:
        draft.renderer = action.payload;
        // Restore setting initial dimensions when renderer is first set.
        // This provides non-zero dimensions quickly for initial render.
        if (action.payload && typeof action.payload.getTerrainDimensions === 'function') {
          draft.terrainDimensions = action.payload.getTerrainDimensions();
          console.log('RobotContext: Initial terrain dimensions set on renderer init:', draft.terrainDimensions);
        } else {
          // Fallback if renderer is invalid or missing the method
          draft.terrainDimensions = { width: 0, height: 0 }; 
        }
        break;

      case actions.UPDATE_TERRAIN_DIMENSIONS: // Handle new action
        draft.terrainDimensions = action.payload;
        console.log('RobotContext: Terrain dimensions updated:', draft.terrainDimensions);
        break;
        
      case actions.SET_ROBOT_CAPABILITIES:
        if (draft.robots[action.payload.robotId]) {
          draft.robots[action.payload.robotId].capabilities = {
            ...draft.robots[action.payload.robotId].capabilities,
            ...action.payload.capabilities
          };
        }
        break;
    }
  });
}

// Provider component
export const RobotProvider = ({ children }) => {
  const [state, dispatch] = useReducer(robotReducer, initialState);
  
  // Register the dispatch and actions with bridge service
  useEffect(() => {
    bridgeService.registerContext(dispatch, actions);
  }, []);
  
  // Memoized selectors
  const selectedRobot = state.selectedRobotId 
    ? state.robots[state.selectedRobotId] 
    : null;
  
  const robotList = Object.values(state.robots);
  
  // Effect to initialize the renderer
  useEffect(() => {
    // Function to get map path from URL query param or default
    // Duplicated from MarsRoverPage - consider refactoring to a shared util if needed
    const getMapPathFromQuery = () => {
      const params = new URLSearchParams(window.location.search);
      const mapParam = params.get('map');
      // Basic check if mapParam looks like a path - more robust validation could be added
      // We don't have access to availableMaps here easily, so we rely on TerrainRenderer handling errors.
      if (mapParam && mapParam.includes('/')) {
        return mapParam;
      }
      return '/out.png'; // Default map path
    };

    // Listen for renderer initialization using BridgeService subscription
    const unsubscribeInitialized = bridgeService.subscribe('rendererInitialized', (renderer) => {
      dispatch({
        type: actions.SET_RENDERER,
        payload: renderer
      });
      // --- Removed loadTerrain call here; MapView now handles it ---
    });

    // Still keep DOM event listener for backward compatibility
    const handleRendererInitialized = (event) => {
      const { renderer } = event.detail;
      dispatch({
        type: actions.SET_RENDERER,
        payload: renderer
      });
       // --- Removed loadTerrain call here; MapView now handles it ---
    };

    window.addEventListener('rendererInitialized', handleRendererInitialized);

    return () => {
      window.removeEventListener('rendererInitialized', handleRendererInitialized);
      unsubscribeInitialized();
    };
  }, []);

  // Effect to listen for terrain dimension updates
  useEffect(() => {
    const unsubscribeDimensions = bridgeService.subscribe('terrainDimensionsChanged', (dimensions) => {
      dispatch({
        type: actions.UPDATE_TERRAIN_DIMENSIONS,
        payload: dimensions
      });
    });

    return () => {
      unsubscribeDimensions();
    };
  }, []); // Run once on mount
  
  // Effect to listen for robot updates using BridgeService subscriptions
  useEffect(() => {
    // Subscribe to robot added events
    const unsubscribeAdded = bridgeService.subscribe('robotAdded', (robotData) => {
      dispatch({ 
        type: actions.ADD_ROBOT, 
        payload: robotData 
      });
    });
    
    // Subscribe to robot updated events
    const unsubscribeUpdated = bridgeService.subscribe('robotUpdated', (robotData) => {
      dispatch({ 
        type: actions.UPDATE_ROBOT, 
        payload: robotData 
      });
    });
    
    // Subscribe to robot selected events
    const unsubscribeSelected = bridgeService.subscribe('robotSelected', (robotData) => {
      dispatch({ 
        type: actions.SELECT_ROBOT, 
        payload: robotData ? robotData.id : null 
      });
    });
    
    // We still keep DOM event listeners for backward compatibility
    // but we'll remove them once all components are migrated
    const handleRobotAdded = (event) => {
      const { robot } = event.detail;
      dispatch({ 
        type: actions.ADD_ROBOT, 
        payload: robot 
      });
    };
    
    const handleRobotUpdated = (event) => {
      const { robot } = event.detail;
      dispatch({ 
        type: actions.UPDATE_ROBOT, 
        payload: robot 
      });
    };
    
    const handleRobotSelected = (event) => {
      const { robot } = event.detail;
      if (robot) {
        dispatch({ 
          type: actions.SELECT_ROBOT, 
          payload: robot.id 
        });
      } else {
        dispatch({ 
          type: actions.SELECT_ROBOT, 
          payload: null 
        });
      }
    };
    
    window.addEventListener('robotAdded', handleRobotAdded);
    window.addEventListener('robotUpdated', handleRobotUpdated);
    window.addEventListener('robotSelected', handleRobotSelected);
    
    return () => {
      // Clean up DOM event listeners
      window.removeEventListener('robotAdded', handleRobotAdded);
      window.removeEventListener('robotUpdated', handleRobotUpdated);
      window.removeEventListener('robotSelected', handleRobotSelected);
      
      // Clean up BridgeService subscriptions
      unsubscribeAdded();
      unsubscribeUpdated();
      unsubscribeSelected();
    };
  }, []);
  
  // Action creators as memoized callbacks
  const addRobotAtPosition = useCallback((x, z) => {
    // Use TerrainManager directly instead of dispatching an event
    if (terrainManager.renderer) {
      console.log(`RobotContext: Adding robot at position (${x}, ${z})`);
      terrainManager.addRobotAtPosition(x, z);
    } else {
      console.warn('TerrainManager not ready yet, cannot add robot directly');
      // Use BridgeService instead of dispatching event directly
      bridgeService.requestAddRobot(x, z);
    }
  }, []);
  
  const selectRobot = useCallback((robotId) => {
    dispatch({ type: actions.SELECT_ROBOT, payload: robotId });
    
    // Sync with 3D world
    if (state.renderer) {
      state.renderer.robotManager.selectRobot(robotId);
    }
  }, [state.renderer]);
  
  const setRobotTask = useCallback((robotId, task) => {
    dispatch({ 
      type: actions.SET_ROBOT_TASK, 
      payload: { robotId, task } 
    });
    
    // Sync with 3D world
    if (state.renderer) {
      state.renderer.setRobotTask(robotId, task);
    }
  }, [state.renderer]);
  
  const setRobotCapabilities = useCallback((robotId, capabilities) => {
    dispatch({
      type: actions.SET_ROBOT_CAPABILITIES,
      payload: { robotId, capabilities }
    });
    
    // Sync with 3D world
    if (state.renderer && state.renderer.robotManager) {
      state.renderer.robotManager.setRobotCapabilities(robotId, capabilities);
    }
  }, [state.renderer]);
  
  // Context value
  const contextValue = {
    robots: robotList,
    robotsMap: state.robots,
    selectedRobotId: state.selectedRobotId,
    selectedRobot,
    renderer: state.renderer,
    terrainDimensions: state.terrainDimensions, // Expose terrain dimensions
    
    // Actions
    addRobotAtPosition,
    selectRobot,
    setRobotTask,
    setRobotCapabilities
  };
  
  return (
    <RobotContext.Provider value={contextValue}>
      {children}
    </RobotContext.Provider>
  );
};

// Custom hook to use the Robot context
export const useRobots = () => {
  const context = useContext(RobotContext);
  if (context === undefined) {
    throw new Error('useRobots must be used within a RobotProvider');
  }
  return context;
};
