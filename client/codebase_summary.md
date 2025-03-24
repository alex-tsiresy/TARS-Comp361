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
  - A terrain view for visualizing the Mars surface
  - Controls for adding robots and zooming
  - Details panel showing information about selected robots
  - First-person view from the robot's perspective
  - Radar view showing the surrounding area
  - Task control for assigning tasks to robots
- **src/pages/PlayPage.jsx**: An alternative page for interacting with the Mars rover simulation.

### Components

- **src/components/TerrainView.jsx**: A component that renders the 3D terrain view and provides controls for zooming and adding robots. It initializes and manages the TerrainRenderer instance.
- **src/components/TerrainComponent.jsx**: A wrapper component for the terrain functionality.

### Utility Classes

- **src/utils/TerrainRenderer.js**: Core 3D rendering class built with Three.js that handles:
  - Scene, camera, and renderer setup
  - Terrain generation and visualization
  - Integration with RobotManager
  - Multiple view perspectives (birds-eye, first-person, radar)
  - User input processing
  - Zoom functionality

- **src/utils/RobotManager.js**: Manages robots in the 3D environment:
  - Robot creation and rendering
  - Robot selection and highlighting
  - Robot movement and task management
  - Camera views from robot perspective
  - Robot state tracking and updates

- **src/utils/TerrainExplorer.js**: Additional terrain functionality for exploration purposes.

### Styles

- **src/styles/MarsRoverPage.css**: Styling for the main Mars Rover simulation page.
- **src/styles/TerrainView.css**: Styling for the terrain view component.
- **src/styles/MarsRoverUI.css**: Styling for UI elements in the Mars Rover interface.
- **src/styles/HomePage.css**: Styling for the home page.
- **src/styles/index.css**: Additional global styles.

### Assets

- **src/assets/react.svg**: React logo.
- **src/image.png**: Unknown image, possibly a screenshot or texture.

### Public Assets

- **public/rock01.jpg** and **public/rock02.jpg**: Rock textures used for terrain rendering.
- **public/out.png**: Unknown image.
- **public/globe.png**: Possibly an image of Mars or Earth.

## Summary

This codebase implements a Mars Rover simulation web application that allows users to:

1. Add robot rovers to a 3D Mars terrain
2. Control and monitor these rovers
3. View the terrain from different perspectives (birds-eye, first-person, radar)
4. Assign tasks to the rovers

The application uses React for the UI components and Three.js for 3D rendering and terrain simulation. The main functionality is implemented in the TerrainRenderer and RobotManager classes, which handle the 3D environment, robot behavior, and user interaction.

The interface is divided into a terrain view panel on the left and information/control panels on the right, providing users with details about selected robots and their environment. The application demonstrates a clean separation of concerns with UI components in the components directory and core functionality in the utils directory. 