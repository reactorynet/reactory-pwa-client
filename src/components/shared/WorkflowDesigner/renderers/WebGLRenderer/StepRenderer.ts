/**
 * StepRenderer - High-performance workflow step rendering
 * 
 * Uses instanced geometry for rendering multiple steps efficiently.
 * Each step is rendered as a rounded rectangle with ports and labels.
 */

import * as THREE from 'three';
import { 
  IStepRenderer, 
  StepRenderConfig, 
  StepGeometryData, 
  PortGeometryData,
  DEFAULT_SCENE_CONFIG 
} from './types';

// Vertex shader for instanced steps
const STEP_VERTEX_SHADER = `
  attribute vec3 instancePosition;
  attribute vec2 instanceSize;
  attribute vec3 instanceColor;
  attribute vec3 instanceBorderColor;
  attribute float instanceSelected;
  attribute float instanceHasError;
  attribute float instanceHasWarning;
  
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vBorderColor;
  varying float vSelected;
  varying float vHasError;
  varying float vHasWarning;
  varying vec2 vSize;
  varying vec2 vLocalPos;
  
  void main() {
    vUv = uv;
    vColor = instanceColor;
    vBorderColor = instanceBorderColor;
    vSelected = instanceSelected;
    vHasError = instanceHasError;
    vHasWarning = instanceHasWarning;
    vSize = instanceSize;
    
    // Scale unit quad by instance size
    vec3 scaledPosition = position * vec3(instanceSize, 1.0);
    vLocalPos = scaledPosition.xy;
    
    // Translate to instance position
    vec3 worldPosition = scaledPosition + instancePosition;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
  }
`;

// Fragment shader for rounded rectangle steps with border
const STEP_FRAGMENT_SHADER = `
  uniform float uCornerRadius;
  uniform float uBorderWidth;
  uniform float uSelectedBorderWidth;
  uniform float uShadowBlur;
  uniform bool uShadowsEnabled;
  
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vBorderColor;
  varying float vSelected;
  varying float vHasError;
  varying float vHasWarning;
  varying vec2 vSize;
  varying vec2 vLocalPos;
  
  // Signed distance function for rounded rectangle
  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  
  void main() {
    vec2 halfSize = vSize * 0.5;
    vec2 center = vLocalPos;
    
    // Calculate corner radius (clamped to half of smaller dimension)
    float radius = min(uCornerRadius, min(halfSize.x, halfSize.y) * 0.5);
    
    // Calculate distance from rounded rectangle edge
    float dist = roundedBoxSDF(center, halfSize, radius);
    
    // Anti-aliasing
    float aa = fwidth(dist);
    
    // Determine border width based on selection state
    float borderWidth = mix(uBorderWidth, uSelectedBorderWidth, vSelected);
    
    // Calculate fill and border regions
    float fillAlpha = 1.0 - smoothstep(-aa, aa, dist);
    float borderAlpha = 1.0 - smoothstep(-aa, aa, dist + borderWidth);
    float isBorder = borderAlpha - fillAlpha;
    
    // Determine border color based on state
    vec3 borderColor = vBorderColor;
    if (vHasError > 0.5) {
      borderColor = vec3(0.827, 0.184, 0.184); // #d32f2f
    } else if (vHasWarning > 0.5) {
      borderColor = vec3(0.961, 0.486, 0.0); // #f57c00
    } else if (vSelected > 0.5) {
      borderColor = vec3(0.098, 0.463, 0.824); // #1976d2
    }
    
    // Mix fill and border colors
    vec3 finalColor = mix(vColor, borderColor, isBorder / max(borderAlpha, 0.001));
    
    // Shadow (only if enabled and outside main shape)
    float shadowAlpha = 0.0;
    if (uShadowsEnabled) {
      float shadowDist = roundedBoxSDF(center - vec2(2.0, -2.0), halfSize, radius);
      shadowAlpha = (1.0 - smoothstep(-uShadowBlur, uShadowBlur, shadowDist)) * 0.15;
      shadowAlpha *= (1.0 - borderAlpha); // Don't show shadow under the shape
    }
    
    // Combine
    float alpha = max(borderAlpha, shadowAlpha);
    
    if (alpha < 0.01) discard;
    
    // Apply shadow color where applicable
    if (shadowAlpha > borderAlpha) {
      finalColor = vec3(0.0);
      alpha = shadowAlpha;
    }
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Port shader - simple circles
const PORT_VERTEX_SHADER = `
  attribute vec3 instancePosition;
  attribute vec3 instanceColor;
  attribute float instanceConnected;
  attribute float instanceHovered;
  
  varying vec3 vColor;
  varying float vConnected;
  varying float vHovered;
  varying vec2 vUv;
  
  uniform float uPortRadius;
  
  void main() {
    vUv = uv;
    vColor = instanceColor;
    vConnected = instanceConnected;
    vHovered = instanceHovered;
    
    // Scale unit quad by port radius
    vec3 scaledPosition = position * vec3(uPortRadius * 2.0, uPortRadius * 2.0, 1.0);
    vec3 worldPosition = scaledPosition + instancePosition;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
  }
`;

const PORT_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vConnected;
  varying float vHovered;
  varying vec2 vUv;
  
  void main() {
    // Circle SDF
    vec2 center = vUv - 0.5;
    float dist = length(center) - 0.4;
    
    float aa = fwidth(dist);
    float alpha = 1.0 - smoothstep(-aa, aa, dist);
    
    // Fill or ring based on connected state
    vec3 color = vColor;
    if (vConnected < 0.5) {
      // Ring only for unconnected ports
      float innerDist = length(center) - 0.25;
      float innerAlpha = 1.0 - smoothstep(-aa, aa, innerDist);
      alpha = alpha - innerAlpha;
      
      // Fill with white/light color
      color = mix(vec3(1.0), vColor, 0.2);
    }
    
    // Hover highlight
    if (vHovered > 0.5) {
      color = mix(color, vec3(0.259, 0.647, 0.961), 0.3); // #42a5f5 tint
    }
    
    if (alpha < 0.01) discard;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export class StepRenderer implements IStepRenderer {
  private scene: THREE.Scene | null = null;
  private config: StepRenderConfig;
  
  // Step rendering
  private stepMesh: THREE.InstancedMesh | null = null;
  private stepGeometry: THREE.PlaneGeometry | null = null;
  private stepMaterial: THREE.ShaderMaterial | null = null;
  private stepInstanceData: Map<string, number> = new Map(); // stepId -> instanceIndex
  
  // Port rendering
  private portMesh: THREE.InstancedMesh | null = null;
  private portGeometry: THREE.PlaneGeometry | null = null;
  private portMaterial: THREE.ShaderMaterial | null = null;
  private portInstanceData: Map<string, number> = new Map(); // portId -> instanceIndex
  
  // Instance attributes
  private maxInstances = 1000; // Initial capacity
  private maxPortInstances = 5000;
  
  // Highlight state
  private highlightedStepId: string | null = null;
  
  constructor(config: Partial<StepRenderConfig> = {}) {
    this.config = { ...DEFAULT_SCENE_CONFIG.steps, ...config };
  }
  
  /**
   * Initialize the step renderer
   */
  initialize(scene: THREE.Scene, config?: Partial<StepRenderConfig>): void {
    this.scene = scene;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.createStepMesh();
    this.createPortMesh();
  }
  
  /**
   * Create the instanced mesh for steps
   */
  private createStepMesh(): void {
    if (!this.scene) return;
    
    // Unit quad geometry (will be scaled per instance)
    this.stepGeometry = new THREE.PlaneGeometry(1, 1);
    
    // Shader material
    this.stepMaterial = new THREE.ShaderMaterial({
      vertexShader: STEP_VERTEX_SHADER,
      fragmentShader: STEP_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uCornerRadius: { value: this.config.cornerRadius },
        uBorderWidth: { value: this.config.borderWidth },
        uSelectedBorderWidth: { value: this.config.selectedBorderWidth },
        uShadowBlur: { value: this.config.shadowBlur },
        uShadowsEnabled: { value: this.config.shadows }
      }
    });
    
    // Create instanced mesh
    this.stepMesh = new THREE.InstancedMesh(
      this.stepGeometry,
      this.stepMaterial,
      this.maxInstances
    );
    
    this.stepMesh.name = 'WorkflowSteps';
    this.stepMesh.frustumCulled = false; // We handle culling ourselves
    this.stepMesh.count = 0; // Start with no visible instances
    
    // Add instance attributes
    this.addStepInstanceAttributes();
    
    this.scene.add(this.stepMesh);
  }
  
  /**
   * Add custom instance attributes for steps
   */
  private addStepInstanceAttributes(): void {
    if (!this.stepMesh || !this.stepGeometry) return;
    
    const instancePosition = new Float32Array(this.maxInstances * 3);
    const instanceSize = new Float32Array(this.maxInstances * 2);
    const instanceColor = new Float32Array(this.maxInstances * 3);
    const instanceBorderColor = new Float32Array(this.maxInstances * 3);
    const instanceSelected = new Float32Array(this.maxInstances);
    const instanceHasError = new Float32Array(this.maxInstances);
    const instanceHasWarning = new Float32Array(this.maxInstances);
    
    this.stepGeometry.setAttribute('instancePosition', 
      new THREE.InstancedBufferAttribute(instancePosition, 3));
    this.stepGeometry.setAttribute('instanceSize', 
      new THREE.InstancedBufferAttribute(instanceSize, 2));
    this.stepGeometry.setAttribute('instanceColor', 
      new THREE.InstancedBufferAttribute(instanceColor, 3));
    this.stepGeometry.setAttribute('instanceBorderColor', 
      new THREE.InstancedBufferAttribute(instanceBorderColor, 3));
    this.stepGeometry.setAttribute('instanceSelected', 
      new THREE.InstancedBufferAttribute(instanceSelected, 1));
    this.stepGeometry.setAttribute('instanceHasError', 
      new THREE.InstancedBufferAttribute(instanceHasError, 1));
    this.stepGeometry.setAttribute('instanceHasWarning', 
      new THREE.InstancedBufferAttribute(instanceHasWarning, 1));
  }
  
  /**
   * Create the instanced mesh for ports
   */
  private createPortMesh(): void {
    if (!this.scene) return;
    
    // Unit quad for ports
    this.portGeometry = new THREE.PlaneGeometry(1, 1);
    
    // Port shader material
    this.portMaterial = new THREE.ShaderMaterial({
      vertexShader: PORT_VERTEX_SHADER,
      fragmentShader: PORT_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uPortRadius: { value: this.config.portRadius }
      }
    });
    
    // Create instanced mesh
    this.portMesh = new THREE.InstancedMesh(
      this.portGeometry,
      this.portMaterial,
      this.maxPortInstances
    );
    
    this.portMesh.name = 'WorkflowPorts';
    this.portMesh.frustumCulled = false;
    this.portMesh.count = 0;
    this.portMesh.position.z = 0.1; // Slightly in front of steps
    
    // Add instance attributes
    this.addPortInstanceAttributes();
    
    this.scene.add(this.portMesh);
  }
  
  /**
   * Add custom instance attributes for ports
   */
  private addPortInstanceAttributes(): void {
    if (!this.portMesh || !this.portGeometry) return;
    
    const instancePosition = new Float32Array(this.maxPortInstances * 3);
    const instanceColor = new Float32Array(this.maxPortInstances * 3);
    const instanceConnected = new Float32Array(this.maxPortInstances);
    const instanceHovered = new Float32Array(this.maxPortInstances);
    
    this.portGeometry.setAttribute('instancePosition',
      new THREE.InstancedBufferAttribute(instancePosition, 3));
    this.portGeometry.setAttribute('instanceColor',
      new THREE.InstancedBufferAttribute(instanceColor, 3));
    this.portGeometry.setAttribute('instanceConnected',
      new THREE.InstancedBufferAttribute(instanceConnected, 1));
    this.portGeometry.setAttribute('instanceHovered',
      new THREE.InstancedBufferAttribute(instanceHovered, 1));
  }
  
  /**
   * Update all steps
   */
  updateSteps(steps: StepGeometryData[]): void {
    if (!this.stepMesh || !this.stepGeometry) return;
    
    // Grow buffers if needed
    if (steps.length > this.maxInstances) {
      this.growStepBuffers(steps.length);
    }
    
    // Get attribute arrays
    const positionAttr = this.stepGeometry.getAttribute('instancePosition') as THREE.InstancedBufferAttribute;
    const sizeAttr = this.stepGeometry.getAttribute('instanceSize') as THREE.InstancedBufferAttribute;
    const colorAttr = this.stepGeometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute;
    const borderColorAttr = this.stepGeometry.getAttribute('instanceBorderColor') as THREE.InstancedBufferAttribute;
    const selectedAttr = this.stepGeometry.getAttribute('instanceSelected') as THREE.InstancedBufferAttribute;
    const hasErrorAttr = this.stepGeometry.getAttribute('instanceHasError') as THREE.InstancedBufferAttribute;
    const hasWarningAttr = this.stepGeometry.getAttribute('instanceHasWarning') as THREE.InstancedBufferAttribute;
    
    // Clear instance mapping
    this.stepInstanceData.clear();
    
    // Collect all ports for batch update
    const allPorts: PortGeometryData[] = [];
    
    // Update each step
    steps.forEach((step, index) => {
      this.stepInstanceData.set(step.id, index);
      
      // Position (center of step)
      positionAttr.array[index * 3] = step.position.x + step.size.width / 2;
      positionAttr.array[index * 3 + 1] = -(step.position.y + step.size.height / 2);
      positionAttr.array[index * 3 + 2] = 0;
      
      // Size
      sizeAttr.array[index * 2] = step.size.width;
      sizeAttr.array[index * 2 + 1] = step.size.height;
      
      // Color (convert from hex)
      const color = new THREE.Color(step.color);
      colorAttr.array[index * 3] = color.r;
      colorAttr.array[index * 3 + 1] = color.g;
      colorAttr.array[index * 3 + 2] = color.b;
      
      // Border color
      const borderColor = new THREE.Color(step.borderColor);
      borderColorAttr.array[index * 3] = borderColor.r;
      borderColorAttr.array[index * 3 + 1] = borderColor.g;
      borderColorAttr.array[index * 3 + 2] = borderColor.b;
      
      // State flags
      selectedAttr.array[index] = step.selected ? 1 : 0;
      hasErrorAttr.array[index] = step.hasError ? 1 : 0;
      hasWarningAttr.array[index] = step.hasWarning ? 1 : 0;
      
      // Collect ports
      allPorts.push(...step.inputPorts, ...step.outputPorts);
    });
    
    // Mark attributes for update
    positionAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    borderColorAttr.needsUpdate = true;
    selectedAttr.needsUpdate = true;
    hasErrorAttr.needsUpdate = true;
    hasWarningAttr.needsUpdate = true;
    
    // Update instance count
    this.stepMesh.count = steps.length;
    
    // Update ports
    this.updatePorts(allPorts);
  }
  
  /**
   * Update all ports
   */
  private updatePorts(ports: PortGeometryData[]): void {
    if (!this.portMesh || !this.portGeometry) return;
    
    // Grow buffers if needed
    if (ports.length > this.maxPortInstances) {
      this.growPortBuffers(ports.length);
    }
    
    const positionAttr = this.portGeometry.getAttribute('instancePosition') as THREE.InstancedBufferAttribute;
    const colorAttr = this.portGeometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute;
    const connectedAttr = this.portGeometry.getAttribute('instanceConnected') as THREE.InstancedBufferAttribute;
    const hoveredAttr = this.portGeometry.getAttribute('instanceHovered') as THREE.InstancedBufferAttribute;
    
    this.portInstanceData.clear();
    
    ports.forEach((port, index) => {
      this.portInstanceData.set(port.id, index);
      
      // Position
      positionAttr.array[index * 3] = port.worldPosition.x;
      positionAttr.array[index * 3 + 1] = -port.worldPosition.y;
      positionAttr.array[index * 3 + 2] = 0;
      
      // Color
      const color = new THREE.Color(port.color);
      colorAttr.array[index * 3] = color.r;
      colorAttr.array[index * 3 + 1] = color.g;
      colorAttr.array[index * 3 + 2] = color.b;
      
      // State
      connectedAttr.array[index] = port.connected ? 1 : 0;
      hoveredAttr.array[index] = port.hovered ? 1 : 0;
    });
    
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    connectedAttr.needsUpdate = true;
    hoveredAttr.needsUpdate = true;
    
    this.portMesh.count = ports.length;
  }
  
  /**
   * Grow step buffers to accommodate more instances
   */
  private growStepBuffers(minCapacity: number): void {
    const newCapacity = Math.max(minCapacity, this.maxInstances * 2);
    this.maxInstances = newCapacity;
    
    // Recreate attributes with larger buffers
    this.addStepInstanceAttributes();
  }
  
  /**
   * Grow port buffers
   */
  private growPortBuffers(minCapacity: number): void {
    const newCapacity = Math.max(minCapacity, this.maxPortInstances * 2);
    this.maxPortInstances = newCapacity;
    
    this.addPortInstanceAttributes();
  }
  
  /**
   * Set highlighted step
   */
  setHighlight(stepId: string | null): void {
    this.highlightedStepId = stepId;
    // Highlight is handled through the updateSteps call
  }
  
  /**
   * Get step mesh by ID (for raycasting)
   */
  getStepMesh(stepId: string): THREE.Object3D | null {
    // For instanced rendering, we return the whole mesh
    // Hit testing is done via position comparison
    return this.stepMesh;
  }
  
  /**
   * Get step instance index by ID
   */
  getStepInstanceIndex(stepId: string): number | undefined {
    return this.stepInstanceData.get(stepId);
  }
  
  /**
   * Get port instance index by ID
   */
  getPortInstanceIndex(portId: string): number | undefined {
    return this.portInstanceData.get(portId);
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.stepMesh && this.scene) {
      this.scene.remove(this.stepMesh);
    }
    if (this.portMesh && this.scene) {
      this.scene.remove(this.portMesh);
    }
    
    this.stepGeometry?.dispose();
    this.stepMaterial?.dispose();
    this.portGeometry?.dispose();
    this.portMaterial?.dispose();
    
    this.stepMesh = null;
    this.portMesh = null;
    this.stepGeometry = null;
    this.portGeometry = null;
    this.stepMaterial = null;
    this.portMaterial = null;
    this.scene = null;
    
    this.stepInstanceData.clear();
    this.portInstanceData.clear();
  }
}
