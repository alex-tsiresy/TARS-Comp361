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
  
  // Handle robot selection
  const handleRobotSelected = (robot) => {
    setSelectedRobot(robot);
    
    // If we have a renderer, tell it to select this robot
    if (renderer && robot) {
      renderer.robotManager.selectRobot(robot.id);
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
      if (robot && selectedRobot && robot.id === selectedRobot.id) {
        setSelectedRobot(robot);
      }
    };
    
    window.addEventListener('robotUpdated', handleRobotUpdated);
    
    return () => {
      window.removeEventListener('robotUpdated', handleRobotUpdated);
    };
  }, [selectedRobot]);
  
  // Set up robot view renderers
  useEffect(() => {
    const setupRenderers = () => {
      if (renderer && firstPersonViewRef.current && radarViewRef.current) {
        try {
          renderer.setupRobotViewRenderer(firstPersonViewRef.current);
          renderer.setupRadarRenderer(radarViewRef.current);
        } catch (error) {
          console.error('Error setting up renderers:', error);
        }
      }
    };
    
    // Only set up renderers if all dependencies are available
    setupRenderers();
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
                <p><span>Height:</span> {selectedRobot.height ? selectedRobot.height.toFixed(2) : '0'}m</p>
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
                  style={{ height: '120px', backgroundColor: '#111' }}
                >
                  {/* The 3D renderer will be attached here */}
                </div>
              </div>
              
              <div className="view-container">
                <h3>Radar View</h3>
                <div 
                  className="radar-view" 
                  ref={radarViewRef}
                  style={{ height: '120px', backgroundColor: '#111' }}
                >
                  {/* The 3D renderer will be attached here */}
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