/**
 * Rendering utilities for extracting and using step rendering configurations
 */

import type { 
  StepDefinition, 
  StepRenderConfig,
  WebGLRenderConfig,
  CircuitRenderConfig,
  SVGRenderConfig,
  CanvasRenderConfig
} from '../types';

/**
 * Get the rendering configuration for a specific renderer type
 */
export function getRenderConfig(
  step: StepDefinition,
  rendererType: 'webgl' | 'svg' | 'canvas'
): WebGLRenderConfig | SVGRenderConfig | CanvasRenderConfig | undefined {
  if (!step.rendering) return undefined;
  
  switch (rendererType) {
    case 'webgl':
      return step.rendering.webgl;
    case 'svg':
      return step.rendering.svg;
    case 'canvas':
      return step.rendering.canvas;
    default:
      return step.rendering.default as any;
  }
}

/**
 * Get circuit-specific rendering configuration
 */
export function getCircuitRenderConfig(
  step: StepDefinition
): CircuitRenderConfig | undefined {
  const webglConfig = step.rendering?.webgl;
  if (webglConfig?.theme === 'circuit') {
    return webglConfig.circuit;
  }
  return undefined;
}

/**
 * Get the circuit element type for a step, with fallback to type mapping
 */
export function getStepElementType(
  step: StepDefinition
): 'pushButton' | 'led' | 'icChip' | 'transistor' | 'capacitor' | 'resistor' | 'generic' {
  const circuitConfig = getCircuitRenderConfig(step);
  if (circuitConfig?.elementType) {
    return circuitConfig.elementType;
  }
  
  // Fallback to default mappings based on step category/type
  const stepType = step.id.toLowerCase();
  
  if (stepType.includes('start') || stepType.includes('trigger')) {
    return 'pushButton';
  }
  if (stepType.includes('end') || stepType.includes('output')) {
    return 'led';
  }
  if (stepType.includes('condition') || stepType.includes('decision')) {
    return 'transistor';
  }
  if (stepType.includes('delay') || stepType.includes('timer')) {
    return 'capacitor';
  }
  if (stepType.includes('filter') || stepType.includes('transform')) {
    return 'resistor';
  }
  
  return 'icChip'; // Default for most action/task steps
}

/**
 * Get the component label prefix
 */
export function getComponentLabelPrefix(step: StepDefinition): string {
  const circuitConfig = getCircuitRenderConfig(step);
  if (circuitConfig?.labelPrefix) {
    return circuitConfig.labelPrefix;
  }
  
  // Fallback based on element type
  const elementType = getStepElementType(step);
  switch (elementType) {
    case 'pushButton': return 'S';
    case 'led': return 'LED';
    case 'transistor': return 'Q';
    case 'capacitor': return 'C';
    case 'resistor': return 'R';
    case 'icChip': return 'U';
    default: return 'X';
  }
}

/**
 * Get component dimensions with fallbacks
 */
export function getComponentDimensions(
  step: StepDefinition
): { width: number; height: number } {
  const circuitConfig = getCircuitRenderConfig(step);
  
  if (circuitConfig?.dimensions) {
    return {
      width: circuitConfig.dimensions.width || 100,
      height: circuitConfig.dimensions.height || 80
    };
  }
  
  // Default dimensions based on element type
  const elementType = getStepElementType(step);
  switch (elementType) {
    case 'pushButton':
      return { width: 40, height: 40 };
    case 'led':
      return { width: 30, height: 30 };
    case 'transistor':
      return { width: 50, height: 60 };
    case 'capacitor':
      return { width: 40, height: 60 };
    case 'resistor':
      return { width: 60, height: 30 };
    case 'icChip':
    default:
      return { width: 100, height: 80 };
  }
}

/**
 * Get component colors with fallbacks
 */
export function getComponentColors(
  step: StepDefinition
): {
  body: number;
  bodyHover: number;
  bodySelected: number;
  pins: number;
  pinsConnected: number;
} {
  const circuitConfig = getCircuitRenderConfig(step);
  
  const defaults = {
    body: 0x1a1a1a,
    bodyHover: 0x2a2a2a,
    bodySelected: 0x1565c0,
    pins: 0x808080,
    pinsConnected: 0xb87333
  };
  
  if (!circuitConfig?.colors) {
    return defaults;
  }
  
  return {
    body: circuitConfig.colors.body ?? defaults.body,
    bodyHover: circuitConfig.colors.bodyHover ?? defaults.bodyHover,
    bodySelected: circuitConfig.colors.bodySelected ?? defaults.bodySelected,
    pins: circuitConfig.colors.pins ?? defaults.pins,
    pinsConnected: circuitConfig.colors.pinsConnected ?? defaults.pinsConnected
  };
}

/**
 * Check if a step has specific rendering features
 */
export function hasRenderingFeature(
  step: StepDefinition,
  feature: 'hasGlow' | 'hasNotch' | 'hasPressEffect'
): boolean {
  const circuitConfig = getCircuitRenderConfig(step);
  return circuitConfig?.features?.[feature] ?? false;
}

/**
 * Get animation configuration for a specific state
 */
export function getAnimationConfig(
  step: StepDefinition,
  state: 'hover' | 'selected' | 'executing' | 'idle'
) {
  const webglConfig = step.rendering?.webgl;
  if (!webglConfig?.animation) {
    return undefined;
  }
  
  return webglConfig.animation[state];
}

/**
 * Merge step-level rendering config with instance-level overrides
 */
export function mergeRenderConfig(
  stepConfig: StepRenderConfig | undefined,
  instanceOverrides?: Partial<StepRenderConfig>
): StepRenderConfig | undefined {
  if (!stepConfig && !instanceOverrides) {
    return undefined;
  }
  
  if (!instanceOverrides) {
    return stepConfig;
  }
  
  if (!stepConfig) {
    return instanceOverrides as StepRenderConfig;
  }
  
  return {
    ...stepConfig,
    ...instanceOverrides,
    webgl: instanceOverrides.webgl 
      ? { ...stepConfig.webgl, ...instanceOverrides.webgl } as WebGLRenderConfig
      : stepConfig.webgl,
    svg: instanceOverrides.svg
      ? { ...stepConfig.svg, ...instanceOverrides.svg } as SVGRenderConfig
      : stepConfig.svg,
    canvas: instanceOverrides.canvas
      ? { ...stepConfig.canvas, ...instanceOverrides.canvas } as CanvasRenderConfig
      : stepConfig.canvas
  };
}
