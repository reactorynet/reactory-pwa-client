/**
 * CircuitComponentRenderer - Renders workflow steps as electronic circuit components
 *
 * Draws components like push buttons, IC chips, LEDs, transistors, relays,
 * DIP switches, seven-segment displays, resistors, and capacitors to give the
 * workflow designer an electrical circuit board aesthetic.
 */

import * as THREE from 'three';
import {
  CIRCUIT_COLORS,
  CIRCUIT_DIMENSIONS,
  getCircuitElement,
  calculateComponentBodyDimensions,
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
  defaultBodyColor: number;
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
    transistorAccent: THREE.MeshBasicMaterial;
    relayCoil: THREE.MeshBasicMaterial;
    relayContact: THREE.MeshBasicMaterial;
    dipSwitchToggle: THREE.MeshBasicMaterial;
    dipSwitchToggleOn: THREE.MeshBasicMaterial;
    sevenSegActive: THREE.MeshBasicMaterial;
    sevenSegInactive: THREE.MeshBasicMaterial;
    resistorBody: THREE.MeshBasicMaterial;
    capacitorBody: THREE.MeshBasicMaterial;
    capacitorBand: THREE.MeshBasicMaterial;
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
      transistorAccent: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.transistorAccent }),
      relayCoil: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.relayCoil }),
      relayContact: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.relayContact }),
      dipSwitchToggle: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.dipSwitchToggle }),
      dipSwitchToggleOn: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.dipSwitchToggleOn }),
      sevenSegActive: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.sevenSegActive }),
      sevenSegInactive: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.sevenSegInactive }),
      resistorBody: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.resistorBody }),
      capacitorBody: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.capacitorBody }),
      capacitorBand: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.capacitorBand }),
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
      const mapping = getCircuitElement(step.stepType);
      const elementType = mapping.circuitElement;

      if (existing) {
        this.updateComponent(existing, step, elementType);
      } else {
        const component = this.createComponent(step, elementType, mapping.defaultColor);
        this.components.set(step.id, component);
        this.componentsGroup.add(component.group);
      }
    });
  }

  /**
   * Create a circuit component based on element type
   */
  private createComponent(step: StepGeometryData, elementType: CircuitElementType, stripeColor?: number): ComponentMesh {
    const group = new THREE.Group();
    group.name = `component_${step.id}`;

    let bodyMesh: THREE.Mesh;
    let glowMesh: THREE.Mesh | undefined;
    let defaultBodyColor = CIRCUIT_COLORS.componentBody;
    const pinMeshes: THREE.Mesh[] = [];

    switch (elementType) {
      case 'pushButton':
        ({ bodyMesh, glowMesh } = this.createPushButton(step));
        break;
      case 'led':
        ({ bodyMesh, glowMesh } = this.createLED(step));
        break;
      case 'transistor':
        bodyMesh = this.createTransistor(step);
        break;
      case 'relay':
        bodyMesh = this.createRelay(step);
        break;
      case 'dipSwitch':
        bodyMesh = this.createDIPSwitch(step);
        break;
      case 'sevenSegment':
        ({ bodyMesh, glowMesh } = this.createSevenSegment(step));
        break;
      case 'resistor':
        bodyMesh = this.createResistor(step);
        defaultBodyColor = CIRCUIT_COLORS.resistorBody;
        break;
      case 'capacitor':
        bodyMesh = this.createCapacitor(step);
        defaultBodyColor = CIRCUIT_COLORS.capacitorBody;
        break;
      case 'icChip':
      default:
        if (stripeColor !== undefined) {
          bodyMesh = this.createStripedIC(step, stripeColor);
        } else {
          bodyMesh = this.createICChip(step);
        }
        break;
    }

    group.add(bodyMesh);
    if (glowMesh) {
      group.add(glowMesh);
    }

    // Create pins with element-type-aware positioning
    this.createPins(step, pinMeshes, group, elementType);

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
      defaultBodyColor,
      isHovered: false,
      isGrabbed: false,
    };
  }

  // ─── Existing Components ─────────────────────────────────────────────

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

    this.addICChipDetails(bodyMesh, width, height);

    return bodyMesh;
  }

  /**
   * Add standard IC chip details (notch, pin-1 dot, texture lines)
   */
  private addICChipDetails(bodyMesh: THREE.Mesh, width: number, height: number): void {
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

  // ─── New Components ──────────────────────────────────────────────────

  /**
   * Create a transistor component (for condition/decision nodes)
   * Diamond shape with orange accent — represents branching logic.
   */
  private createTransistor(step: StepGeometryData): THREE.Mesh {
    const size = Math.min(step.size.width, step.size.height) * 0.65;
    const hw = size * 0.7; // half-width of diamond
    const hh = size * 0.7; // half-height of diamond

    // Diamond body — 4 triangles from center to each edge
    const bodyGeometry = new THREE.BufferGeometry();
    const vertices = [
      // Top triangle (center to top-right edge)
      0, 0, 0,   hw, 0, 0,   0, hh, 0,
      // Right triangle (center to bottom-right edge)
      0, 0, 0,   0, -hh, 0,  hw, 0, 0,
      // Bottom triangle (center to bottom-left edge)
      0, 0, 0,   -hw, 0, 0,  0, -hh, 0,
      // Left triangle (center to top-left edge)
      0, 0, 0,   0, hh, 0,   -hw, 0, 0,
    ];
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.componentBody.clone());

    // Orange horizontal accent line through center
    const accentGeometry = new THREE.BufferGeometry();
    const stripeH = hh * 0.15;
    const accentVerts = [
      -hw * 0.6, -stripeH, 0.5,   hw * 0.6, -stripeH, 0.5,   hw * 0.6, stripeH, 0.5,
      -hw * 0.6, -stripeH, 0.5,   hw * 0.6, stripeH, 0.5,    -hw * 0.6, stripeH, 0.5,
    ];
    accentGeometry.setAttribute('position', new THREE.Float32BufferAttribute(accentVerts, 3));
    const accentMesh = new THREE.Mesh(accentGeometry, this.materials.transistorAccent.clone());
    bodyMesh.add(accentMesh);

    // Small arrow indicator (right side, pointing right — emitter arrow)
    const arrowSize = hw * 0.25;
    const arrowGeometry = new THREE.BufferGeometry();
    const ax = hw * 0.35;
    const arrowVerts = [
      ax, 0, 0.5,
      ax - arrowSize, arrowSize * 0.5, 0.5,
      ax - arrowSize, -arrowSize * 0.5, 0.5,
    ];
    arrowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(arrowVerts, 3));
    const arrowMesh = new THREE.Mesh(arrowGeometry, this.materials.transistorAccent.clone());
    bodyMesh.add(arrowMesh);

    // Circle outline around diamond (transistor can outline)
    const circleRadius = Math.max(hw, hh) * 1.05;
    const ringGeometry = new THREE.RingGeometry(circleRadius - 1.5, circleRadius, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.position.z = -0.1;
    bodyMesh.add(ringMesh);

    return bodyMesh;
  }

  /**
   * Create a relay component (for parallel/join flow control nodes)
   * Rectangular body with coil symbol on one side and contact lines on the other.
   */
  private createRelay(step: StepGeometryData): THREE.Mesh {
    const width = step.size.width * 0.85;
    const height = step.size.height * 0.7;

    // Main body
    const bodyGeometry = new THREE.BufferGeometry();
    const bodyVerts = this.createRoundedRectVertices(-width / 2, -height / 2, width, height, 4);
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyVerts, 3));
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.componentBody.clone());

    // Determine if this is a join (coil on right) or parallel/split (coil on left)
    const isJoin = step.stepType.toLowerCase().includes('join');
    const coilSide = isJoin ? 1 : -1; // 1=right, -1=left

    // Vertical divider line
    const dividerMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const divX = coilSide * (-width * 0.15);
    const dividerGeometry = new THREE.BufferGeometry();
    const dh = height * 0.35;
    const dw = 1;
    const divVerts = [
      divX - dw, -dh, 0.5,  divX + dw, -dh, 0.5,  divX + dw, dh, 0.5,
      divX - dw, -dh, 0.5,  divX + dw, dh, 0.5,    divX - dw, dh, 0.5,
    ];
    dividerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(divVerts, 3));
    const dividerMesh = new THREE.Mesh(dividerGeometry, dividerMaterial);
    bodyMesh.add(dividerMesh);

    // Coil zigzag (on the coil side) — using thin rectangles for visibility
    const coilX = coilSide * (width * 0.25);
    const coilMaterial = this.materials.relayCoil.clone();
    const segments = 5;
    const segHeight = (height * 0.5) / segments;
    const segWidth = width * 0.12;
    const lineThickness = 2;

    for (let i = 0; i < segments; i++) {
      const y0 = -height * 0.25 + i * segHeight;
      const y1 = y0 + segHeight;
      const xOff = (i % 2 === 0) ? -segWidth / 2 : segWidth / 2;
      const xOff2 = (i % 2 === 0) ? segWidth / 2 : -segWidth / 2;

      // Diagonal line segment as thin quad
      const dx = xOff2 - xOff;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len * lineThickness;
      const ny = dx / len * lineThickness;

      const segGeometry = new THREE.BufferGeometry();
      const sx = coilX + xOff;
      const sx2 = coilX + xOff2;
      const segVerts = [
        sx - nx, y0 - ny, 0.5,   sx2 - nx, y1 - ny, 0.5,   sx2 + nx, y1 + ny, 0.5,
        sx - nx, y0 - ny, 0.5,   sx2 + nx, y1 + ny, 0.5,   sx + nx, y0 + ny, 0.5,
      ];
      segGeometry.setAttribute('position', new THREE.Float32BufferAttribute(segVerts, 3));
      const segMesh = new THREE.Mesh(segGeometry, coilMaterial);
      bodyMesh.add(segMesh);
    }

    // Contact lines (on the opposite side) — two short horizontal bars with gap
    const contactX = -coilSide * (width * 0.25);
    const contactMaterial = this.materials.relayContact.clone();
    const barWidth = width * 0.18;
    const barThickness = 2.5;
    const contactGap = height * 0.12;

    for (const yOff of [-contactGap, contactGap]) {
      const barGeometry = new THREE.BufferGeometry();
      const bx = contactX - barWidth / 2;
      const by = yOff - barThickness;
      const barVerts = this.createRoundedRectVertices(bx, by, barWidth, barThickness * 2, 1);
      barGeometry.setAttribute('position', new THREE.Float32BufferAttribute(barVerts, 3));
      const barMesh = new THREE.Mesh(barGeometry, contactMaterial);
      barMesh.position.z = 0.5;
      bodyMesh.add(barMesh);
    }

    // Small circle at contact center (pivot point)
    const pivotGeometry = new THREE.CircleGeometry(3, 12);
    const pivotMesh = new THREE.Mesh(pivotGeometry, contactMaterial);
    pivotMesh.position.set(contactX, 0, 0.5);
    bodyMesh.add(pivotMesh);

    return bodyMesh;
  }

  /**
   * Create a DIP switch component (for user activity/interaction nodes)
   * Rectangular body with toggle switch slots.
   */
  private createDIPSwitch(step: StepGeometryData): THREE.Mesh {
    const width = step.size.width * 0.85;
    const height = step.size.height * 0.7;

    // Main body
    const bodyGeometry = new THREE.BufferGeometry();
    const bodyVerts = this.createRoundedRectVertices(-width / 2, -height / 2, width, height, 4);
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyVerts, 3));
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.componentBody.clone());

    // Toggle switch slots
    const slotCount = CIRCUIT_DIMENSIONS.dipSwitchSlotCount;
    const slotWidth = 8;
    const slotHeight = height * 0.5;
    const totalSlotsWidth = slotCount * slotWidth + (slotCount - 1) * 6;
    const startX = -totalSlotsWidth / 2;
    const slotY = -height * 0.05;

    for (let i = 0; i < slotCount; i++) {
      const sx = startX + i * (slotWidth + 6);
      const isOn = i % 2 === 0; // Alternate on/off for visual variety

      // Slot housing (dark recessed area)
      const housingGeometry = new THREE.BufferGeometry();
      const housingVerts = this.createRoundedRectVertices(
        sx - 1, slotY - slotHeight / 2 - 1,
        slotWidth + 2, slotHeight + 2,
        1
      );
      housingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(housingVerts, 3));
      const housingMesh = new THREE.Mesh(housingGeometry, new THREE.MeshBasicMaterial({ color: 0x111111 }));
      housingMesh.position.z = 0.3;
      bodyMesh.add(housingMesh);

      // Toggle (positioned up or down)
      const toggleHeight = slotHeight * 0.45;
      const toggleY = isOn
        ? slotY + slotHeight / 2 - toggleHeight - 1
        : slotY - slotHeight / 2 + 1;
      const toggleGeometry = new THREE.BufferGeometry();
      const toggleVerts = this.createRoundedRectVertices(
        sx, toggleY,
        slotWidth, toggleHeight,
        1
      );
      toggleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(toggleVerts, 3));
      const toggleMaterial = isOn
        ? this.materials.dipSwitchToggleOn.clone()
        : this.materials.dipSwitchToggle.clone();
      const toggleMesh = new THREE.Mesh(toggleGeometry, toggleMaterial);
      toggleMesh.position.z = 0.5;
      bodyMesh.add(toggleMesh);
    }

    // Label reference line below switches
    const lineY = slotY - slotHeight / 2 - 6;
    const refLineGeometry = new THREE.BufferGeometry();
    const rlh = 0.5;
    const refVerts = [
      startX, lineY - rlh, 0.5,
      startX + totalSlotsWidth, lineY - rlh, 0.5,
      startX + totalSlotsWidth, lineY + rlh, 0.5,
      startX, lineY - rlh, 0.5,
      startX + totalSlotsWidth, lineY + rlh, 0.5,
      startX, lineY + rlh, 0.5,
    ];
    refLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(refVerts, 3));
    const refLineMesh = new THREE.Mesh(refLineGeometry, new THREE.MeshBasicMaterial({ color: 0x444444 }));
    bodyMesh.add(refLineMesh);

    return bodyMesh;
  }

  /**
   * Create a seven-segment display component (for telemetry/observability nodes)
   * Rectangular housing with green seven-segment digit patterns.
   */
  private createSevenSegment(step: StepGeometryData): { bodyMesh: THREE.Mesh; glowMesh: THREE.Mesh } {
    const width = step.size.width * 0.85;
    const height = step.size.height * 0.7;

    // Main housing body
    const bodyGeometry = new THREE.BufferGeometry();
    const bodyVerts = this.createRoundedRectVertices(-width / 2, -height / 2, width, height, 4);
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyVerts, 3));
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.componentBody.clone());

    // Display window (slightly inset, dark green tint)
    const windowW = width * 0.7;
    const windowH = height * 0.6;
    const windowGeometry = new THREE.BufferGeometry();
    const windowVerts = this.createRoundedRectVertices(-windowW / 2, -windowH / 2, windowW, windowH, 2);
    windowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(windowVerts, 3));
    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x0a1a0a });
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    windowMesh.position.z = 0.3;
    bodyMesh.add(windowMesh);

    // Draw two "8" digit patterns
    const digitW = CIRCUIT_DIMENSIONS.sevenSegDigitWidth;
    const digitH = CIRCUIT_DIMENSIONS.sevenSegDigitHeight;
    const digitSpacing = digitW * 1.8;
    const digitsStartX = -digitSpacing / 2;

    for (let d = 0; d < 2; d++) {
      const dx = digitsStartX + d * digitSpacing;
      // Active segments: digit 0 shows "8" (all on), digit 1 shows "8" (all on)
      // This creates the classic "88" display pattern
      this.createSevenSegDigit(bodyMesh, dx, 0, digitW, digitH, true);
    }

    // Decimal point
    const dotGeometry = new THREE.CircleGeometry(2, 8);
    const dotMesh = new THREE.Mesh(dotGeometry, this.materials.sevenSegActive.clone());
    dotMesh.position.set(digitsStartX + digitSpacing + digitW / 2 + 4, -digitH / 2, 0.6);
    bodyMesh.add(dotMesh);

    // Green glow behind display
    const glowGeometry = new THREE.BufferGeometry();
    const glowVerts = this.createRoundedRectVertices(-windowW / 2, -windowH / 2, windowW, windowH, 2);
    glowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(glowVerts, 3));
    const glowMesh = new THREE.Mesh(glowGeometry, new THREE.MeshBasicMaterial({
      color: CIRCUIT_COLORS.sevenSegActive,
      transparent: true,
      opacity: 0.15,
    }));
    glowMesh.position.z = -0.5;

    return { bodyMesh, glowMesh };
  }

  /**
   * Draw a single seven-segment digit at position (cx, cy)
   * Segments: top, top-right, bottom-right, bottom, bottom-left, top-left, middle
   */
  private createSevenSegDigit(
    parent: THREE.Mesh, cx: number, cy: number,
    w: number, h: number, allOn: boolean
  ): void {
    const segThick = 2.5;
    const halfH = h / 2;
    const halfW = w / 2;
    const gap = 1; // gap between segments at corners
    const z = 0.6;

    // Each segment: [x1, y1, x2, y2] endpoints (horizontal or vertical)
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number; horizontal: boolean }> = [
      // Top
      { x1: cx - halfW + gap, y1: cy + halfH, x2: cx + halfW - gap, y2: cy + halfH, horizontal: true },
      // Top-right
      { x1: cx + halfW, y1: cy + gap, x2: cx + halfW, y2: cy + halfH - gap, horizontal: false },
      // Bottom-right
      { x1: cx + halfW, y1: cy - halfH + gap, x2: cx + halfW, y2: cy - gap, horizontal: false },
      // Bottom
      { x1: cx - halfW + gap, y1: cy - halfH, x2: cx + halfW - gap, y2: cy - halfH, horizontal: true },
      // Bottom-left
      { x1: cx - halfW, y1: cy - halfH + gap, x2: cx - halfW, y2: cy - gap, horizontal: false },
      // Top-left
      { x1: cx - halfW, y1: cy + gap, x2: cx - halfW, y2: cy + halfH - gap, horizontal: false },
      // Middle
      { x1: cx - halfW + gap, y1: cy, x2: cx + halfW - gap, y2: cy, horizontal: true },
    ];

    segments.forEach(seg => {
      const material = allOn
        ? this.materials.sevenSegActive.clone()
        : this.materials.sevenSegInactive.clone();

      const segGeometry = new THREE.BufferGeometry();
      let verts: number[];

      if (seg.horizontal) {
        verts = [
          seg.x1, seg.y1 - segThick, z,  seg.x2, seg.y1 - segThick, z,  seg.x2, seg.y1 + segThick, z,
          seg.x1, seg.y1 - segThick, z,  seg.x2, seg.y1 + segThick, z,  seg.x1, seg.y1 + segThick, z,
        ];
      } else {
        verts = [
          seg.x1 - segThick, seg.y1, z,  seg.x1 + segThick, seg.y1, z,  seg.x2 + segThick, seg.y2, z,
          seg.x1 - segThick, seg.y1, z,  seg.x2 + segThick, seg.y2, z,  seg.x2 - segThick, seg.y2, z,
        ];
      }

      segGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      const segMesh = new THREE.Mesh(segGeometry, material);
      parent.add(segMesh);
    });
  }

  /**
   * Create a striped IC chip (for integration nodes: REST, GraphQL, gRPC, ServiceInvoke)
   * Same as standard IC but with a colored accent stripe at the top.
   */
  private createStripedIC(step: StepGeometryData, stripeColor: number): THREE.Mesh {
    const width = step.size.width * 0.85;
    const height = step.size.height * 0.7;

    // Base IC body (same as standard)
    const bodyGeometry = new THREE.BufferGeometry();
    const vertices = this.createRoundedRectVertices(-width / 2, -height / 2, width, height, 4);
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.componentBody.clone());

    this.addICChipDetails(bodyMesh, width, height);

    // Colored stripe at the top of the IC
    const stripeH = CIRCUIT_DIMENSIONS.icStripeHeight;
    const stripeGeometry = new THREE.BufferGeometry();
    const stripeVerts = this.createRoundedRectVertices(
      -width / 2 + 2, height / 2 - stripeH - 2,
      width - 4, stripeH,
      1
    );
    stripeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stripeVerts, 3));
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: stripeColor });
    const stripeMesh = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripeMesh.position.z = 0.6;
    bodyMesh.add(stripeMesh);

    // Small colored dot near pin-1 position for extra identification
    const dotGeometry = new THREE.CircleGeometry(3, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: stripeColor });
    const dotMesh = new THREE.Mesh(dotGeometry, dotMaterial);
    dotMesh.position.set(-width / 2 + 12, height / 2 - stripeH - 10, 0.6);
    bodyMesh.add(dotMesh);

    return bodyMesh;
  }

  /**
   * Create a resistor component (for filter/transform nodes)
   * Small rectangular body with color bands.
   */
  private createResistor(step: StepGeometryData): THREE.Mesh {
    const width = step.size.width * 0.7;
    const height = step.size.height * 0.4;

    // Tan/beige body
    const bodyGeometry = new THREE.BufferGeometry();
    const bodyVerts = this.createRoundedRectVertices(-width / 2, -height / 2, width, height, 6);
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyVerts, 3));
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.resistorBody.clone());

    // Color bands (classic 4-band: brown, black, red, gold)
    const bandColors = [0x8B4513, 0x000000, 0xff0000, 0xffd700];
    const bandWidth = 5;
    const bandSpacing = width / (bandColors.length + 2);

    bandColors.forEach((color, i) => {
      const bx = -width / 2 + bandSpacing * (i + 1) + (i >= 3 ? bandSpacing * 0.5 : 0);
      const bandGeometry = new THREE.BufferGeometry();
      const bandVerts = this.createRoundedRectVertices(
        bx - bandWidth / 2, -height / 2 + 2,
        bandWidth, height - 4,
        1
      );
      bandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bandVerts, 3));
      const bandMesh = new THREE.Mesh(bandGeometry, new THREE.MeshBasicMaterial({ color }));
      bandMesh.position.z = 0.5;
      bodyMesh.add(bandMesh);
    });

    return bodyMesh;
  }

  /**
   * Create a capacitor component (for delay/timer nodes)
   * Circular body with polarity marking.
   */
  private createCapacitor(step: StepGeometryData): THREE.Mesh {
    const radius = Math.min(step.size.width, step.size.height) * 0.3;

    // Circular body
    const bodyGeometry = new THREE.CircleGeometry(radius, 32);
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.capacitorBody.clone());

    // Polarity band (silver arc on one side)
    const bandGeometry = new THREE.RingGeometry(radius * 0.75, radius * 0.95, 32, 1, -Math.PI / 3, Math.PI * 2 / 3);
    const bandMesh = new THREE.Mesh(bandGeometry, this.materials.capacitorBand.clone());
    bandMesh.position.z = 0.3;
    bodyMesh.add(bandMesh);

    // "+" symbol (two perpendicular lines as thin quads)
    const plusSize = radius * 0.25;
    const plusThick = 1.5;
    const plusX = -radius * 0.35;
    const plusY = radius * 0.35;
    const plusMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });

    // Horizontal bar
    const hBarGeometry = new THREE.BufferGeometry();
    const hBarVerts = [
      plusX - plusSize, plusY - plusThick, 0.5,
      plusX + plusSize, plusY - plusThick, 0.5,
      plusX + plusSize, plusY + plusThick, 0.5,
      plusX - plusSize, plusY - plusThick, 0.5,
      plusX + plusSize, plusY + plusThick, 0.5,
      plusX - plusSize, plusY + plusThick, 0.5,
    ];
    hBarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(hBarVerts, 3));
    bodyMesh.add(new THREE.Mesh(hBarGeometry, plusMaterial));

    // Vertical bar
    const vBarGeometry = new THREE.BufferGeometry();
    const vBarVerts = [
      plusX - plusThick, plusY - plusSize, 0.5,
      plusX + plusThick, plusY - plusSize, 0.5,
      plusX + plusThick, plusY + plusSize, 0.5,
      plusX - plusThick, plusY - plusSize, 0.5,
      plusX + plusThick, plusY + plusSize, 0.5,
      plusX - plusThick, plusY + plusSize, 0.5,
    ];
    vBarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vBarVerts, 3));
    bodyMesh.add(new THREE.Mesh(vBarGeometry, plusMaterial));

    // Outer rim
    const rimGeometry = new THREE.RingGeometry(radius, radius * 1.08, 32);
    const rimMesh = new THREE.Mesh(rimGeometry, new THREE.MeshBasicMaterial({ color: 0x404040 }));
    rimMesh.position.z = -0.1;
    bodyMesh.add(rimMesh);

    return bodyMesh;
  }

  // ─── Shared Utilities ────────────────────────────────────────────────

  /**
   * Calculate the actual body dimensions for each component type.
   * Delegates to the shared function in CircuitTheme to stay in sync with useWebGLCanvas.
   */
  private getComponentBodyDimensions(step: StepGeometryData, elementType: CircuitElementType): { bodyHalfWidth: number; bodyHalfHeight: number } {
    return calculateComponentBodyDimensions(step.size.width, step.size.height, elementType);
  }

  /**
   * Create connection pins for a component
   */
  private createPins(step: StepGeometryData, pinMeshes: THREE.Mesh[], group: THREE.Group, elementType: CircuitElementType): void {
    // Get actual component body dimensions for proper pin placement
    const { bodyHalfWidth, bodyHalfHeight } = this.getComponentBodyDimensions(step, elementType);

    // Small gap between component edge and pin
    const pinGap = 4;
    const pinOffset = bodyHalfWidth + pinGap + CIRCUIT_DIMENSIONS.pinRadius;

    // Input pins (left side)
    step.inputPorts.forEach((port, index) => {
      const y = this.calculatePinY(index, step.inputPorts.length, bodyHalfHeight * 2);
      const pinMesh = new THREE.Mesh(this.pinGeometry, this.materials.pin.clone());
      pinMesh.position.set(-pinOffset, y - bodyHalfHeight, 0.5);
      pinMesh.name = `pin_input_${port.id}`;
      pinMeshes.push(pinMesh);
      group.add(pinMesh);

      // Pin leg (line from component edge to pin)
      const legGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-bodyHalfWidth, y - bodyHalfHeight, 0.3),
        new THREE.Vector3(-pinOffset, y - bodyHalfHeight, 0.3),
      ]);
      const legMaterial = new THREE.LineBasicMaterial({ color: CIRCUIT_COLORS.componentPin, linewidth: 2 });
      const leg = new THREE.Line(legGeometry, legMaterial);
      group.add(leg);
    });

    // Output pins (right side)
    step.outputPorts.forEach((port, index) => {
      const y = this.calculatePinY(index, step.outputPorts.length, bodyHalfHeight * 2);
      const pinMesh = new THREE.Mesh(this.pinGeometry, this.materials.pin.clone());
      pinMesh.position.set(pinOffset, y - bodyHalfHeight, 0.5);
      pinMesh.name = `pin_output_${port.id}`;
      pinMeshes.push(pinMesh);
      group.add(pinMesh);

      // Pin leg
      const legGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(bodyHalfWidth, y - bodyHalfHeight, 0.3),
        new THREE.Vector3(pinOffset, y - bodyHalfHeight, 0.3),
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
      bodyMaterial.color.setHex(component.defaultBodyColor);
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
      } else if (component.elementType === 'sevenSegment') {
        glowMaterial.color.setHex(CIRCUIT_COLORS.sevenSegActive);
        glowMaterial.opacity = 0.15;
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
