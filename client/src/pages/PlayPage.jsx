import React, { useRef, useEffect, useState } from 'react';
import { TerrainExplorer } from '../utils/TerrainExplorer';
import '../styles/MarsRoverUI.css';

const MarsRoverUI = () => {
  const terrainContainerRef = useRef(null);
  const firstPersonViewRef = useRef(null);
  const radarViewRef = useRef(null);
  const [robots, setRobots] = useState([]);
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [explorer, setExplorer] = useState(null);

  useEffect(() => {
    if (terrainContainerRef.current) {
      // Initialize the terrain explorer
      const terrainExplorer = new TerrainExplorer(terrainContainerRef.current);
      setExplorer(terrainExplorer);
      
      // Set up birds-eye view camera
      terrainExplorer.camera.position.set(0, 1000, 0);
      terrainExplorer.camera.lookAt(0, 0, 0);
      
      // Disable keyboard controls to prevent switching out of bird's eye view
      terrainExplorer.disableKeyboardControls = true;
      
      // Disable pointer lock to prevent switching to first-person view
      terrainExplorer.disablePointerLock = true;
      
      return () => {
        // Cleanup
        if (terrainContainerRef.current && terrainExplorer.renderer) {
          terrainContainerRef.current.removeChild(terrainExplorer.renderer.domElement);
        }
        
        if (firstPersonViewRef.current && terrainExplorer.robotViewRenderer) {
          firstPersonViewRef.current.removeChild(terrainExplorer.robotViewRenderer.domElement);
        }
        
        if (radarViewRef.current && terrainExplorer.robotRadarRenderer) {
          radarViewRef.current.removeChild(terrainExplorer.robotRadarRenderer.domElement);
        }
      };
    }
  }, []);

  // Set up robot view renderers once the refs are available and explorer is initialized
  useEffect(() => {
    if (explorer && firstPersonViewRef.current && radarViewRef.current) {
      explorer.setupRobotViewRenderer(firstPersonViewRef.current);
      explorer.setupRadarRenderer(radarViewRef.current);
    }
  }, [explorer, firstPersonViewRef, radarViewRef]);

  // Listen for robot selection events
  useEffect(() => {
    const handleRobotSelected = (event) => {
      const { robotId } = event.detail;
      if (robotId && explorer && explorer.robots[robotId]) {
        setSelectedRobot(explorer.robots[robotId]);
      }
    };

    window.addEventListener('robotSelected', handleRobotSelected);
    return () => {
      window.removeEventListener('robotSelected', handleRobotSelected);
    };
  }, [explorer]);

  const addRobot = () => {
    if (!explorer) return;
    
    // Generate a random position within the terrain bounds
    const x = Math.random() * 1600 - 800; // -800 to 800
    const z = Math.random() * 1600 - 800; // -800 to 800
    
    // Get height at this position
    const y = explorer.getHeightAtPosition(x, z) + 2; // 2 units above terrain
    
    const newRobot = {
      id: Date.now(),
      position: { x, y, z },
      height: Math.round(y),
      coordinates: { x: Math.round(x + 1000), z: Math.round(z + 1000) }, // Adjusted for UI display (0-2000)
      task: 'moving randomly',
      lastPointOfInterest: 'none'
    };
    
    // Add the robot to the scene
    explorer.addRobot(newRobot);
    
    // Update state
    setRobots(prevRobots => [...prevRobots, newRobot]);
    
    // Select the newly added robot
    setSelectedRobot(newRobot);
    explorer.selectRobot(newRobot.id);
  };

  const handleZoomIn = () => {
    if (explorer) {
      // Use the new setZoomLevel method for smoother zooming
      const newHeight = explorer.camera.position.y - 100;
      explorer.setZoomLevel(newHeight);
    }
  };

  const handleZoomOut = () => {
    if (explorer) {
      // Use the new setZoomLevel method for smoother zooming
      const newHeight = explorer.camera.position.y + 100;
      explorer.setZoomLevel(newHeight);
    }
  };

  const handleTaskChange = () => {
    // For now, this just logs that the task would change
    console.log('Task would be changed for robot:', selectedRobot?.id);
  };

  return (
    <div className="mars-rover-ui">
      <div className="left-panel">
        <div className="terrain-view" ref={terrainContainerRef}></div>
        <div className="area-labels">
          <div className="area-label perseverance">Perseverance Area</div>
          <div className="area-label curiosity">Curiosity Area</div>
        </div>
        <div className="control-panel">
          <div className="control-buttons">
            <button className="zoom-in" onClick={handleZoomIn} title="Zoom In">+</button>
            <button className="zoom-out" onClick={handleZoomOut} title="Zoom Out">-</button>
          </div>
          <button className="add-robot-btn" onClick={addRobot} title="Add Robot">
            <div className="robot-icon-container">🤖</div>
            <div className="add-robot-label">
              Add<br />Robot
            </div>
          </button>
        </div>
      </div>
      
      <div className="right-panel">
        <div className="robot-details">
          <h2>DETAILS</h2>
          {selectedRobot ? (
            <>
              <p>-height: {selectedRobot.height}m</p>
              <p>-coordinates: ({selectedRobot.coordinates.x}, {selectedRobot.coordinates.z})</p>
              <p>-current task: {selectedRobot.task}</p>
              <p>-last seen point of interest: {selectedRobot.lastPointOfInterest}</p>
            </>
          ) : (
            <p>No robot selected</p>
          )}
        </div>
        
        <div className="connection-status">
          <span>CONNECTED</span>
          <div className="download-speed">DOWNLOAD SPEED: 74Mbps</div>
        </div>
        
        <div className="task-control">
          <div className="dropdown">
            <button className="dropdown-toggle" onClick={handleTaskChange}>
              Change tasks
              <span className="dropdown-arrow">▼</span>
            </button>
          </div>
          <button className="submit-button">Submit</button>
        </div>
        
        <div className="view-section">
          <h3>First Person View</h3>
          <div className="first-person-view" ref={firstPersonViewRef}>
            {!selectedRobot && <div className="terrain-line"></div>}
          </div>
        </div>
        
        <div className="view-section">
          <h3>Radar View</h3>
          <div className="radar-view" ref={radarViewRef}>
            {!selectedRobot && (
              <div className="radar-circles">
                <div className="radar-circle c1"></div>
                <div className="radar-circle c2"></div>
                <div className="radar-circle c3"></div>
                <div className="radar-circle c4"></div>
                <div className="radar-circle c5"></div>
                <div className="radar-center"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarsRoverUI; 