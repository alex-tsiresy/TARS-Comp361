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

- **src/components/MapView.jsx**: A component that renders a 2D map representation of the Mars terrain with robots shown as markers with direction indicators. Users can click on the map to add robots or select existing ones.
- **src/components/TerrainComponent.jsx**: A wrapper component for the terrain functionality.

### Utility Classes

- **src/utils/TerrainManager.js**: A singleton manager that creates and maintains a hidden 3D terrain renderer for background processing. It handles:
  - Initializing the terrain renderer in a hidden container
  - Responding to robot addition requests
  - Coordinating between the 2D map view and 3D terrain simulation

- **src/utils/TerrainRenderer.js**: Core 3D rendering class built with Three.js that handles:
  - Scene, camera, and renderer setup
  - Terrain generation and visualization
  - Integration with RobotManager
  - Multiple view perspectives (birds-eye, first-person, radar)
  - User input processing
  - Zoom functionality
  - Rendering robot first-person and radar views

- **src/utils/RobotManager.js**: Manages robots in the 3D environment:
  - Robot creation and rendering
  - Robot selection and highlighting
  - Robot movement and task management
  - Camera views from robot perspective
  - Robot state tracking and updates
  - Visual helpers for first-person and radar views

- **src/utils/TerrainExplorer.js**: Additional terrain functionality for exploration purposes.

### Styles

- **src/styles/MarsRoverPage.css**: Styling for the main Mars Rover simulation page.
- **src/styles/MapView.css**: Styling for the 2D map view including robot markers and direction indicators.
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
- Direction indicators showing robot orientation
- First-person and radar views that update as robots move

## Summary

This codebase implements a Mars Rover simulation web application with a user-friendly interface. It uses React for the UI components and Three.js for 3D rendering and terrain simulation. The application demonstrates a clean separation of concerns with UI components in the components/pages directories and core functionality in the utils directory.

The recent enhancements include:
1. Converting the primary interface from a 3D view to a 2D map for better usability
2. Running the 3D terrain simulation in the background for physics and robot movement
3. Adding visual indicators for robot direction and movement
4. Enhancing the first-person and radar views with better visibility and helpers
5. Optimizing performance with throttled updates and efficient rendering 