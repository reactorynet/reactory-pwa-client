# Step Rendering Configuration - Quick Reference

## Basic Structure

```typescript
export const MyStep: StepDefinition = {
  // ... standard properties
  rendering: {
    webgl: { /* WebGL config */ },
    svg: { /* SVG config */ },
    canvas: { /* Canvas config */ }
  }
};
```

## Circuit Theme (WebGL)

### Element Types
- `pushButton` - Buttons/Triggers
- `led` - Indicators/Outputs  
- `icChip` - Tasks/Actions/Integrations
- `transistor` - Conditions/Logic
- `capacitor` - Delays/Timers
- `resistor` - Transforms/Filters

### Minimal Configuration
```typescript
rendering: {
  webgl: {
    type: 'webgl',
    theme: 'circuit',
    circuit: {
      elementType: 'icChip',
      labelPrefix: 'U'
    }
  }
}
```

### Full Configuration
```typescript
rendering: {
  webgl: {
    type: 'webgl',
    theme: 'circuit',
    circuit: {
      elementType: 'icChip',
      labelPrefix: 'API',
      dimensions: {
        width: 120,
        height: 80,
        pinRadius: 4,
        pinSpacing: 10
      },
      colors: {
        body: 0x1a1a1a,
        bodyHover: 0x2a2a2a,
        bodySelected: 0x2196f3,
        pins: 0x808080,
        pinsConnected: 0xb87333,
        glow: 0xff6666
      },
      features: {
        hasGlow: false,
        hasNotch: true,
        hasPressEffect: false,
        pinCount: 8
      }
    },
    animation: {
      hover: {
        scale: 1.05,
        duration: 200
      },
      selected: {
        scale: 1.0,
        color: 0x2196f3,
        glow: true,
        duration: 300
      },
      executing: {
        pulse: true,
        rotate: false,
        color: 0x2196f3,
        duration: 800
      },
      idle: {
        bob: false,
        rotate: false,
        pulse: false,
        speed: 1
      }
    }
  }
}
```

## Common Patterns

### Start Button
```typescript
circuit: {
  elementType: 'pushButton',
  labelPrefix: 'S',
  dimensions: { width: 40, height: 40 },
  features: { hasPressEffect: true }
}
```

### End LED
```typescript
circuit: {
  elementType: 'led',
  labelPrefix: 'LED',
  dimensions: { width: 30, height: 30 },
  colors: { glow: 0xff0000 },
  features: { hasGlow: true }
},
animation: {
  executing: { pulse: true, duration: 1000 }
}
```

### API Integration
```typescript
circuit: {
  elementType: 'icChip',
  labelPrefix: 'API',
  dimensions: { width: 120, height: 80 },
  colors: { bodySelected: 0xe535ab },
  features: { hasNotch: true, pinCount: 8 }
}
```

### Condition/Decision
```typescript
circuit: {
  elementType: 'transistor',
  labelPrefix: 'Q',
  dimensions: { width: 50, height: 60 }
}
```

## Color Values (Hex)

```typescript
// Standard colors
0x1a1a1a  // Dark gray/black (body)
0x2a2a2a  // Lighter gray (hover)
0x1565c0  // Blue (selected)
0x808080  // Silver (pins)
0xb87333  // Copper (connected pins)

// Accent colors
0x4caf50  // Green (success/start)
0xf44336  // Red (end/error)
0xff9800  // Orange (warning)
0x2196f3  // Blue (info/task)
0x9c27b0  // Purple (flow)
0xe535ab  // Pink (GraphQL)
0x00bcd4  // Cyan (REST)
0x607d8b  // Blue-gray (telemetry)
```

## Usage in Code

### Extract Configuration
```typescript
import { getRenderConfig, getCircuitRenderConfig } from './utils/renderingUtils';

const webglConfig = getRenderConfig(step, 'webgl');
const circuitConfig = getCircuitRenderConfig(step);
```

### Use Circuit Integration
```typescript
import { createStepRenderer } from './utils/circuitThemeIntegration';

const renderer = createStepRenderer(stepDef, index);
const color = renderer.getBodyColor('hover');
const dims = renderer.getDimensions();
const shouldGlow = renderer.shouldRenderGlow(active);
```

## Fallback Behavior

If no rendering config is provided:
1. Uses `id` to determine element type
2. Applies default colors
3. Uses standard dimensions
4. No special features enabled

## Tips

1. **Always specify `elementType`** for consistent appearance
2. **Use `labelPrefix`** to match circuit conventions
3. **Set dimensions** based on content complexity
4. **Add animations** for better UX feedback
5. **Test colors** against circuit board background (#1a472a)
6. **Pin count** should match total ports (inputs + outputs)

## Common Mistakes

❌ Wrong:
```typescript
colors: {
  body: '#1a1a1a'  // String instead of number
}
```

✅ Correct:
```typescript
colors: {
  body: 0x1a1a1a  // Hex number
}
```

❌ Wrong:
```typescript
animation: {
  hover: { scale: '1.05' }  // String instead of number
}
```

✅ Correct:
```typescript
animation: {
  hover: { scale: 1.05 }  // Number
}
```

## Resources

- Full documentation: `RENDERING_SYSTEM.md`
- Implementation summary: `RENDERING_IMPLEMENTATION_SUMMARY.md`
- Code examples: `renderers/WebGLRenderer/RenderingSystemExample.ts`
- Type definitions: `types/rendering.ts`
- Utilities: `utils/renderingUtils.ts`
