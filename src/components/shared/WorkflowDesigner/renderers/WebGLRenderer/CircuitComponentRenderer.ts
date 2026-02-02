/**
 * CircuitComponentRenderer - Renders workflow steps as electronic circuit components
 * 
 * Draws components like push buttons, IC chips, LEDs, etc. to give the
 * workflow designer an electrical circuit board aesthetic.
 */

import * as THREE from 'three';
import { 
  CIRCUIT_COLORS, 
  CIRCUIT_DIMENSIONS, 
  getCircuitElement,
  type CircuitElementType 
} from './CircuitTheme';
import type { StepGeometryData } from './types';

interface ComponentMesh {
  id: string;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  pinMeshes: THREE.Mesh[];
  glowMesh?: THREE.Mesh;
  elementType: CircuitElementType;
  isHovered: boolean;
  isGrabbed: boolean;
}

export class CircuitComponentRenderer {
  private readonly scene: THREE.Scene;
  private readonly componentsGroup: THREE.Group;
  private readonly components: Map<string, ComponentMesh> = new Map();
  
  // Shared geometries for performance
  private readonly pinGeometry: THREE.CircleGeometry;
  private readonly pinConnectedGeometry: THREE.CircleGeometry;
  
  // Materials
  private readonly materials: {
    componentBody: THREE.MeshBasicMaterial;
    componentBodyHover: THREE.MeshBasicMaterial;
    componentBodySelected: THREE.MeshBasicMaterial;
    componentBodyGrabbed: THREE.MeshBasicMaterial;
    pin: THREE.MeshBasicMaterial;
    pinConnected: THREE.MeshBasicMaterial;
    pinHover: THREE.MeshBasicMaterial;
    pushButtonTop: THREE.MeshBasicMaterial;
    pushButtonTopPressed: THREE.MeshBasicMaterial;
    ledOff: THREE.MeshBasicMaterial;
    ledOn: THREE.MeshBasicMaterial;
    ledGlow: THREE.MeshBasicMaterial;
    icNotch: THREE.MeshBasicMaterial;
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.componentsGroup = new THREE.Group();
    this.componentsGroup.name = 'CircuitComponents';
    this.scene.add(this.componentsGroup);
    
    // Create shared geometries
    this.pinGeometry = new THREE.CircleGeometry(CIRCUIT_DIMENSIONS.pinRadius, 16);
    this.pinConnectedGeometry = new THREE.CircleGeometry(CIRCUIT_DIMENSIONS.pinRadius * 1.2, 16);
    
    // Create materials
    this.materials = {
      componentBody: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.componentBody }),
      componentBodyHover: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.componentBodyHover }),
      componentBodySelected: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.componentBodySelected }),
      componentBodyGrabbed: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.componentBodyGrabbed }),
      pin: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.componentPin }),
      pinConnected: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.componentPinConnected }),
      pinHover: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.componentPinHover }),
      pushButtonTop: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.pushButtonTop }),
      pushButtonTopPressed: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.pushButtonPressed }),
      ledOff: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.ledOff }),
      ledOn: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.ledOn }),
      ledGlow: new THREE.MeshBasicMaterial({ 
        color: CIRCUIT_COLORS.ledGlow, 
        transparent: true, 
        opacity: 0.4 
      }),
      icNotch: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.icChipNotch }),
    };
  }

  /**
   * Update all circuit components
   */
  updateComponents(steps: StepGeometryData[]): void {
    const currentIds = new Set(steps.map(s => s.id));
    
    // Remove components that no longer exist
    for (const [id, component] of this.components) {
      if (!currentIds.has(id)) {
        this.componentsGroup.remove(component.group);
        this.disposeComponent(component);
        this.components.delete(id);
      }
    }
    
    // Update or create components
    steps.forEach(step => {
      const existing = this.components.get(step.id);
      const elementType = getCircuitElement(step.stepType).circuitElement;
      
      if (existing) {
        this.updateComponent(existing, step, elementType);
      } else {
        const component = this.createComponent(step, elementType);
        this.components.set(step.id, component);
        this.componentsGroup.add(component.group);
      }
    });
  }

  /**
   * Create a circuit component based on element type
   */
  private createComponent(step: StepGeometryData, elementType: CircuitElementType): ComponentMesh {
    const group = new THREE.Group();
    group.name = `component_${step.id}`;
    
    let bodyMesh: THREE.Mesh;
    let glowMesh: THREE.Mesh | undefined;
    const pinMeshes: THREE.Mesh[] = [];
    
    switch (elementType) {
      case 'pushButton':
        ({ bodyMesh, glowMesh } = this.createPushButton(step));
        break;
      case 'led':
        ({ bodyMesh, glowMesh } = this.createLED(step));
        break;
      case 'icChip':
      default:
        bodyMesh = this.createICChip(step);
        break;
    }
    
    group.add(bodyMesh);
    if (glowMesh) {
      group.add(glowMesh);
    }
    
    // Create pins
    this.createPins(step, pinMeshes, group);
    
    // Position the group (negate Y for Three.js coordinate system)
    const centerX = step.position.x + step.size.width / 2;
    const centerY = -(step.position.y + step.size.height / 2);
    group.position.set(centerX, centerY, 0);
    
    return {
      id: step.id,
      group,
      bodyMesh,
      pinMeshes,
      glowMesh,
      elementType,
      isHovered: false,
      isGrabbed: false,
    };
  }

  /**
   * Create a push button component (for start/trigger nodes)
   */
  private createPushButton(step: StepGeometryData): { bodyMesh: THREE.Mesh; glowMesh?: THREE.Mesh } {
    const size = Math.min(step.size.width, step.size.height) * 0.7;
    
    // Outer body (black plastic housing)
    const bodyGeometry = new THREE.BufferGeometry();
    const bodySize = size;
    const bodyVertices = this.createRoundedRectVertices(
      -bodySize / 2, -bodySize / 2,
      bodySize, bodySize,
      8
    );
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyVertices, 3));
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.componentBody.clone());
    bodyMesh.position.z = 0;
    
    // Button top (red circle)
    const buttonRadius = size * 0.35;
    const buttonGeometry = new THREE.CircleGeometry(buttonRadius, 32);
    const buttonMesh = new THREE.Mesh(buttonGeometry, this.materials.pushButtonTop.clone());
    buttonMesh.position.z = 1;
    bodyMesh.add(buttonMesh);
    
    // Inner ring
    const ringGeometry = new THREE.RingGeometry(buttonRadius * 0.7, buttonRadius * 0.85, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x880000, 
      transparent: true, 
      opacity: 0.5 
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.position.z = 1.1;
    bodyMesh.add(ringMesh);
    
    return { bodyMesh };
  }

  /**
   * Create an IC chip component (for task/action nodes)
   */
  private createICChip(step: StepGeometryData): THREE.Mesh {
    const width = step.size.width * 0.85;
    const height = step.size.height * 0.7;
    
    // Main chip body
    const bodyGeometry = new THREE.BufferGeometry();
    const vertices = this.createRoundedRectVertices(
      -width / 2, -height / 2,
      width, height,
      4
    );
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.componentBody.clone());
    
    // Orientation notch (semicircle on left side)
    const notchRadius = CIRCUIT_DIMENSIONS.icChipNotchSize;
    const notchGeometry = new THREE.CircleGeometry(notchRadius, 16, Math.PI / 2, Math.PI);
    const notchMesh = new THREE.Mesh(notchGeometry, this.materials.icNotch);
    notchMesh.position.set(-width / 2, 0, 0.5);
    bodyMesh.add(notchMesh);
    
    // Pin 1 indicator (small dot)
    const pin1Geometry = new THREE.CircleGeometry(3, 8);
    const pin1Material = new THREE.MeshBasicMaterial({ color: 0x555555 });
    const pin1Mesh = new THREE.Mesh(pin1Geometry, pin1Material);
    pin1Mesh.position.set(-width / 2 + 12, height / 2 - 12, 0.5);
    bodyMesh.add(pin1Mesh);
    
    // Add subtle surface texture lines
    const linesMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
    for (let i = 0; i < 3; i++) {
      const y = -height / 4 + (i * height / 4);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-width / 2 + 20, y, 0.5),
        new THREE.Vector3(width / 2 - 10, y, 0.5),
      ]);
      const line = new THREE.Line(lineGeometry, linesMaterial);
      bodyMesh.add(line);
    }
    
    return bodyMesh;
  }

  /**
   * Create an LED component (for end/output nodes)
   */
  private createLED(step: StepGeometryData): { bodyMesh: THREE.Mesh; glowMesh: THREE.Mesh } {
    const radius = Math.min(step.size.width, step.size.height) * 0.3;
    
    // LED body (dome shape represented as circle)
    const bodyGeometry = new THREE.CircleGeometry(radius, 32);
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.ledOn.clone());
    
    // Inner bright spot
    const spotGeometry = new THREE.CircleGeometry(radius * 0.4, 16);
    const spotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const spotMesh = new THREE.Mesh(spotGeometry, spotMaterial);
    spotMesh.position.set(-radius * 0.2, radius * 0.2, 0.5);
    bodyMesh.add(spotMesh);
    
    // LED base/rim
    const rimGeometry = new THREE.RingGeometry(radius, radius * 1.15, 32);
    const rimMaterial = new THREE.MeshBasicMaterial({ color: 0x404040 });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    rimMesh.position.z = -0.1;
    bodyMesh.add(rimMesh);
    
    // Glow effect
    const glowGeometry = new THREE.CircleGeometry(radius * 2, 32);
    const glowMesh = new THREE.Mesh(glowGeometry, this.materials.ledGlow.clone());
    glowMesh.position.z = -0.5;
    
    return { bodyMesh, glowMesh };
  }

  /**
   * Create connection pins for a component
   */
  private createPins(step: StepGeometryData, pinMeshes: THREE.Mesh[], group: THREE.Group): void {
    const halfWidth = step.size.width / 2;
    const halfHeight = step.size.height / 2;
    
    // Input pins (left side)
    step.inputPorts.forEach((port, index) => {
      const y = this.calculatePinY(index, step.inputPorts.length, step.size.height);
      const pinMesh = new THREE.Mesh(this.pinGeometry, this.materials.pin.clone());
      pinMesh.position.set(-halfWidth - CIRCUIT_DIMENSIONS.pinRadius, y - halfHeight, 0.5);
      pinMesh.name = `pin_input_${port.id}`;
      pinMeshes.push(pinMesh);
      group.add(pinMesh);
      
      // Pin leg (line from component to pin)
      const legGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfWidth * 0.85, y - halfHeight, 0.3),
        new THREE.Vector3(-halfWidth - CIRCUIT_DIMENSIONS.pinRadius, y - halfHeight, 0.3),
      ]);
      const legMaterial = new THREE.LineBasicMaterial({ color: CIRCUIT_COLORS.componentPin, linewidth: 2 });
      const leg = new THREE.Line(legGeometry, legMaterial);
      group.add(leg);
    });
    
    // Output pins (right side)
    step.outputPorts.forEach((port, index) => {
      const y = this.calculatePinY(index, step.outputPorts.length, step.size.height);
      const pinMesh = new THREE.Mesh(this.pinGeometry, this.materials.pin.clone());
      pinMesh.position.set(halfWidth + CIRCUIT_DIMENSIONS.pinRadius, y - halfHeight, 0.5);
      pinMesh.name = `pin_output_${port.id}`;
      pinMeshes.push(pinMesh);
      group.add(pinMesh);
      
      // Pin leg
      const legGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(halfWidth * 0.85, y - halfHeight, 0.3),
        new THREE.Vector3(halfWidth + CIRCUIT_DIMENSIONS.pinRadius, y - halfHeight, 0.3),
      ]);
      const legMaterial = new THREE.LineBasicMaterial({ color: CIRCUIT_COLORS.componentPin, linewidth: 2 });
      const leg = new THREE.Line(legGeometry, legMaterial);
      group.add(leg);
    });
  }

  /**
   * Calculate pin Y position
   */
  private calculatePinY(index: number, total: number, height: number): number {
    if (total === 1) return height / 2;
    const spacing = height / (total + 1);
    return spacing * (index + 1);
  }

  /**
   * Update an existing component
   */
  private updateComponent(component: ComponentMesh, step: StepGeometryData, elementType: CircuitElementType): void {
    // Update position (negate Y for Three.js coordinate system)
    const centerX = step.position.x + step.size.width / 2;
    const centerY = -(step.position.y + step.size.height / 2);
    component.group.position.set(centerX, centerY, 0);
    
    // Update visual state based on selection/hover
    this.updateComponentState(component, step.selected, step.hasError, step.hasWarning);
  }

  /**
   * Update component visual state
   */
  private updateComponentState(
    component: ComponentMesh, 
    selected: boolean, 
    hasError: boolean,
    hasWarning: boolean
  ): void {
    const bodyMaterial = component.bodyMesh.material as THREE.MeshBasicMaterial;
    
    if (component.isGrabbed) {
      bodyMaterial.color.setHex(CIRCUIT_COLORS.componentBodyGrabbed);
      component.group.position.z = 5; // Lift when grabbed
    } else if (selected) {
      bodyMaterial.color.setHex(CIRCUIT_COLORS.componentBodySelected);
      component.group.position.z = 2;
    } else if (component.isHovered) {
      bodyMaterial.color.setHex(CIRCUIT_COLORS.componentBodyHover);
      component.group.position.z = 1;
    } else {
      bodyMaterial.color.setHex(CIRCUIT_COLORS.componentBody);
      component.group.position.z = 0;
    }
    
    // Error/warning glow
    if (component.glowMesh) {
      const glowMaterial = component.glowMesh.material as THREE.MeshBasicMaterial;
      if (hasError) {
        glowMaterial.color.setHex(0xff0000);
        glowMaterial.opacity = 0.6;
        component.glowMesh.visible = true;
      } else if (hasWarning) {
        glowMaterial.color.setHex(0xffaa00);
        glowMaterial.opacity = 0.4;
        component.glowMesh.visible = true;
      } else if (component.elementType === 'led') {
        glowMaterial.color.setHex(CIRCUIT_COLORS.ledGlow);
        glowMaterial.opacity = 0.4;
        component.glowMesh.visible = true;
      } else {
        component.glowMesh.visible = false;
      }
    }
  }

  /**
   * Set hover state for a component
   */
  setHovered(stepId: string, hovered: boolean): void {
    const component = this.components.get(stepId);
    if (component) {
      component.isHovered = hovered;
      this.updateComponentState(component, false, false, false);
    }
  }

  /**
   * Set grabbed state for a component
   */
  setGrabbed(stepId: string, grabbed: boolean): void {
    const component = this.components.get(stepId);
    if (component) {
      component.isGrabbed = grabbed;
      this.updateComponentState(component, false, false, false);
    }
  }

  /**
   * Set pin hover state
   */
  setPinHovered(stepId: string, portId: string, hovered: boolean): void {
    const component = this.components.get(stepId);
    if (component) {
      const pin = component.pinMeshes.find(p => p.name.includes(portId));
      if (pin) {
        const material = pin.material as THREE.MeshBasicMaterial;
        material.color.setHex(hovered ? CIRCUIT_COLORS.componentPinHover : CIRCUIT_COLORS.componentPin);
        pin.scale.setScalar(hovered ? 1.3 : 1);
      }
    }
  }

  /**
   * Create rounded rectangle vertices
   */
  private createRoundedRectVertices(
    x: number, y: number, 
    width: number, height: number, 
    radius: number
  ): number[] {
    const vertices: number[] = [];
    
    // Create triangles for a rounded rectangle
    const cx = x + width / 2;
    const cy = y + height / 2;
    
    // Simplified: just create a regular rectangle with slight corner cuts
    const corners = [
      { x: x + radius, y: y },
      { x: x + width - radius, y: y },
      { x: x + width, y: y + radius },
      { x: x + width, y: y + height - radius },
      { x: x + width - radius, y: y + height },
      { x: x + radius, y: y + height },
      { x: x, y: y + height - radius },
      { x: x, y: y + radius },
    ];
    
    // Create triangles from center to edges
    for (let i = 0; i < corners.length; i++) {
      const next = (i + 1) % corners.length;
      vertices.push(
        cx, cy, 0,
        corners[i].x, corners[i].y, 0,
        corners[next].x, corners[next].y, 0
      );
    }
    
    return vertices;
  }

  /**
   * Dispose of a single component
   */
  private disposeComponent(component: ComponentMesh): void {
    component.bodyMesh.geometry.dispose();
    (component.bodyMesh.material as THREE.Material).dispose();
    component.pinMeshes.forEach(pin => {
      (pin.material as THREE.Material).dispose();
    });
    if (component.glowMesh) {
      component.glowMesh.geometry.dispose();
      (component.glowMesh.material as THREE.Material).dispose();
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    for (const component of this.components.values()) {
      this.componentsGroup.remove(component.group);
      this.disposeComponent(component);
    }
    this.components.clear();
    
    this.pinGeometry.dispose();
    this.pinConnectedGeometry.dispose();
    
    Object.values(this.materials).forEach(m => m.dispose());
    
    this.scene.remove(this.componentsGroup);
  }
}
