# Step Rendering Configuration System

## Overview

The Workflow Designer now supports a flexible, extensible rendering configuration system that allows step definitions to specify exactly how they should be visually rendered across different rendering backends (WebGL, SVG, Canvas).

## Architecture

### Core Components

1. **Rendering Types** (`types/rendering.ts`)
   - Defines all rendering configuration interfaces
   - Supports multiple renderer types
   - Extensible for custom renderers

2. **Rendering Utilities** (`utils/renderingUtils.ts`)
   - Helper functions to extract rendering configurations
   - Provides sensible defaults and fallbacks
   - Handles configuration merging

3. **Circuit Theme Integration** (`utils/circuitThemeIntegration.ts`)
   - Integrates new system with existing Circuit theme
   - Backward compatible with legacy mappings
   - Factory functions for renderer creation

## Configuration Structure

### StepRenderConfig

Each step definition can include an optional `rendering` property:

```typescript
interface StepDefinition {
  // ... standard properties
  rendering?: StepRenderConfig;
}

interface StepRenderConfig {
  default?: RendererConfig;
  webgl?: WebGLRenderConfig;
  svg?: SVGRenderConfig;
  canvas?: CanvasRenderConfig;
  custom?: Record<string, unknown>;
}
```

### WebGL Renderer Configuration

For WebGL rendering (our primary renderer):

```typescript
interface WebGLRenderConfig {
  type: 'webgl';
  theme?: 'circuit' | 'default' | 'minimal';
  circuit?: CircuitRenderConfig;
  geometry?: GeometryConfig;
  material?: MaterialConfig;
  animation?: AnimationConfig;
}
```

#### Circuit Theme Configuration

The circuit theme renders steps as electronic components:

```typescript
interface CircuitRenderConfig {
  elementType?: 'pushButton' | 'led' | 'icChip' | 'transistor' | 'capacitor' | 'resistor' | 'generic';
  labelPrefix?: string;
  dimensions?: {
    width?: number;
    height?: number;
    pinRadius?: number;
    pinSpacing?: number;
  };
  colors?: {
    body?: number;
    bodyHover?: number;
    bodySelected?: number;
    pins?: number;
    pinsConnected?: number;
    glow?: number;
  };
  features?: {
    hasGlow?: boolean;
    hasNotch?: boolean;
    hasPressEffect?: boolean;
    pinCount?: number;
  };
}
```

#### Generic Geometry Configuration

For custom 3D shapes:

```typescript
interface GeometryConfig {
  shape?: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'custom';
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  segments?: number;
  vertices?: number[];
  indices?: number[];
  uvs?: number[];
  normals?: number[];
  scale?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  offset?: { x: number; y: number; z: number };
}
```

#### Material Configuration

Control appearance and shading:

```typescript
interface MaterialConfig {
  type?: 'basic' | 'standard' | 'phong' | 'lambert' | 'physical' | 'shader';
  color?: number | string;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transparent?: boolean;
  map?: string;  // Texture URL
  shader?: ShaderConfig;
}
```

#### Animation Configuration

Define animations for different states:

```typescript
interface AnimationConfig {
  hover?: {
    scale?: number;
    color?: number;
    duration?: number;
  };
  selected?: {
    scale?: number;
    color?: number;
    glow?: boolean;
    duration?: number;
  };
  executing?: {
    pulse?: boolean;
    rotate?: boolean;
    color?: number;
    duration?: number;
  };
  idle?: {
    bob?: boolean;
    rotate?: boolean;
    pulse?: boolean;
    speed?: number;
  };
}
```

## Example Configurations

### Start Button (Push Button)

```typescript
{
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'pushButton',
        labelPrefix: 'S',
        dimensions: {
          width: 40,
          height: 40
        },
        colors: {
          body: 0x1a1a1a,
          bodySelected: 0x1565c0
        },
        features: {
          hasPressEffect: true
        }
      },
      animation: {
        hover: {
          scale: 1.05,
          duration: 200
        }
      }
    }
  }
}
```

### End Indicator (LED)

```typescript
{
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'led',
        labelPrefix: 'LED',
        dimensions: {
          width: 30,
          height: 30
        },
        colors: {
          body: 0x330000,
          bodySelected: 0xff0000,
          glow: 0xff6666
        },
        features: {
          hasGlow: true
        }
      },
      animation: {
        executing: {
          pulse: true,
          color: 0xff0000,
          duration: 1000
        }
      }
    }
  }
}
```

### API Integration Step (IC Chip)

```typescript
{
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'API',
        dimensions: {
          width: 120,
          height: 80
        },
        colors: {
          body: 0x1a1a1a,
          bodySelected: 0xe535ab  // GraphQL pink
        },
        features: {
          hasNotch: true,
          pinCount: 8
        }
      }
    }
  }
}
```

### Custom 3D Geometry

```typescript
{
  rendering: {
    webgl: {
      type: 'webgl',
      geometry: {
        shape: 'torus',
        radius: 30,
        segments: 32
      },
      material: {
        type: 'physical',
        color: 0x2196f3,
        metalness: 0.7,
        roughness: 0.3
      },
      animation: {
        idle: {
          rotate: true,
          speed: 1
        }
      }
    }
  }
}
```

### Custom Shader

```typescript
{
  rendering: {
    webgl: {
      type: 'webgl',
      material: {
        type: 'shader',
        shader: {
          uniforms: {
            time: { type: 'float', value: 0 },
            color: { type: 'vec3', value: [0.376, 0.490, 0.545] }
          }
        }
      }
    }
  }
}
```

## Usage in Renderers

### Extracting Configuration

```typescript
import { 
  getRenderConfig, 
  getCircuitRenderConfig,
  getStepElementType 
} from '../utils/renderingUtils';

// Get WebGL config
const webglConfig = getRenderConfig(stepDefinition, 'webgl');

// Get circuit-specific config
const circuitConfig = getCircuitRenderConfig(stepDefinition);

// Get element type with fallbacks
const elementType = getStepElementType(stepDefinition);
```

### Using the Circuit Theme Integration

```typescript
import { 
  getEnhancedCircuitElement,
  createStepRenderer 
} from '../utils/circuitThemeIntegration';

// Get complete rendering configuration
const renderConfig = getEnhancedCircuitElement(stepDefinition, index);

// Create a renderer with helper methods
const renderer = createStepRenderer(stepDefinition, index);

// Use helper methods
const bodyColor = renderer.getBodyColor('hover');
const pinColor = renderer.getPinColor(true);
const shouldGlow = renderer.shouldRenderGlow(isActive);
```

## Adding New Renderer Backends

To add support for a new renderer:

1. Define the renderer configuration interface in `types/rendering.ts`
2. Add the renderer to the `StepRenderConfig` type
3. Create utility functions in a new file (e.g., `utils/svgRenderingUtils.ts`)
4. Update step definitions with the new configuration

Example for a hypothetical Canvas renderer:

```typescript
// 1. Define interface
interface CanvasRenderConfig extends RendererConfig {
  type: 'canvas';
  drawFunction?: string;
  fillStyle?: string;
  paths?: Array<{ type: string; params: number[] }>;
}

// 2. Add to StepRenderConfig
interface StepRenderConfig {
  // ... existing
  canvas?: CanvasRenderConfig;
}

// 3. Create utilities
export function getCanvasDrawConfig(step: StepDefinition) {
  return step.rendering?.canvas;
}

// 4. Use in step definitions
{
  rendering: {
    canvas: {
      type: 'canvas',
      fillStyle: '#2196f3',
      paths: [
        { type: 'rect', params: [0, 0, 100, 80] }
      ]
    }
  }
}
```

## Benefits

1. **Flexibility** - Steps can define their own visual appearance
2. **Type Safety** - Full TypeScript support with autocomplete
3. **Fallbacks** - Sensible defaults if no config provided
4. **Multiple Renderers** - Same step can have different appearances in different renderers
5. **Backward Compatible** - Existing code continues to work
6. **Extensible** - Easy to add new renderer types
7. **Performance** - Configuration is processed once, not per-frame

## Migration Guide

### For Existing Steps

Existing steps without rendering configuration will continue to work using the legacy mapping system. To take advantage of the new system:

1. Add a `rendering` property to your step definition
2. Configure the `webgl.circuit` settings for Circuit theme
3. Optionally add animations and custom materials
4. Test the appearance in the workflow designer

### For New Steps

When creating new steps, always include a rendering configuration:

```typescript
export const MyStepDefinition: StepDefinition = {
  // ... standard properties
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'MY',
        // ... other circuit config
      }
    }
  }
};
```

## Future Enhancements

Potential future additions:

- **Runtime Themes** - Switch themes without reloading
- **Animation Presets** - Library of common animation patterns
- **Visual Editor** - GUI for configuring rendering properties
- **Performance Profiles** - Different LOD levels for performance
- **Custom Renderer Plugins** - Load custom renderers dynamically
- **State-based Rendering** - Different appearances for different workflow states
