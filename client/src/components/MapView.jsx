import React, { useEffect, useState, useRef } from 'react';
import '../styles/MapView.css';

const MapView = ({ onRobotSelected }) => {
  const mapRef = useRef(null);
  const [robots, setRobots] = useState([]);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [selectedRobotId, setSelectedRobotId] = useState(null);
  
  // Set up map dimensions on mount
  useEffect(() => {
    if (mapRef.current) {
      const { width, height } = mapRef.current.getBoundingClientRect();
      setMapDimensions({ width, height });
    }
    
    // Subscribe to robot updates from the event system
    const handleRobotAdded = (event) => {
      const { robot } = event.detail;
      setRobots(prev => {
        // Check if robot already exists in state
        const exists = prev.some(r => r.id === robot.id);
        if (exists) {
          // Update existing robot
          return prev.map(r => r.id === robot.id ? robot : r);
        } else {
          // Add new robot
          return [...prev, robot];
        }
      });
    };
    
    const handleRobotUpdated = (event) => {
      const { robot } = event.detail;
      setRobots(prev => prev.map(r => r.id === robot.id ? robot : r));
    };
    
    // Listen for robot selection events
    const handleRobotSelected = (event) => {
      const { robot } = event.detail;
      console.log('MapView received robot selection event:', robot?.id);
      
      // Update internal selection state
      setSelectedRobotId(robot?.id || null);
      
      // Update all robots to reflect selection state
      setRobots(prev => prev.map(r => ({
        ...r,
        selected: r.id === (robot?.id || null)
      })));
    };
    
    window.addEventListener('robotAdded', handleRobotAdded);
    window.addEventListener('robotUpdated', handleRobotUpdated);
    window.addEventListener('robotSelected', handleRobotSelected);
    
    return () => {
      window.removeEventListener('robotAdded', handleRobotAdded);
      window.removeEventListener('robotUpdated', handleRobotUpdated);
      window.removeEventListener('robotSelected', handleRobotSelected);
    };
  }, []);

  // Convert terrain coordinates to map coordinates
  const terrainToMapCoords = (x, z) => {
    // Assuming terrain is centered at (0,0) with a range of -1000 to 1000
    // We need to map these coordinates to our map dimensions
    const terrainSize = 2000; // Total size of the terrain
    
    // Convert from terrain coords to percentage (0-1)
    const xPercent = (x + terrainSize/2) / terrainSize;
    const zPercent = (z + terrainSize/2) / terrainSize;
    
    // Convert from percentage to pixels on the map
    const mapX = xPercent * mapDimensions.width;
    const mapY = (1 - zPercent) * mapDimensions.height; // Invert Y-axis
    
    return { x: mapX, y: mapY };
  };

  // Handle robot marker click
  const handleRobotClick = (robot) => {
    console.log('Robot marker clicked:', robot.id);
    
    // Update internal selection state
    setSelectedRobotId(robot.id);
    
    // Propagate selection to parent component
    if (onRobotSelected) {
      onRobotSelected(robot);
    }
    
    // Dispatch a robot selection event for other components
    const selectEvent = new CustomEvent('robotSelected', {
      detail: { robot: robot }
    });
    window.dispatchEvent(selectEvent);
  };

  // For adding a new robot at a specific map position
  const handleMapClick = (e) => {
    if (!mapRef.current) return;
    
    // Get click position relative to map
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert map coordinates to terrain coordinates
    const clickXPercent = clickX / mapDimensions.width;
    const clickYPercent = clickY / mapDimensions.height;
    
    const terrainSize = 2000;
    const terrainX = (clickXPercent * terrainSize) - (terrainSize / 2);
    const terrainZ = ((1 - clickYPercent) * terrainSize) - (terrainSize / 2);
    
    console.log(`Map clicked at (${clickX}, ${clickY}), terrain coordinates: (${terrainX}, ${terrainZ})`);
    
    // Dispatch a custom event to request adding a robot
    const addRobotEvent = new CustomEvent('addRobotRequest', {
      detail: { position: { x: terrainX, z: terrainZ } }
    });
    window.dispatchEvent(addRobotEvent);
  };

  return (
    <div className="map-view-container">
      <div className="map-controls">
        <div className="add-robot-button" onClick={handleMapClick}>
          +
          <div className="add-robot-tooltip">Add new robot</div>
        </div>
        <p className="map-instructions">Click anywhere on the map to add a robot. Click on a robot to select it.</p>
      </div>
      <div className="map-view" ref={mapRef} onClick={handleMapClick}>
        <div className="map-background"></div>
        <div className="robot-container">
          {robots.map(robot => {
            const { x, y } = terrainToMapCoords(robot.position.x, robot.position.z);
            const isSelected = robot.id === selectedRobotId;
            
            return (
              <div key={robot.id} className="robot-container">
                <div 
                  className={`robot-marker ${isSelected ? 'selected' : ''}`}
                  style={{ 
                    left: `${x}px`, 
                    top: `${y}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRobotClick(robot);
                  }}
                  title={`Robot ${robot.id.substring(0, 8)}${isSelected ? ' (Selected)' : ''}`}
                />
              </div>
            );
          })}
        </div>
        <div className="map-axes" title="Coordinate system orientation"></div>
      </div>
    </div>
  );
};

export default MapView; 