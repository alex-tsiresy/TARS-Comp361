import React, { useEffect, useState, useRef } from 'react';
import '../styles/MapView.css';

const MapView = ({ onRobotSelected }) => {
  const mapRef = useRef(null);
  const [robots, setRobots] = useState([]);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  
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
    
    window.addEventListener('robotAdded', handleRobotAdded);
    window.addEventListener('robotUpdated', handleRobotUpdated);
    
    return () => {
      window.removeEventListener('robotAdded', handleRobotAdded);
      window.removeEventListener('robotUpdated', handleRobotUpdated);
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
    if (onRobotSelected) {
      onRobotSelected(robot);
    }
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
    
    // Dispatch a custom event to request adding a robot
    const addRobotEvent = new CustomEvent('addRobotRequest', {
      detail: { position: { x: terrainX, z: terrainZ } }
    });
    window.dispatchEvent(addRobotEvent);
  };

  return (
    <div className="map-view-container">
      <div 
        className="map-view" 
        ref={mapRef} 
        onClick={handleMapClick}
      >
        {/* Map background image */}
        <div className="map-background"></div>
        
        {/* Plot robot markers */}
        {robots.map(robot => {
          const { x, y } = terrainToMapCoords(robot.position.x, robot.position.z);
          
          return (
            <div key={robot.id} className="robot-container">
              <div 
                className={`robot-marker ${robot.selected ? 'selected' : ''}`}
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRobotClick(robot);
                }}
                title={`Robot ${robot.id.substring(0, 8)}`}
              />
              
              {robot.direction && (
                <div 
                  className={`direction-indicator ${robot.selected ? 'selected' : ''}`}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: `rotate(${Math.atan2(robot.direction.z, robot.direction.x) * 180 / Math.PI}deg)`
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="map-controls">
        <button className="add-robot-button" onClick={() => handleMapClick()} title="Add Robot">
          🤖
        </button>
        <p className="map-instructions">Click anywhere on the map to add a robot</p>
      </div>
    </div>
  );
};

export default MapView; 