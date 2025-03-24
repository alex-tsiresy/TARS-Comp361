import React, { useState, useRef, useEffect } from 'react';
import MapView from '../components/MapView';
import '../styles/MarsRoverPage.css';
import { useRobots } from '../context/RobotContext';

const MarsRoverPage = () => {
  const [taskInput, setTaskInput] = useState('');
  const firstPersonViewRef = useRef(null);
  const radarViewRef = useRef(null);
  
  // Get state and actions from context
  const { 
    selectedRobot, 
    renderer, 
    setRobotTask 
  } = useRobots();
  
  // Set up robot view renderers when renderer is available
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
  }, [renderer, selectedRobot]);
  
  // Handle task assignment
  const handleAssignTask = () => {
    if (selectedRobot && taskInput) {
      setRobotTask(selectedRobot.id, taskInput);
      setTaskInput('');
    }
  };
  
  return (
    <div className="mars-rover-page">
      <div className="terrain-panel">
        <MapView />
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