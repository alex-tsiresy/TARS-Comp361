import React, { useState, useEffect, useCallback } from 'react';
import MapView from '../components/MapView';
import '../styles/MarsRoverPage.css';
import { useRobots } from '../context/RobotContext';
// No need for useLocation/useNavigate if using window.location

// Define available maps - Only include maps from the /maps directory
const availableMaps = [
  { name: 'Crater DTEPC 058362', path: '/maps/DTEPC_058362_1070_057650_1070_A01.png' },
  { name: 'Valley DTEPD 063394', path: '/maps/DTEPD_063394_2485_063526_2485_A01.png' },
];

const MarsRoverPage = () => {
  const [taskInput, setTaskInput] = useState('');
  const [speedInput, setSpeedInput] = useState('0.5');
  const [sensorRangeInput, setSensorRangeInput] = useState('100');
  const [turnRateInput, setTurnRateInput] = useState('0.05');
  const [batteryCapacityInput, setBatteryCapacityInput] = useState('100');

  // Function to get map path from URL query param or default
  const getMapPathFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const mapParam = params.get('map');
    // Validate if the mapParam is one of the available maps
    // Validate if the mapParam is one of the available maps
    const foundMap = availableMaps.find(map => map.path === mapParam);
    if (foundMap) {
      console.log(`Map found in URL: ${foundMap.path}`);
      return foundMap.path;
    }
    // Default to the first map in the list if URL param is missing or invalid
    // Ensure the list is not empty before accessing index 0
    const defaultPath = availableMaps.length > 0 ? availableMaps[0].path : null;
    console.log(`No valid map in URL or list empty, defaulting to: ${defaultPath}`);
    // Return the default path (which could be null if the list is empty)
    return defaultPath;
  };

  // Initialize state from query param
  const [selectedMapPath, setSelectedMapPath] = useState(getMapPathFromQuery());
  // Use state and callback refs instead of useRef
  const [firstPersonViewElement, setFirstPersonViewElement] = useState(null);
  const [radarViewElement, setRadarViewElement] = useState(null);

  // Callback refs to capture the DOM elements
  const firstPersonViewRefCallback = useCallback(node => {
    if (node !== null) {
      setFirstPersonViewElement(node);
    }
  }, []);

  const radarViewRefCallback = useCallback(node => {
    if (node !== null) {
      setRadarViewElement(node);
    }
  }, []);

  // Get state and actions from context
  const { 
    selectedRobot, 
    renderer, 
    setRobotTask,
    setRobotCapabilities
  } = useRobots();

  // Effect to set up the robot view renderers once the main renderer AND elements are available
  useEffect(() => {
    // Wait until renderer and elements are available
    if (!renderer || !firstPersonViewElement || !radarViewElement) {
      console.log('Renderer or view elements not ready yet.'); // Debug log
      return;
    }

    console.log('Renderer and elements ready, setting up views.'); // Debug log
    let resizeTimer = null;
    try {
      console.log('Setting up robot view renderers and initial resize');
      // Setup both renderers using the state elements
      renderer.setupRobotViewRenderer(firstPersonViewElement);
      renderer.setupRadarRenderer(radarViewElement);

      // Force initial resize after setup to ensure renderers fit containers
      if (renderer.handleResize) {
         renderer.handleResize();
         // Also trigger resize after a slight delay to catch layout adjustments
         resizeTimer = setTimeout(() => {
           // Check again in case renderer became null during the timeout
           if (renderer && renderer.handleResize) {
             renderer.handleResize();
           }
         }, 500);
      } else {
        console.warn('Renderer does not have handleResize method during setup.');
      }
    } catch (error) {
      console.error('Failed to set up robot view renderers:', error);
    }
    
    // Cleanup function for the timer
    return () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
    };
    // Depend on renderer and the elements themselves
  }, [renderer, firstPersonViewElement, radarViewElement]);

  // Effect to handle ongoing window resizing for the renderers (no change needed here)
  useEffect(() => {
    // Only run if renderer exists
    if (!renderer) {
      return;
    }

    const handleResize = () => {
      // Check if renderer and handleResize method exist before calling
      if (renderer && renderer.handleResize) {
        // console.log('Handling resize for robot views'); // Optional: uncomment for debugging
        renderer.handleResize();
      } else {
        // This might happen if the component unmounts while a resize is pending
        // console.warn('Renderer or handleResize method not available during resize event'); // Optional: uncomment for debugging
      }
    };

    // Add resize event listener
    window.addEventListener('resize', handleResize);

    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [renderer]); // This effect runs when the renderer instance changes

  // Handle map selection change - NOW forces reload
  const handleMapChange = (event) => {
    const newMapPath = event.target.value;
    // Update URL search params to trigger reload with the new map
    // Use encodeURIComponent to handle potential special characters in paths
    window.location.search = `?map=${encodeURIComponent(newMapPath)}`;
    // No need to call setSelectedMapPath or renderer.loadTerrain here,
    // the reload will handle initialization with the new path from the URL.
  };

  // Set input values to match the selected robot's capabilities when it changes
  useEffect(() => {
    if (selectedRobot && selectedRobot.capabilities) {
      setSpeedInput(selectedRobot.capabilities.maxSpeed?.toString() || '0.5');
      setSensorRangeInput(selectedRobot.capabilities.sensorRange?.toString() || '100');
      setTurnRateInput(selectedRobot.capabilities.turnRate?.toString() || '0.05');
      setBatteryCapacityInput(selectedRobot.capabilities.batteryCapacity?.toString() || '100');
    }
    // Only run this effect when the selected robot ID changes, not on every capability update
  }, [selectedRobot?.id]); 
  
  // Handle behavior selection - now directly sets the task
  const handleBehaviorSelect = (behavior, params = {}) => {
    if (selectedRobot) {
      // Just use the behavior name directly as the task
      let taskDescription = behavior;
      
      // Set the task which will trigger the appropriate behavior
      setRobotTask(selectedRobot.id, taskDescription);
    }
  };
  
  // Handle capacity updates
  const handleSpeedUpdate = () => {
    if (selectedRobot) {
      const speed = parseFloat(speedInput);
      if (!isNaN(speed) && speed > 0) {
        setRobotCapabilities(selectedRobot.id, { maxSpeed: speed });
      }
    }
  };
  
  const handleSensorRangeUpdate = () => {
    if (selectedRobot) {
      const range = parseFloat(sensorRangeInput);
      if (!isNaN(range) && range > 0) {
        setRobotCapabilities(selectedRobot.id, { sensorRange: range });
      }
    }
  };
  
  const handleTurnRateUpdate = () => {
    if (selectedRobot) {
      const rate = parseFloat(turnRateInput);
      if (!isNaN(rate) && rate > 0) {
        setRobotCapabilities(selectedRobot.id, { turnRate: rate });
      }
    }
  };
  
  const handleBatteryCapacityUpdate = () => {
    if (selectedRobot) {
      const capacity = parseFloat(batteryCapacityInput);
      if (!isNaN(capacity) && capacity > 0) {
        setRobotCapabilities(selectedRobot.id, { 
          batteryCapacity: capacity,
          batteryLevel: capacity // Reset current level to new capacity
        });
      }
    }
  };
  
  // New function to reset only the battery level to full
  const handleResetBattery = () => {
    if (selectedRobot && selectedRobot.capabilities) {
      const capacity = selectedRobot.capabilities.batteryCapacity || 100;
      setRobotCapabilities(selectedRobot.id, { 
        batteryLevel: capacity // Reset to full capacity
      });
    }
  };
  
  // Format battery level for display
  const formatBatteryLevel = (level, capacity) => {
    if (level === undefined) return 'N/A';
    const percentage = Math.round((level / (capacity || 100)) * 100);
    return `${Math.round(level)}/${capacity || 100} (${percentage}%)`;
  };
  
  return (
    <div className="mars-rover-page">
      <div className="terrain-panel">
        {/* Pass selectedMapPath to MapView */}
        <MapView mapPath={selectedMapPath} />
        {/* Add Map Selection Dropdown */}
        <div className="map-selector-container">
          <label htmlFor="map-select">Select Terrain Map:</label>
          <select 
            id="map-select" 
            value={selectedMapPath} 
            onChange={handleMapChange}
            className="map-select-dropdown"
          >
            {availableMaps.map(map => (
              <option key={map.path} value={map.path}>
                {map.name}
              </option>
            ))}
          </select>
        </div>
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
                <p><span>Task:</span> {selectedRobot.behaviorGoal || 'random'}</p>
                <p><span>Current Speed:</span> {selectedRobot.speed ? selectedRobot.speed.toFixed(2) : '0.00'}</p>
                {selectedRobot.capabilities && (
                  <>
                    <p><span>Max Speed:</span> {selectedRobot.capabilities.maxSpeed?.toFixed(2) || '0.50'}</p>
                    <p><span>Turn Rate:</span> {selectedRobot.capabilities.turnRate?.toFixed(2) || '0.05'}</p>
                    <p><span>Sensor Range:</span> {selectedRobot.capabilities.sensorRange?.toFixed(0) || '100'}</p>
                    <p><span>Battery:</span> {formatBatteryLevel(
                      selectedRobot.capabilities.batteryLevel, 
                      selectedRobot.capabilities.batteryCapacity
                    )}</p>
                    <button 
                      className="reset-battery-btn"
                      onClick={handleResetBattery}
                      disabled={selectedRobot.capabilities.batteryLevel >= selectedRobot.capabilities.batteryCapacity}
                    >
                      Reset Battery
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="robot-views">
              <div className="view-container">
                <h3>First Person View</h3>
                <div
                  className="first-person-view"
                  ref={firstPersonViewRefCallback} // Use callback ref
                >
                  {/* The 3D renderer will be attached here */}
                  <div className="view-label">
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
                  ref={radarViewRefCallback} // Use callback ref
                >
                  {/* The 3D renderer will be attached here */}
                  <div className="view-label">
                    Overhead view - {selectedRobot.coordinates ? 
                      `Pos: ${selectedRobot.coordinates.x.toFixed(0)}, ${selectedRobot.coordinates.z.toFixed(0)}` : 
                      'N/A'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="control-panel">
              <div className="behavior-controls">
                <h3>Robot Control</h3>
                <div className="behavior-buttons">
                  <button 
                    className={`behavior-button ${selectedRobot.behaviorGoal === 'random' ? 'active' : ''}`}
                    onClick={() => handleBehaviorSelect('random')}
                  >
                    Random
                  </button>
                  <button 
                    className={`behavior-button ${selectedRobot.behaviorGoal === 'patrol' ? 'active' : ''}`}
                    onClick={() => handleBehaviorSelect('patrol')}
                  >
                    Patrol
                  </button>
                  <button 
                    className={`behavior-button ${selectedRobot.behaviorGoal === 'findRocks' ? 'active' : ''}`}
                    onClick={() => handleBehaviorSelect('findRocks')}
                  >
                    Find Rocks
                  </button>
                  <button 
                    className={`behavior-button ${selectedRobot.behaviorGoal === 'standby' ? 'active' : ''}`}
                    onClick={() => handleBehaviorSelect('standby')}
                  >
                    Stop
                  </button>
                </div>
                
                <div className="capability-controls">
                  <div className="speed-control">
                    <label htmlFor="speed-input">Speed (m/s):</label>
                    <input
                      id="speed-input"
                      type="number"
                      min="0.1"
                      max="10.0"  // Updated max
                      step="0.1"
                      value={speedInput}
                      onChange={(e) => setSpeedInput(e.target.value)}
                      className="capacity-input"
                    />
                    <button 
                      className="apply-capacity"
                      onClick={handleSpeedUpdate}
                      disabled={!speedInput}
                    >
                      Apply
                    </button>
                  </div>
                  
                  <div className="capacity-control">
                    <label htmlFor="sensor-range-input">Sensor Range (m):</label>
                    <input
                      id="sensor-range-input"
                      type="number"
                      min="10"
                      max="500" // Range already correct
                      step="10"
                      value={sensorRangeInput}
                      onChange={(e) => setSensorRangeInput(e.target.value)}
                      className="capacity-input"
                    />
                    <button 
                      className="apply-capacity"
                      onClick={handleSensorRangeUpdate}
                      disabled={!sensorRangeInput}
                    >
                      Apply
                    </button>
                  </div>
                  
                  <div className="capacity-control">
                    <label htmlFor="turn-rate-input">Turn Rate (rad/s):</label>
                    <input
                      id="turn-rate-input"
                      type="number"
                      min="0.01"
                      max="1.0" // Updated max
                      step="0.01"
                      value={turnRateInput}
                      onChange={(e) => setTurnRateInput(e.target.value)}
                      className="capacity-input"
                    />
                    <button 
                      className="apply-capacity"
                      onClick={handleTurnRateUpdate}
                      disabled={!turnRateInput}
                    >
                      Apply
                    </button>
                  </div>
                  
                  <div className="capacity-control">
                    <label htmlFor="battery-capacity-input">Battery (units):</label>
                    <input
                      id="battery-capacity-input"
                      type="number"
                      min="50"
                      max="500" // Range already correct
                      step="10"
                      value={batteryCapacityInput}
                      onChange={(e) => setBatteryCapacityInput(e.target.value)}
                      className="capacity-input"
                    />
                    <button 
                      className="apply-capacity"
                      onClick={handleBatteryCapacityUpdate}
                      disabled={!batteryCapacityInput}
                    >
                      Apply
                    </button>
                  </div>
                </div>
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
