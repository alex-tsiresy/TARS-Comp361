import React, { useEffect, useState, useRef } from 'react';
import '../styles/MapView.css';
import { useRobots } from '../context/RobotContext';

const MapView = () => {
  const mapRef = useRef(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  
  // Use the robot context instead of local state and events
  const { 
    robots, 
    selectedRobotId, 
    selectRobot,
    addRobotAtPosition
  } = useRobots();
  
  // Set up map dimensions on mount
  useEffect(() => {
    if (mapRef.current) {
      const { width, height } = mapRef.current.getBoundingClientRect();
      setMapDimensions({ width, height });
    }
  }, []);

  // Handle window resize to update map dimensions
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        const { width, height } = mapRef.current.getBoundingClientRect();
        setMapDimensions({ width, height });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    
    // Use context function to select robot
    selectRobot(robot.id);
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
    
    // Use context function to add robot
    addRobotAtPosition(terrainX, terrainZ);
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