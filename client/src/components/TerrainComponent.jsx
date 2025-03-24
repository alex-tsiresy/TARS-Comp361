// TerrainExplorerComponent.js
import React, { useRef, useEffect } from 'react';
import { TerrainExplorer } from '../utils/TerrainExplorer'; // Updated path to the class

const TerrainExplorerComponent = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    // 1. Instantiate your class, passing in the <div> as the container
    const explorer = new TerrainExplorer(containerRef.current);

    // 2. Cleanup (optional):
    return () => {
      // If you'd like to remove the renderer from the container or do any
      // manual cleanup, you can do it here. For instance:
      if (containerRef.current && explorer.renderer) {
        containerRef.current.removeChild(explorer.renderer.domElement);
      }
      // If you wanted a more robust cleanup (like removing event listeners),
      // you could add a `dispose()` method to your TerrainExplorer class
      // and call it here.
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    />
  );
};

export default TerrainExplorerComponent;
