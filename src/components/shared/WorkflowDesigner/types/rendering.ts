/**
 * Rendering configuration types for workflow steps
 * 
 * Provides a flexible system for defining how steps are visually rendered
 * across different rendering backends (WebGL, SVG, Canvas, etc.)
 */

/**
 * Base renderer configuration
 */
export interface RendererConfig {
  type: 'webgl' | 'svg' | 'canvas' | 'custom';
  theme?: string;
}

/**
 * WebGL-specific rendering configuration
 */
export interface WebGLRenderConfig extends RendererConfig {
  type: 'webgl';
  theme?: 'circuit' | 'default' | 'minimal';
  
  // Circuit theme configuration
  circuit?: CircuitRenderConfig;
  
  // Generic WebGL configuration
  geometry?: GeometryConfig;
  material?: MaterialConfig;
  animation?: AnimationConfig;
}

/**
 * Circuit board theme configuration
 */
export interface CircuitRenderConfig {
  // Component type (IC chip, LED, button, etc.)
  elementType?: 'pushButton' | 'led' | 'icChip' | 'transistor' | 'capacitor' | 'resistor' | 'generic';
  
  // Component label prefix (U1, LED2, S3, etc.)
  labelPrefix?: string;
  
  // Visual dimensions
  dimensions?: {
    width?: number;
    height?: number;
    pinRadius?: number;
    pinSpacing?: number;
  };
  
  // Colors (as hex numbers)
  colors?: {
    body?: number;
    bodyHover?: number;
    bodySelected?: number;
    pins?: number;
    pinsConnected?: number;
    glow?: number;
  };
  
  // Special component features
  features?: {
    hasGlow?: boolean;
    hasNotch?: boolean;
    hasPressEffect?: boolean;
    pinCount?: number;
  };
  
  // Custom mesh factory
  customMeshFactory?: string; // Function name or reference
}

/**
 * Generic geometry configuration for custom meshes
 */
export interface GeometryConfig {
  // Predefined shapes
  shape?: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'custom';
  
  // Shape parameters
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  segments?: number;
  
  // Custom vertices (for advanced shapes)
  vertices?: number[];
  indices?: number[];
  uvs?: number[];
  normals?: number[];
  
  // Geometry transformations
  scale?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  offset?: { x: number; y: number; z: number };
}

/**
 * Material configuration
 */
export interface MaterialConfig {
  // Material type
  type?: 'basic' | 'standard' | 'phong' | 'lambert' | 'physical' | 'shader';
  
  // Color
  color?: number | string;
  emissive?: number | string;
  specular?: number | string;
  
  // Material properties
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
  
  // Texture maps
  map?: string; // Texture URL
  normalMap?: string;
  roughnessMap?: string;
  metalnessMap?: string;
  
  // Shader configuration (for custom shaders)
  shader?: ShaderConfig;
}

/**
 * Custom shader configuration
 */
export interface ShaderConfig {
  vertexShader?: string;
  fragmentShader?: string;
  uniforms?: Record<string, {
    type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat3' | 'mat4' | 'texture';
    value: unknown;
  }>;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  // Hover effects
  hover?: {
    scale?: number;
    color?: number;
    duration?: number;
    easing?: string;
  };
  
  // Selection effects
  selected?: {
    scale?: number;
    color?: number;
    glow?: boolean;
    duration?: number;
  };
  
  // Execution state animations
  executing?: {
    pulse?: boolean;
    rotate?: boolean;
    color?: number;
    duration?: number;
  };
  
  // Idle animations
  idle?: {
    bob?: boolean;
    rotate?: boolean;
    pulse?: boolean;
    speed?: number;
  };
}

/**
 * SVG-specific rendering configuration
 */
export interface SVGRenderConfig extends RendererConfig {
  type: 'svg';
  
  // SVG path data
  paths?: Array<{
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }>;
  
  // SVG filters
  filters?: Array<{
    id: string;
    type: 'blur' | 'shadow' | 'glow' | 'custom';
    params?: Record<string, unknown>;
  }>;
  
  // SVG markers (for arrows, etc.)
  markers?: Array<{
    id: string;
    viewBox?: string;
    path?: string;
  }>;
}

/**
 * Canvas 2D rendering configuration
 */
export interface CanvasRenderConfig extends RendererConfig {
  type: 'canvas';
  
  // Drawing function reference
  drawFunction?: string;
  
  // Drawing parameters
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  
  // Paths
  paths?: Array<{
    type: 'arc' | 'rect' | 'line' | 'bezier' | 'quadratic';
    params: number[];
  }>;
}

/**
 * Complete render configuration for all renderers
 */
export interface StepRenderConfig {
  // Default renderer
  default?: RendererConfig;
  
  // Renderer-specific configurations
  webgl?: WebGLRenderConfig;
  svg?: SVGRenderConfig;
  canvas?: CanvasRenderConfig;
  
  // Custom renderer configurations
  custom?: Record<string, unknown>;
}

/**
 * Port rendering configuration
 */
export interface PortRenderConfig {
  // Visual appearance
  shape?: 'circle' | 'square' | 'triangle' | 'diamond' | 'custom';
  size?: number;
  color?: number | string;
  borderColor?: number | string;
  borderWidth?: number;
  
  // Position offset from default
  offsetX?: number;
  offsetY?: number;
  
  // Connection point offset
  connectionOffset?: {
    x: number;
    y: number;
  };
}
