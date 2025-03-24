import React, { useState, useRef, useEffect } from 'react';
import MapView from '../components/MapView';
import '../styles/MarsRoverPage.css';
import terrainManager from '../utils/TerrainManager';

const MarsRoverPage = () => {
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [taskInput, setTaskInput] = useState('');
  const firstPersonViewRef = useRef(null);
  const radarViewRef = useRef(null);
  const [renderer, setRenderer] = useState(null);
  
  // Handle robot selection from MapView
  const handleRobotSelected = (robot) => {
    console.log('Robot selected in map view:', robot?.id);
    
    // Update the local state with a deep copy
    setSelectedRobot(robot ? {...robot} : null);
    
    // If we have a renderer, tell it to select this robot
    if (renderer && robot) {
      console.log(`Telling renderer to select robot ${robot.id}`);
      
      // Make sure the robot exists in the renderer
      const rendererRobot = renderer.getSelectedRobot();
      if (rendererRobot && rendererRobot.id === robot.id) {
        console.log('Robot already selected in renderer');
      } else {
        console.log('Selecting robot in renderer');
        renderer.robotManager.selectRobot(robot.id);
        
        // Force setup of renderers if needed
        if (firstPersonViewRef.current && radarViewRef.current) {
          console.log('Setting up renderers for selected robot');
          setTimeout(() => {
            renderer.setupRobotViewRenderer(firstPersonViewRef.current);
            renderer.setupRadarRenderer(radarViewRef.current);
          }, 50);
        }
      }
    } else if (renderer && !robot) {
      console.log('Clearing robot selection in renderer');
      renderer.robotManager.selectRobot(null);
    }
    
    // Broadcast the selection to other components
    if (robot) {
      console.log('Broadcasting robot selection from MapView handler');
      const event = new CustomEvent('robotSelected', {
        detail: { robot: {...robot} }
      });
      window.dispatchEvent(event);
    }
  };
  
  // Initialize renderer from TerrainManager
  useEffect(() => {
    const handleRendererInitialized = (event) => {
      const { renderer: newRenderer } = event.detail;
      console.log('Renderer initialized in MarsRoverPage from TerrainManager');
      setRenderer(newRenderer);
    };
    
    window.addEventListener('rendererInitialized', handleRendererInitialized);
    
    return () => {
      window.removeEventListener('rendererInitialized', handleRendererInitialized);
    };
  }, []);
  
  // Listen for robot updates
  useEffect(() => {
    const handleRobotUpdated = (event) => {
      const { robot } = event.detail;
      if (!robot) {
        console.warn('Received robotUpdated event with no robot data');
        return;
      }
      
      if (selectedRobot && robot.id === selectedRobot.id) {
        console.log(`Robot ${robot.id} updated, height: ${robot.height}, updating state`);
        
        // Make a deep copy to ensure React sees it as a state change
        setSelectedRobot(currentRobot => {
          // Only update if data has actually changed
          if (JSON.stringify(currentRobot) !== JSON.stringify(robot)) {
            return { ...robot };
          }
          return currentRobot;
        });
      }
    };
    
    console.log('Adding robotUpdated event listener');
    window.addEventListener('robotUpdated', handleRobotUpdated);
    
    return () => {
      console.log('Removing robotUpdated event listener');
      window.removeEventListener('robotUpdated', handleRobotUpdated);
    };
  }, [selectedRobot]);
  
  // Listen for robot selection events (including from TerrainManager)
  useEffect(() => {
    const handleRobotSelected = (event) => {
      const { robot } = event.detail;
      console.log('Robot selected event received in MarsRoverPage:', robot?.id);
      
      if (!robot) {
        console.log('Clearing selected robot');
        setSelectedRobot(null);
        return;
      }
      
      console.log('Setting selected robot state to:', robot);
      // Create a complete copy of the robot object to avoid any reference issues
      setSelectedRobot(prevRobot => {
        // If we already have this robot selected with the same data, avoid re-render
        if (prevRobot?.id === robot.id && 
            JSON.stringify(prevRobot) === JSON.stringify(robot)) {
          console.log('Robot already selected with same data, avoiding re-render');
          return prevRobot;
        }
        return { ...robot };
      });
      
      // If the robot exists and the renderer exists, ensure it's selected in the renderer too
      if (robot && renderer) {
        console.log(`Ensuring robot ${robot.id} is selected in renderer`);
        renderer.robotManager.selectRobot(robot.id);
        
        // Force setup of views if needed
        if (firstPersonViewRef.current && radarViewRef.current) {
          console.log('Setting up view renderers for selected robot');
          renderer.setupRobotViewRenderer(firstPersonViewRef.current);
          renderer.setupRadarRenderer(radarViewRef.current);
        }
      }
    };
    
    console.log('Adding robotSelected event listener in MarsRoverPage');
    window.addEventListener('robotSelected', handleRobotSelected);
    
    return () => {
      console.log('Removing robotSelected event listener in MarsRoverPage');
      window.removeEventListener('robotSelected', handleRobotSelected);
    };
  }, [renderer]);
  
  // Set up robot view renderers
  useEffect(() => {
    if (!renderer || !firstPersonViewRef.current || !radarViewRef.current) {
      return; // Wait until all dependencies are available
    }
    
    try {
      console.log('Setting up robot view renderers');
      
      // Log container dimensions for debugging
      const fpvSize = {
        width: firstPersonViewRef.current.clientWidth,
        height: firstPersonViewRef.current.clientHeight
      };
      
      const radarSize = {
        width: radarViewRef.current.clientWidth,
        height: radarViewRef.current.clientHeight
      };
      
      console.log('Container sizes:', { fpv: fpvSize, radar: radarSize });
      
      // Setup both renderers
      renderer.setupRobotViewRenderer(firstPersonViewRef.current);
      renderer.setupRadarRenderer(radarViewRef.current);
      
      // Force a resize event to ensure renderers are properly sized
      window.dispatchEvent(new Event('resize'));
      
      // Schedule another resize after a delay in case of layout shifts
      const resizeTimer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 1000);
      
      return () => clearTimeout(resizeTimer);
    } catch (error) {
      console.error('Failed to set up robot view renderers:', error);
    }
  }, [renderer, firstPersonViewRef, radarViewRef]);
  
  // Handle task assignment
  const handleAssignTask = () => {
    if (selectedRobot && renderer && taskInput) {
      renderer.setRobotTask(selectedRobot.id, taskInput);
      setSelectedRobot({
        ...selectedRobot,
        task: taskInput
      });
      setTaskInput('');
    }
  };
  
  // Log selected robot state whenever it changes
  useEffect(() => {
    console.log('Selected robot state updated:', selectedRobot);
  }, [selectedRobot]);
  
  return (
    <div className="mars-rover-page">
      <div className="terrain-panel">
        <MapView 
          onRobotSelected={handleRobotSelected}
        />
      </div>
      
      <div className="info-panel">
        {selectedRobot ? (
          <>
            <div className="robot-details">
              <h2>Robot Details</h2>
              <div className="detail-content">
                <p><span>ID:</span> {selectedRobot.id.substring(0, 8)}</p>
                <p><span>Position:</span> X: {selectedRobot.position.x.toFixed(2)}, 
                                  Z: {selectedRobot.position.z.toFixed(2)}</p>
                <p><span>Height:</span> {selectedRobot.height ? Math.max(0, selectedRobot.height).toFixed(0) : '20'}m</p>
                <p><span>Coordinates:</span> {selectedRobot.coordinates ? 
                  `${selectedRobot.coordinates.x.toFixed(2)}, ${selectedRobot.coordinates.z.toFixed(2)}` : 
                  'N/A'}</p>
                <p><span>Task:</span> {selectedRobot.task || 'No task assigned'}</p>
              </div>
            </div>
            
            <div className="robot-views">
              <div className="view-container">
                <h3>First Person View</h3>
                <div 
                  className="first-person-view" 
                  ref={firstPersonViewRef}
                  style={{ 
                    height: '200px', 
                    backgroundColor: '#111', 
                    border: '1px solid #333',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* The 3D renderer will be attached here */}
                  <div className="view-label" style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}>
                    Robot: {selectedRobot.id.substring(0, 8)} - Facing: {
                      selectedRobot.direction ? 
                      `X:${selectedRobot.direction.x.toFixed(2)}, Z:${selectedRobot.direction.z.toFixed(2)}` :
                      'N/A'
                    }
                  </div>
                </div>
              </div>
              
              <div className="view-container">
                <h3>Radar View</h3>
                <div 
                  className="radar-view" 
                  ref={radarViewRef}
                  style={{ 
                    height: '200px', 
                    backgroundColor: '#111', 
                    border: '1px solid #333',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* The 3D renderer will be attached here */}
                  <div className="view-label" style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}>
                    Overhead view - {selectedRobot.coordinates ? 
                      `Pos: ${selectedRobot.coordinates.x.toFixed(0)}, ${selectedRobot.coordinates.z.toFixed(0)}` : 
                      'N/A'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="control-panel">
              <div className="task-controls">
                <input
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="Enter task description..."
                  className="task-input"
                />
                <button 
                  className="assign-task"
                  onClick={handleAssignTask}
                  disabled={!taskInput}
                >
                  Assign Task
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="no-selection-view">
            <div className="no-selection-message">
              <h2>No Robot Selected</h2>
              <p>Click on a robot on the map to view details and control it.</p>
              <p>If there are no robots yet, click on the map to add one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarsRoverPage; 