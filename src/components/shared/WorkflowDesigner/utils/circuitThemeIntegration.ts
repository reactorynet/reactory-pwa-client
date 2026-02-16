/**
 * Enhanced Circuit Theme Integration
 * 
 * Integrates the new step-level rendering configurations with the existing
 * CircuitTheme system, allowing steps to define their own visual appearance
 * while maintaining backward compatibility.
 */

import type { StepDefinition } from '../types';
import { 
  getStepElementType,
  getComponentLabelPrefix,
  getComponentDimensions,
  getComponentColors,
  hasRenderingFeature
} from '../utils/renderingUtils';

import {
  type CircuitElementType,
  type ComponentTypeMapping,
  COMPONENT_TYPE_MAPPINGS,
  CIRCUIT_COLORS,
  CIRCUIT_DIMENSIONS
} from '../renderers/WebGLRenderer/CircuitTheme';

/**
 * Enhanced component type mapping that respects step rendering configuration
 */
export function getEnhancedCircuitElement(
  step: StepDefinition,
  index: number
): {
  circuitElement: CircuitElementType;
  prefix: string;
  label: string;
  dimensions: { width: number; height: number };
  colors: {
    body: number;
    bodyHover: number;
    bodySelected: number;
    pins: number;
    pinsConnected: number;
  };
  features: {
    hasGlow: boolean;
    hasNotch: boolean;
    hasPressEffect: boolean;
  };
} {
  const elementType = getStepElementType(step);
  const prefix = getComponentLabelPrefix(step);
  const dimensions = getComponentDimensions(step);
  const colors = getComponentColors(step);
  
  return {
    circuitElement: elementType,
    prefix,
    label: `${prefix}${index + 1}`,
    dimensions,
    colors,
    features: {
      hasGlow: hasRenderingFeature(step, 'hasGlow'),
      hasNotch: hasRenderingFeature(step, 'hasNotch'),
      hasPressEffect: hasRenderingFeature(step, 'hasPressEffect')
    }
  };
}

/**
 * Get circuit element type with fallback to legacy mapping
 */
export function getCircuitElementWithFallback(
  stepType: string,
  stepDefinition?: StepDefinition
): ComponentTypeMapping {
  // If we have the step definition, use the new rendering config
  if (stepDefinition) {
    const elementType = getStepElementType(stepDefinition);
    const prefix = getComponentLabelPrefix(stepDefinition);
    
    return {
      type: stepType,
      circuitElement: elementType,
      prefix
    };
  }
  
  // Fallback to legacy mapping by string matching
  const mapping = COMPONENT_TYPE_MAPPINGS.find(
    m => stepType.toLowerCase().includes(m.type.toLowerCase())
  );
  
  return mapping || { 
    type: stepType, 
    circuitElement: 'generic', 
    prefix: 'X' 
  };
}

/**
 * Export a factory function that can be used by renderers
 */
export function createStepRenderer(step: StepDefinition, index: number) {
  const config = getEnhancedCircuitElement(step, index);
  
  return {
    ...config,
    // Helper methods for renderers
    getBodyColor(state: 'normal' | 'hover' | 'selected' | 'grabbed'): number {
      switch (state) {
        case 'hover': return config.colors.bodyHover;
        case 'selected': return config.colors.bodySelected;
        case 'grabbed': return config.colors.bodySelected;
        default: return config.colors.body;
      }
    },
    
    getPinColor(connected: boolean): number {
      return connected ? config.colors.pinsConnected : config.colors.pins;
    },
    
    shouldRenderGlow(isActive: boolean): boolean {
      return config.features.hasGlow && isActive;
    },
    
    shouldRenderNotch(): boolean {
      return config.features.hasNotch && config.circuitElement === 'icChip';
    },
    
    getDimensions() {
      return {
        width: config.dimensions.width,
        height: config.dimensions.height,
        pinRadius: CIRCUIT_DIMENSIONS.pinRadius,
        pinSpacing: CIRCUIT_DIMENSIONS.pinSpacing
      };
    }
  };
}
