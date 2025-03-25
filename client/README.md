# TARS-Comp361 Mars Rover Simulation Client

A real-time Mars Rover simulation web application built with React and Three.js. This application allows users to deploy, monitor, and control virtual rovers on a simulated Mars terrain.

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

## Application Overview

This application provides a realistic Mars terrain simulation where users can:

- Deploy multiple rovers by clicking on a 2D map
- View real-time positions and status of each rover
- See the terrain from a rover's first-person perspective
- Monitor the surrounding environment with a radar view
- Assign tasks to rovers

The application uses a hybrid approach that combines:
- A simplified 2D map interface for easy visualization and interaction
- A full 3D simulation running in the background for realistic physics and rendering

## Architecture

The application follows a hybrid architecture combining React for UI, Three.js for 3D rendering, and a centralized state management approach.

### Key Architectural Patterns

#### 1. Separation of UI and Simulation

The application separates the UI layer (React) from the simulation layer (Three.js):

- The 3D simulation runs in a hidden container (`TerrainManager`)
- Only the final rendered views (first-person, radar) are shown in the UI
- This separation improves performance and allows each technology to focus on its strengths

#### 2. Centralized State Management

The application uses a Context API + Reducer pattern with Immer for immutable state updates:

- `RobotContext` provides a centralized store for all robot-related data
- Immer allows intuitive state updates while maintaining immutability
- Components access state through a custom `useRobots` hook
- All action creators are memoized with `useCallback` for optimal performance
- Computed values like `selectedRobot` are derived from the state

#### 3. Communication Bridge Pattern

The `BridgeService` acts as a mediator between the React world and Three.js world:

- Allows React components to send commands to the 3D world
- Notifies React about changes in the 3D world (robot movements, etc.)
- Provides a migration path from event-based to context-based architecture
- Implements a subscription mechanism for components to listen for specific events
- Maintains backward compatibility with the legacy event-based system

### Component Hierarchy and Communication Flow

```
React UI Components
        ↑↓
   RobotContext
        ↑↓
   BridgeService
        ↑↓
TerrainManager (Singleton)
        ↓
   TerrainExplorer
    ↙️   ↓    ↘️    ↘️
CameraCtrl  InputHandler  RobotMgr  TerrainObjs
                           ↙️  ↘️
                RobotBehaviors  RobotMovement
                            ↓
                        RobotViewMgr
```

Data flows through the system as follows:

```
┌──────────────┐     ┌───────────────┐     ┌─────────────────┐
│              │     │               │     │                 │
│    React     │◄────┤ RobotContext  │◄────┤  BridgeService  │◄───┐
│  Components  │     │ (State Store) │     │(Communication)  │    │
│              │     │               │     │                 │    │
└──────┬───────┘     └───────┬───────┘     └────────▲────────┘    │
       │                     │                      │              │
       │                     │                      │              │
       │ User Input          │ Subscribe            │ Notify       │ Update
       │ (e.g. Click)        │ (Data access)        │ (Events)     │ (State changes)
       │                     │                      │              │
       ▼                     ▼                      │              │
┌──────────────┐     ┌───────────────┐             │              │
│              │     │               │             │              │
│   Actions    │────►│   Reducers    │────────────►│              │
│              │     │  (with Immer) │             │              │
│              │     │               │             │              │
└──────────────┘     └───────────────┘             │              │
                                                   │              │
                                                   │              │
                           ┌───────────────────────┴──────┐       │
                           │                              │       │
                           │     3D World (Three.js)      │───────┘
                           │                              │
                           └──────────────────────────────┘
```

## Project Structure

```
client/
├── public/               # Static assets (textures, heightmaps)
├── src/                  # Source code
│   ├── assets/           # Application assets
│   ├── components/       # React components
│   │   ├── MapView.jsx   # 2D map visualization
│   │   └── TerrainComponent.jsx # Terrain wrapper
│   ├── context/          # State management
│   │   ├── RobotContext.jsx # Central state store
│   │   ├── BridgeService.js # Communication bridge
│   │   └── MigrationUtil.js # Migration utilities
│   ├── pages/            # Page components
│   │   ├── HomePage.jsx  # Welcome page 
│   │   ├── InfoPage.jsx  # Documentation page
│   │   └── MarsRoverPage.jsx # Main simulation page
│   ├── styles/           # CSS files
│   └── utils/            # Three.js utility classes
│       ├── TerrainManager.js # Hidden 3D renderer manager
│       ├── TerrainExplorer.js # Core simulation class
│       ├── RobotManager.js # Robot creation and control
│       ├── RobotBehaviors.js # Robot behaviors implementation
│       ├── RobotMovement.js # Robot movement and physics
│       ├── RobotViewManager.js # Robot camera views
│       ├── InputHandler.js # User input processing
│       └── CameraController.js # Camera management
├── node_modules/         # NPM packages
└── configuration files   # Various config files
```

## Core Components and Dependencies

### React Components

- **MapView.jsx**: A 2D top-down view of the Mars terrain where users can add and select rovers
- **MarsRoverPage.jsx**: The main simulation interface containing map, details panel, and robot views

### 3D World Classes

```
                    ┌─────────────────┐
                    │ TerrainManager  │   (Singleton)
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ TerrainRenderer │
                    └───┬───┬───┬─────┘
                        │   │   │
            ┌───────────┘   │   └───────────┐
            ▼               ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────────┐
│  RobotManager   │ │CameraCtrl   │ │TerrainObjectManager │
└────────┬────────┘ └─────────────┘ └─────────────────────┘
         │
      ┌──┴───┐
      │      │
      ▼      ▼
┌────────┐ ┌────────┐
│Behaviors│ │Movement│
└────┬────┘ └───┬────┘
     │          │
     └────┬─────┘
          ▼
┌─────────────────┐
│ RobotViewManager│
└─────────────────┘
```

Key classes include:

- **TerrainManager**: Singleton that initializes the hidden 3D renderer
- **TerrainExplorer**: Core simulation class that handles terrain generation and rendering
- **RobotManager**: Manages robot creation, selection and core functionality
- **RobotBehaviors**: Implements different robot behaviors (patrol, search, etc.)
- **RobotMovement**: Handles robot movement physics and smooth transitions
- **RobotViewManager**: Handles robot camera views (first-person and radar)
- **CameraController**: Manages camera movement and controls
- **TerrainObjectManager**: Manages terrain features like rocks, dust and other objects
- **InputHandler**: Processes user input for camera and robot control

### State Management

- **RobotContext.jsx**: Central state store using React Context and useReducer with Immer
- **BridgeService.js**: Communication bridge between the React world and Three.js world


## Key Features

### Dynamic Robot Deployment

Users can add robots to the terrain by clicking on the 2D map. The application:
- Calculates the correct terrain height at the clicked position
- Creates a 3D robot model at that position
- Updates the UI to reflect the new robot

### Multiple Perspective Views

The application provides three different views of the terrain:
1. **2D Map View**: Top-down visualization of the entire terrain
2. **First-Person View**: Camera view from the selected robot's perspective
3. **Radar View**: Overhead view of the area surrounding the selected robot

### Terrain Physics

The terrain includes:
- Realistic height variations based on a heightmap
- Proper collision detection for robots
- Automatic height adaptation as robots move

### Task Assignment

Users can assign textual tasks to robots, which are:
- Stored in the robot's state
- Displayed in the UI
- Persisted as the robot moves around the terrain

### Modular Robot Behaviors

The application implements various robot behaviors in a modular way:
- Random movement with smooth transitions
- Patrol patterns along predefined paths
- Object search capabilities
- Point-to-point navigation
- Path following

## Best Practices

1. **Use the Context API**: Access state through the `useRobots()` hook
2. **Follow the Bridge Pattern**: For 3D world communication, use BridgeService
3. **Maintain Immutability**: Let Immer handle state updates
4. **Component Composition**: Break large components into smaller, focused ones
5. **Modular Architecture**: Separate concerns into focused classes (behaviors, movement, etc.)
