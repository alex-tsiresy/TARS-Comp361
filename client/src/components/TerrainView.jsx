import React, { useRef, useEffect, useState } from 'react';
import TerrainRenderer from '../utils/TerrainRenderer';
import '../styles/TerrainView.css';

const TerrainView = ({ onRobotSelected, onRendererInitialized }) => {
  const containerRef = useRef(null);
  const [renderer, setRenderer] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;
    
    if (!containerRef.current) return;

    // Initialize the terrain renderer
    const terrainRenderer = new TerrainRenderer(containerRef.current);
    
    // Load the terrain
    terrainRenderer.loadTerrain();
    
    // Save renderer reference
    setRenderer(terrainRenderer);
    
    // Pass renderer to parent component
    if (onRendererInitialized && isMountedRef.current) {
      onRendererInitialized(terrainRenderer);
    }

    // Set up event listener for robot selection
    const handleRobotSelected = (event) => {
      if (!isMountedRef.current) return;
      
      const { robot } = event.detail;
      if (onRobotSelected) {
        onRobotSelected(robot);
      }
    };

    window.addEventListener('robotSelected', handleRobotSelected);

    // Cleanup on unmount
    return () => {
      // Mark as unmounted first to prevent accessing disposed objects
      isMountedRef.current = false;
      
      console.log('Disposing terrain renderer');
      if (terrainRenderer) {
        terrainRenderer.dispose();
      }
      window.removeEventListener('robotSelected', handleRobotSelected);
    };
  }, [onRobotSelected, onRendererInitialized]);

  const handleZoomIn = () => {
    if (renderer && isMountedRef.current) {
      renderer.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (renderer && isMountedRef.current) {
      renderer.zoomOut();
    }
  };

  const handleAddRobot = () => {
    if (renderer && isMountedRef.current) {
      const robot = renderer.addRobot();
      if (robot && onRobotSelected) {
        onRobotSelected(robot);
      }
    }
  };

  return (
    <div className="terrain-view-container">
      <div className="terrain-view" ref={containerRef}></div>
      <div className="terrain-controls">
        <button className="zoom-button" onClick={handleZoomIn} title="Zoom In">+</button>
        <button className="zoom-button" onClick={handleZoomOut} title="Zoom Out">-</button>
        <button className="add-robot-button" onClick={handleAddRobot} title="Add Robot">
          🤖
        </button>
      </div>
    </div>
  );
};

export default TerrainView; 