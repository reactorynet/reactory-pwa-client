/**
 * Example: Integrating the new rendering system with CircuitComponentRenderer
 * 
 * This shows how to update the existing CircuitComponentRenderer to use
 * step-level rendering configurations.
 */

import * as THREE from 'three';
import type { StepDefinition } from '../../types';
import type { StepGeometryData } from './types';
import { 
  getEnhancedCircuitElement,
  createStepRenderer 
} from '../../utils/circuitThemeIntegration';

/**
 * Example 1: Getting rendering configuration for a step
 */
function exampleGetRenderConfig(
  stepDefinition: StepDefinition,
  stepGeometry: StepGeometryData,
  index: number
) {
  // Get the complete rendering configuration
  const renderConfig = getEnhancedCircuitElement(stepDefinition, index);
  
  console.log('Element Type:', renderConfig.circuitElement);
  console.log('Label:', renderConfig.label);
  console.log('Dimensions:', renderConfig.dimensions);
  console.log('Colors:', renderConfig.colors);
  console.log('Features:', renderConfig.features);
}

/**
 * Example 2: Creating a component with custom configuration
 */
function exampleCreateComponent(
  stepDefinition: StepDefinition,
  stepGeometry: StepGeometryData,
  index: number
): THREE.Group {
  const renderer = createStepRenderer(stepDefinition, index);
  const group = new THREE.Group();
  
  // Get dimensions from the step definition
  const dims = renderer.getDimensions();
  
  // Create geometry based on element type
  let geometry: THREE.BufferGeometry;
  
  if (renderer.circuitElement === 'pushButton') {
    // Create button with configured dimensions
    geometry = new THREE.BoxGeometry(
      dims.width,
      dims.height,
      20  // Depth
    );
  } else if (renderer.circuitElement === 'led') {
    // Create LED with configured dimensions
    geometry = new THREE.CircleGeometry(dims.width / 2, 32);
  } else {
    // Create IC chip with configured dimensions
    geometry = new THREE.BoxGeometry(
      dims.width,
      dims.height,
      10
    );
  }
  
  // Create material with configured colors
  const material = new THREE.MeshBasicMaterial({
    color: renderer.getBodyColor('normal')
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);
  
  // Add glow effect if configured
  if (renderer.shouldRenderGlow(true)) {
    const glowGeometry = new THREE.CircleGeometry(dims.width / 2 * 1.5, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: stepDefinition.rendering?.webgl?.circuit?.colors?.glow || 0xff6666,
      transparent: true,
      opacity: 0.4
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -1;
    group.add(glowMesh);
  }
  
  // Add notch if configured (for IC chips)
  if (renderer.shouldRenderNotch()) {
    const notchGeometry = new THREE.CircleGeometry(5, 16);
    const notchMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const notchMesh = new THREE.Mesh(notchGeometry, notchMaterial);
    notchMesh.position.set(-dims.width / 2 + 10, dims.height / 2 - 10, 11);
    group.add(notchMesh);
  }
  
  return group;
}

/**
 * Example 3: Updating component state with configured colors
 */
function exampleUpdateComponentState(
  stepDefinition: StepDefinition,
  mesh: THREE.Mesh,
  state: 'normal' | 'hover' | 'selected' | 'grabbed',
  index: number
) {
  const renderer = createStepRenderer(stepDefinition, index);
  
  // Get the appropriate color for the state
  const color = renderer.getBodyColor(state);
  
  // Update the mesh material
  if (mesh.material instanceof THREE.MeshBasicMaterial) {
    mesh.material.color.setHex(color);
  }
}

/**
 * Example 4: Animating based on configuration
 */
function exampleAnimateComponent(
  stepDefinition: StepDefinition,
  mesh: THREE.Mesh,
  isExecuting: boolean
) {
  const animConfig = stepDefinition.rendering?.webgl?.animation;
  
  if (isExecuting && animConfig?.executing) {
    const execConfig = animConfig.executing;
    
    // Apply pulse animation if configured
    if (execConfig.pulse) {
      const scale = 1 + Math.sin(Date.now() / (execConfig.duration || 1000)) * 0.1;
      mesh.scale.setScalar(scale);
    }
    
    // Apply rotation if configured
    if (execConfig.rotate) {
      mesh.rotation.z += 0.01;
    }
    
    // Apply color change if configured
    if (execConfig.color && mesh.material instanceof THREE.MeshBasicMaterial) {
      mesh.material.color.setHex(execConfig.color);
    }
  }
}

/**
 * Example 5: Creating pins with custom configuration
 */
function exampleCreatePins(
  stepDefinition: StepDefinition,
  group: THREE.Group,
  index: number
) {
  const renderer = createStepRenderer(stepDefinition, index);
  const dims = renderer.getDimensions();
  const inputCount = stepDefinition.inputPorts.length;
  const outputCount = stepDefinition.outputPorts.length;
  
  // Create input pins
  for (let i = 0; i < inputCount; i++) {
    const pinGeometry = new THREE.CircleGeometry(dims.pinRadius, 16);
    const pinMaterial = new THREE.MeshBasicMaterial({
      color: renderer.getPinColor(false)
    });
    const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
    
    // Position on left side
    const spacing = dims.height / (inputCount + 1);
    pinMesh.position.set(
      -dims.width / 2 - dims.pinRadius,
      dims.height / 2 - spacing * (i + 1),
      0
    );
    
    group.add(pinMesh);
  }
  
  // Create output pins
  for (let i = 0; i < outputCount; i++) {
    const pinGeometry = new THREE.CircleGeometry(dims.pinRadius, 16);
    const pinMaterial = new THREE.MeshBasicMaterial({
      color: renderer.getPinColor(false)
    });
    const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
    
    // Position on right side
    const spacing = dims.height / (outputCount + 1);
    pinMesh.position.set(
      dims.width / 2 + dims.pinRadius,
      dims.height / 2 - spacing * (i + 1),
      0
    );
    
    group.add(pinMesh);
  }
}

/**
 * Example 6: Complete integration with existing renderer
 */
class EnhancedCircuitComponentRenderer {
  private scene: THREE.Scene;
  private components: Map<string, { group: THREE.Group; stepDef: StepDefinition }> = new Map();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  updateComponents(
    steps: StepGeometryData[],
    stepDefinitions: Map<string, StepDefinition>
  ): void {
    steps.forEach((stepGeom, index) => {
      const stepDef = stepDefinitions.get(stepGeom.stepType);
      if (!stepDef) return;
      
      const existing = this.components.get(stepGeom.id);
      
      if (!existing) {
        // Create new component using rendering configuration
        const group = exampleCreateComponent(stepDef, stepGeom, index);
        this.components.set(stepGeom.id, { group, stepDef });
        this.scene.add(group);
      } else {
        // Update existing component position
        existing.group.position.set(
          stepGeom.position.x,
          -stepGeom.position.y,
          0
        );
      }
    });
  }
  
  setComponentState(
    componentId: string,
    state: 'normal' | 'hover' | 'selected' | 'grabbed'
  ): void {
    const component = this.components.get(componentId);
    if (!component) return;
    
    const mesh = component.group.children[0] as THREE.Mesh;
    const index = Array.from(this.components.keys()).indexOf(componentId);
    
    exampleUpdateComponentState(component.stepDef, mesh, state, index);
  }
  
  animate(componentId: string, isExecuting: boolean): void {
    const component = this.components.get(componentId);
    if (!component) return;
    
    const mesh = component.group.children[0] as THREE.Mesh;
    exampleAnimateComponent(component.stepDef, mesh, isExecuting);
  }
}

export {
  exampleGetRenderConfig,
  exampleCreateComponent,
  exampleUpdateComponentState,
  exampleAnimateComponent,
  exampleCreatePins,
  EnhancedCircuitComponentRenderer
};
