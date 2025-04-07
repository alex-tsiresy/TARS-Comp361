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
    addRobotAtPosition,
    terrainDimensions // Get terrain dimensions from context
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
    // Use dynamic terrain dimensions from context
    const { width: terrainWidth, height: terrainHeight } = terrainDimensions;

    // Handle case where dimensions might not be loaded yet
    if (!terrainWidth || !terrainHeight || !mapDimensions.width || !mapDimensions.height) {
      return { x: 0, y: 0 }; // Default to origin if dimensions are invalid
    }

    // Convert from terrain coords (-width/2 to width/2, -height/2 to height/2) to percentage (0-1)
    const xPercent = (x + terrainWidth / 2) / terrainWidth;
    const zPercent = (z + terrainHeight / 2) / terrainHeight; // Use terrainHeight for Z

    // Convert from percentage to pixels on the map
    let mapX = xPercent * mapDimensions.width;
    let mapY = (1 - zPercent) * mapDimensions.height; // Invert Y-axis

    // Clamp coordinates to ensure the marker stays visually within bounds
    mapX = Math.max(0, Math.min(mapX, mapDimensions.width));
    mapY = Math.max(0, Math.min(mapY, mapDimensions.height));
    
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

    // Use dynamic terrain dimensions from context
    const { width: terrainWidth, height: terrainHeight } = terrainDimensions;

    // Handle case where dimensions might not be loaded yet
    if (!terrainWidth || !terrainHeight) {
      console.warn("Cannot add robot: Terrain dimensions not yet available.");
      return; 
    }

    // Convert map click percentage back to terrain coordinates
    const terrainX = (clickXPercent * terrainWidth) - (terrainWidth / 2);
    const terrainZ = ((1 - clickYPercent) * terrainHeight) - (terrainHeight / 2); // Use terrainHeight for Z

    console.log(`Map clicked at (${clickX}, ${clickY}), terrain coordinates: (${terrainX.toFixed(2)}, ${terrainZ.toFixed(2)})`);
    
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
