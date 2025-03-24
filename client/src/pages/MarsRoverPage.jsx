import React, { useState, useRef, useEffect } from 'react';
import TerrainView from '../components/TerrainView';
import '../styles/MarsRoverPage.css';

const MarsRoverPage = () => {
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [taskInput, setTaskInput] = useState('');
  const firstPersonViewRef = useRef(null);
  const radarViewRef = useRef(null);
  const [renderer, setRenderer] = useState(null);
  
  // Handle robot selection
  const handleRobotSelected = (robot) => {
    setSelectedRobot(robot);
  };
  
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
    
    // Clean up renderer on unmount
    return () => {
      if (renderer) {
        console.log('Cleaning up renderer from MarsRoverPage');
        try {
          // First set to null in parent to prevent further access
          setRenderer(null);
          // Then dispose
          renderer.dispose();
        } catch (error) {
          console.error('Error disposing renderer:', error);
        }
      }
    };
  }, [renderer, firstPersonViewRef, radarViewRef]);
  
  // Handle renderer initialization
  const handleRendererInitialized = (newRenderer) => {
    console.log('Renderer initialized in MarsRoverPage');
    if (newRenderer && !renderer) {
      setRenderer(newRenderer);
    }
  };
  
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
        <TerrainView 
          onRobotSelected={handleRobotSelected}
          onRendererInitialized={handleRendererInitialized}
        />
      </div>
      
      <div className="info-panel">
        <div className="robot-details">
          <h2>Robot Details</h2>
          {selectedRobot ? (
            <div className="detail-content">
              <p><span>ID:</span> {selectedRobot.id.substring(0, 8)}</p>
              <p><span>Position:</span> X: {selectedRobot.position.x}, 
                                Z: {selectedRobot.position.z}</p>
              <p><span>Height:</span> {selectedRobot.height}m</p>
              <p><span>Coordinates:</span> {selectedRobot.coordinates.x}, {selectedRobot.coordinates.z}</p>
              <p><span>Task:</span> {selectedRobot.task}</p>
            </div>
          ) : (
            <div className="no-selection">
              <p>No robot selected</p>
              <p>Click on a robot to view details</p>
            </div>
          )}
        </div>
        
        <div className="robot-views">
          <div className="view-container">
            <h3>First Person View</h3>
            <div 
              className="first-person-view" 
              ref={firstPersonViewRef}
            >
              {!selectedRobot && (
                <div className="view-placeholder">Select a robot to see its view</div>
              )}
            </div>
          </div>
          
          <div className="view-container">
            <h3>Radar View</h3>
            <div 
              className="radar-view" 
              ref={radarViewRef}
            >
              {!selectedRobot && (
                <div className="radar-placeholder">
                  <div className="radar-circle"></div>
                  <div className="radar-circle"></div>
                  <div className="radar-circle"></div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="control-panel">
          {selectedRobot ? (
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
          ) : (
            <div className="no-robot-message">
              Select a robot to assign tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarsRoverPage; 