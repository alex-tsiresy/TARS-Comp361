# TARS-Comp361 Client Codebase Summary

This document provides an overview of the codebase structure and the purpose of each file in the TARS-Comp361 client application. This is a Mars Rover simulation web application built with React and Three.js.

## Project Structure

```
client/
├── public/               # Static assets
├── src/                  # Source code
│   ├── assets/           # Application assets
│   ├── components/       # React components
│   ├── pages/            # Page components 
│   ├── styles/           # CSS files
│   └── utils/            # Utility files for 3D rendering and robot management
├── node_modules/         # NPM packages
└── configuration files   # Various config files
```

## Configuration Files

- **package.json**: Defines project dependencies and scripts. Uses React, React Router Dom, and Three.js for 3D rendering.
- **vite.config.js**: Configuration for the Vite build tool.
- **index.html**: Main HTML entry point for the application.
- **eslint.config.js**: ESLint configuration for code linting.
- **.gitignore**: Specifies files to be ignored by Git.
- **README.md**: Project documentation.

## Source Files

### Main Entry Points

- **src/main.jsx**: The application entry point that renders the main App component into the DOM.
- **src/App.jsx**: Defines the main application routing using React Router, with routes for HomePage, ControlPage, InfoPage, and MarsRoverPage components.
- **src/index.css**: Global CSS styles for the application.

### Pages

- **src/pages/HomePage.jsx**: A simple welcome page with links to other sections of the application.
- **src/pages/ControlPage.jsx**: A minimal page for controlling rover/simulation parameters.
- **src/pages/InfoPage.jsx**: Information page containing project instructions or documentation.
- **src/pages/MarsRoverPage.jsx**: The main simulation interface that includes:
  - A 2D map view for visualizing robot positions on the Mars surface
  - Details panel showing information about selected robots
  - First-person view from the robot's perspective
  - Radar view showing the surrounding area
  - Task control for assigning tasks to robots
- **src/pages/PlayPage.jsx**: An alternative page for interacting with the Mars rover simulation.

### Components

- **src/components/MapView.jsx**: A component that renders a 2D map representation of the Mars terrain with robots shown as markers. Users can click on the map to add robots or select existing ones.
- **src/components/TerrainComponent.jsx**: A wrapper component for the terrain functionality.

### Utility Classes

- **src/utils/TerrainManager.js**: A singleton manager that creates and maintains a hidden 3D terrain renderer for background processing. It handles:
  - Initializing the terrain renderer in a hidden container
  - Responding to robot addition requests
  - Coordinating between the 2D map view and 3D terrain simulation

- **src/utils/TerrainExplorer.js**: Core terrain exploration class that handles:
  - Scene and renderer initialization
  - Terrain generation and heightmap processing
  - Main animation loop coordination
  - Delegation to specialized manager classes

- **src/utils/InputHandler.js**: Handles all user input for navigating the terrain:
  - Keyboard controls for WASD/arrow key movement
  - Mouse controls for camera rotation via pointer lock
  - Movement vector calculation
  - Input state management

- **src/utils/CameraController.js**: Manages camera positioning and controls:
  - Orbit controls setup and configuration
  - Camera zooming and positioning
  - View resetting
  - Viewport resizing

- **src/utils/RobotManager.js**: Manages robots in the 3D environment:
  - Robot creation and rendering
  - Robot selection and highlighting
  - Robot movement and task management
  - Camera views from robot perspective
  - Robot state tracking and updates

- **src/utils/RobotViewManager.js**: Handles robot-specific views:
  - First-person view renderer setup and management
  - Radar view renderer setup and management
  - View-specific lighting
  - Rendering both views from robot perspective

- **src/utils/TerrainObjectManager.js**: Manages objects placed on the terrain:
  - Adding ambient objects (rocks, platforms)
  - Creating directional markers and beacons
  - Managing grid helpers
  - Tracking and disposing of scene objects

### Styles

- **src/styles/MarsRoverPage.css**: Styling for the main Mars Rover simulation page.
- **src/styles/MapView.css**: Styling for the 2D map view including robot markers.
- **src/styles/TerrainView.css**: Styling for the 3D terrain view component.
- **src/styles/MarsRoverUI.css**: Styling for UI elements in the Mars Rover interface.
- **src/styles/HomePage.css**: Styling for the home page.
- **src/styles/index.css**: Additional global styles.

### Assets

- **src/assets/react.svg**: React logo.
- **src/image.png**: Unknown image, possibly a screenshot or texture.

### Public Assets

- **public/rock01.jpg** and **public/rock02.jpg**: Rock textures used for terrain rendering.
- **public/out.png**: Height map for terrain generation and map background.
- **public/globe.png**: Possibly an image of Mars or Earth.

## Dependency Relationships

### Component Hierarchy

1. **Application Level**
   - **App.jsx** (Root component)
     - **MarsRoverPage.jsx** (Main simulation page)
       - **MapView.jsx** (2D interactive map)
       - First-person view container
       - Radar view container
       - Robot control panel

2. **Utility Class Dependencies**
   - **TerrainManager** (Singleton)
     - **TerrainRenderer** (Core renderer)
       - **TerrainExplorer** (Main simulation class)
         - **CameraController** (Camera management)
         - **InputHandler** (User input processing)
         - **RobotManager** (Robot management)
         - **RobotViewManager** (Robot views)

3. **Three.js Integration**
   - All utility classes depend on Three.js
   - The React UI interacts with the Three.js world through custom event dispatchers

### Dependency Flow

```
React UI Components
        ↑↓
Custom Event System
        ↑↓
TerrainManager (Singleton)
        ↓
   TerrainExplorer
    ↙️   ↓    ↘️    ↘️
CameraCtrl  InputHandler  RobotMgr  TerrainObjs
                            ↓
                        RobotViewMgr
```

## State Management

The application uses a hybrid approach to state management:

### 1. React Component State

- **Local Component State**: Each React component maintains its own state using React's `useState` hook for UI-specific information.
  - `MapView` uses state for tracked robots and selected robot IDs
  - `MarsRoverPage` uses state for the currently selected robot and task input

- **Refs**: React refs (`useRef`) are used to maintain references to DOM elements that need to be accessed by Three.js:
  - First-person view container
  - Radar view container

### 2. Specialized Manager Classes

- **Object-Oriented State**: The utility classes maintain their own internal state:
  - `RobotManager` tracks all robot instances, positions, and properties
  - `TerrainRenderer` maintains the 3D scene graph and rendering state
  - Other managers maintain state specific to their domain

### 3. Custom Event System

The application uses a custom event system built on the browser's native `CustomEvent` API for cross-component communication:

- **Custom Events**:
  - `rendererInitialized`: Signals that the TerrainRenderer is ready
  - `addRobotRequest`: Requests the creation of a new robot at a position
  - `robotAdded`: Notifies that a new robot has been added
  - `robotSelected`: Signals that a robot has been selected
  - `robotUpdated`: Notifies about robot position/property updates

### Data Flow Patterns

1. **UI to 3D Simulation**:
   - User interacts with MapView component
   - Component dispatches custom events (`addRobotRequest`, etc.)
   - TerrainManager listens for these events and updates the 3D world
   - RobotManager creates/updates robots in response

2. **3D Simulation to UI**:
   - RobotManager updates robot positions/properties
   - RobotManager dispatches events (`robotUpdated`, `robotSelected`)
   - React components listen for these events and update their state
   - UI rerenders to reflect the new state

3. **Event Throttling**:
   - Updates from the 3D world are throttled to prevent overwhelming the UI
   - Position updates are sent at most every 100ms per robot

## Robot Creation and Selection Flow

The application implements an automatic robot selection system when new robots are created. Here's how the complete flow works:

### 1. User Interaction (MapView Component)
- When a user clicks on the map, the `handleMapClick` function captures the click coordinates
- It converts screen coordinates to terrain coordinates (transforming from 2D screen space to 3D world space)
- It dispatches an `addRobotRequest` custom event with the position information

### 2. Terrain Management (TerrainManager)
- TerrainManager is a singleton that manages the hidden 3D terrain simulation
- It listens for the `addRobotRequest` event through the `handleAddRobotRequest` method
- When received, it calls `this.renderer.addRobotAtPosition(position.x, position.z)` 
- It captures the returned robot data and dispatches a synthetic `robotSelected` event
- This ensures proper UI updates with the newly created and selected robot

### 3. 3D Rendering (TerrainRenderer)
- The `addRobotAtPosition` method determines the correct height for the robot based on terrain
- It calculates the y-coordinate so the robot is positioned above the terrain surface
- It calls `this.robotManager.addRobot({x, y, z})` to create the actual robot object

### 4. Robot Management (RobotManager)
- The `addRobot` method creates the 3D robot model (sphere)
- It adds the robot mesh to the scene and stores the robot's properties
- It automatically selects the new robot by calling `this.selectRobot(id)`
- The `selectRobot` method:
  - Deselects any previously selected robot by changing its material color
  - Changes the new robot's material to the selected color (green)
  - Positions the robot camera for first-person view
  - Dispatches a `robotSelected` event with the robot data

### 5. UI Updates (MarsRoverPage)
- The MarsRoverPage component listens for the `robotSelected` event  
- When received, it updates state with `setSelectedRobot(robot)`
- This triggers UI updates showing the robot details, first-person view, and radar view
- The component also ensures the 3D renderers for first-person and radar views are correctly set up

## Performance Optimization

The application employs several strategies to maintain performance:

1. **Hidden 3D Simulation**: The 3D scene runs in a hidden container, with only the final views rendered to the visible UI
2. **Event Throttling**: Robot updates are throttled to prevent UI rendering overhead
3. **Selective Rendering**: Views are only rendered when actually needed
4. **Deep Copy Management**: Object references are managed carefully with deep copies to prevent unnecessary React re-renders
5. **Specialized Manager Classes**: Each aspect of the simulation is handled by specialized classes for better performance isolation

## Key Features

### 2D Map View with 3D Simulation

The application uses a hybrid approach combining:
1. A simplified 2D map interface for easy visualization and interaction
2. A fully-featured 3D simulation running in the background

This approach offers:
- Better performance and simpler user interface via the 2D map
- Realistic terrain interaction via the 3D physics simulation
- Full 3D views (first-person and radar) when robots are selected

### Robot Simulation and Control

The application allows users to:
1. Add robot rovers to the Mars terrain by clicking on the map
2. Control and monitor these rovers
3. View the terrain from multiple perspectives (map view, first-person, radar)
4. Assign tasks to the rovers

### Real-time Robot Updates

Robots move autonomously across the terrain with:
- Realistic terrain height adaptation
- Random movement patterns
- Real-time position updates reflected on the 2D map
- First-person and radar views that update as robots move
