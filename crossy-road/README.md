# Blocky Road - Clean Three.js Test Scene

## Overview
This is a minimal, focused implementation of a Crossy Road-style game using Three.js. The scene contains a fixed test level with 15 terrain rows to verify the camera angle, scale, and 3D rendering before adding procedural generation and additional features.

## Scene Contents

### Terrain (15 Fixed Rows)
- **Dimensions**: 18 tiles wide × 1 tile deep × 0.6 thick per row
- **Types**: 
  - Grass rows (indices 0-3, 5-9, 11-14): Bright green (#4CAF50) with dark green sides
  - Road rows (indices 4, 10): Dark gray (#333333) with black sides
- **Layout**: Rows positioned sequentially with no gaps between them
- **Depth faces**: Front and back side faces visible for 3D depth perception

### Chicken (Player Character)
- **Scale**: 0.35 units (approximately one tile size)
- **Position**: Centered at (0, 0, 0)
- **Components**:
  - White/cream body (main)
  - White/cream head
  - Yellow beak
  - Red comb (on top of head)
  - Two light-colored wings
  - Two orange legs
  - Two black eyes
- **Animation**: Hops upward with arc when moving
- **Hit Effect**: Turns red and wobbles when struck by vehicle

### Vehicles (3 Test Cars)
- **Count**: 3 cars placed on road rows
- **Composition** (per car):
  - Rectangular body (lower chassis)
  - Raised cabin (upper section)
  - Two side windows (sky blue, reflective)
  - Four wheels (dark gray, positioned at corners)
- **Total Height**: ~0.9 units (visibly 3D)
- **Animation**: Move left and right across the road

### Camera
- **Type**: Orthographic (true 2.5D isometric perspective)
- **Position**: (0, 9, 9) - diagonal behind and above the player
- **Target**: (0, 0, 0) - player area
- **View Size**: 18 units wide × 14 units tall
- **Angle**: ~45° forward tilt (classic Crossy Road perspective)

### Lighting
- **Hemisphere Light**: 0.8 intensity for base illumination
- **Directional Light**: 1.0 intensity from (10, 20, 10)
  - Creates shadows on all geometry
  - Top faces bright, side faces darker
  - Simulates natural sunlight

## Controls
- **W / ↑**: Move forward (away from camera)
- **S / ↓**: Move backward (toward camera)
- **A / ←**: Move left
- **D / →**: Move right
- **Space**: Restart game (when game over)

## Mechanics
- **Movement**: One tile per keypress, smooth hopping animation
- **Collision**: Game over if chicken touches a vehicle
- **Score**: Tracks distance traveled forward
- **Restart**: Space key resets level

## Technical Details
- **Framework**: Three.js (loaded from CDN)
- **Renderer**: Single WebGLRenderer, full screen
- **Geometry**: All objects use BoxGeometry for chunky voxel style
- **Materials**: MeshStandardMaterial with shadow support
- **No Dependencies**: Pure HTML/CSS/JavaScript, no build tools

## Performance Notes
- Minimal draw calls (15 terrain rows + 3 cars + 1 chicken)
- Shadows enabled for depth perception
- Designed for quick verification of visual setup

## Next Steps
Once visual verification is complete:
1. Restore procedural terrain generation
2. Add traffic lanes with multiple vehicles
3. Implement endless forward scrolling
4. Add scoring and difficulty progression
5. Add trees, rivers, and obstacles
