/**
 * CircuitLabelRenderer - Circuit board style labels with detail popups
 * 
 * Renders compact component designators (like U1, S2, LED3) positioned
 * near components, with a detail popup that appears on hover/click.
 */

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { 
  CIRCUIT_CSS, 
  getCircuitElement, 
  generateComponentLabel 
} from './CircuitTheme';
import type { Point } from '../../types';

export interface CircuitLabelOptions {
  /** Component name/title */
  name: string;
  /** Component type (for circuit element mapping) */
  type: string;
  /** Component index (for label generation) */
  index: number;
  /** Whether the component is selected */
  selected?: boolean;
  /** Whether the component has an error */
  hasError?: boolean;
  /** Whether the component has a warning */
  hasWarning?: boolean;
  /** Input port names */
  inputPorts?: string[];
  /** Output port names */
  outputPorts?: string[];
  /** Additional description */
  description?: string;
}

interface LabelData {
  id: string;
  options: CircuitLabelOptions;
  position: Point;
  labelObject: CSS2DObject;
  popupObject: CSS2DObject;
  labelElement: HTMLDivElement;
  popupElement: HTMLDivElement;
  isHovered: boolean;
  isPopupVisible: boolean;
}

export class CircuitLabelRenderer {
  private scene: THREE.Scene | null = null;
  private css2dRenderer: CSS2DRenderer | null = null;
  private readonly labelsGroup: THREE.Group;
  private readonly labels: Map<string, LabelData> = new Map();
  private currentZoom = 1;
  private container: HTMLElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private activePopup: string | null = null;
  private isInteracting = false;
  private showLabelsTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = 'CircuitLabels';
  }

  /**
   * Transform a point to Three.js coordinate system (negate Y)
   */
  private toThreeCoords(point: Point): Point {
    return { x: point.x, y: -point.y };
  }

  /**
   * Initialize the renderer
   */
  initialize(
    scene: THREE.Scene,
    container: HTMLElement,
    camera: THREE.Camera
  ): void {
    this.scene = scene;
    this.container = container;
    
    // Create CSS2D renderer
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(container.clientWidth, container.clientHeight);
    this.css2dRenderer.domElement.style.position = 'absolute';
    this.css2dRenderer.domElement.style.top = '0';
    this.css2dRenderer.domElement.style.left = '0';
    this.css2dRenderer.domElement.style.pointerEvents = 'none';
    this.css2dRenderer.domElement.style.zIndex = '10';
    container.appendChild(this.css2dRenderer.domElement);
    
    // Inject CSS styles
    this.injectStyles();
    
    // Add labels group to scene
    this.scene.add(this.labelsGroup);
    
    // Setup event handling for popups
    this.setupEventHandling();
  }

  /**
   * Inject circuit CSS styles
   */
  private injectStyles(): void {
    if (this.styleElement) return;
    
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = CIRCUIT_CSS;
    document.head.appendChild(this.styleElement);
  }

  /**
   * Setup event handling for popup interactions
   */
  private setupEventHandling(): void {
    if (!this.container) return;
    
    // Close popup when clicking elsewhere
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.circuit-component-popup') && 
          !target.closest('.circuit-label-designator')) {
        this.hideAllPopups();
      }
    });
  }

  /**
   * Update or create a label for a component
   */
  updateLabel(
    id: string,
    position: Point,
    options: CircuitLabelOptions
  ): void {
    let labelData = this.labels.get(id);
    
    if (labelData) {
      // Update existing
      this.updateLabelContent(labelData, options);
      labelData.position = position;
      this.updateLabelPosition(labelData);
    } else {
      // Create new
      labelData = this.createLabel(id, position, options);
      this.labels.set(id, labelData);
      this.labelsGroup.add(labelData.labelObject);
      this.labelsGroup.add(labelData.popupObject);
    }
  }

  /**
   * Create a new label with popup
   */
  private createLabel(
    id: string,
    position: Point,
    options: CircuitLabelOptions
  ): LabelData {
    // Get circuit element info
    const circuitElement = getCircuitElement(options.type);
    const designator = generateComponentLabel(circuitElement.prefix, options.index);
    
    // Create label element (small designator)
    const labelElement = document.createElement('div');
    labelElement.className = 'circuit-label';
    labelElement.innerHTML = `<span class="circuit-label-designator">${designator}</span>`;
    
    // Create popup element (detail card)
    const popupElement = this.createPopupElement(options, designator);
    
    // Create CSS2D objects
    const labelObject = new CSS2DObject(labelElement);
    labelObject.name = `label_${id}`;
    
    const popupObject = new CSS2DObject(popupElement);
    popupObject.name = `popup_${id}`;
    popupObject.visible = false;
    
    // Transform position for Three.js coordinate system
    const threePos = this.toThreeCoords(position);
    
    // Position label below the component (in Three.js coords, "below" means more negative Y)
    labelObject.position.set(threePos.x, threePos.y - 50, 5);
    popupObject.position.set(threePos.x + 100, threePos.y, 10);
    
    // Add click handler to show popup
    labelElement.style.pointerEvents = 'auto';
    labelElement.style.cursor = 'pointer';
    labelElement.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePopup(id);
    });
    
    // Add hover handlers
    labelElement.addEventListener('mouseenter', () => {
      const label = this.labels.get(id);
      if (label) {
        label.isHovered = true;
        labelElement.style.transform = 'scale(1.1)';
      }
    });
    
    labelElement.addEventListener('mouseleave', () => {
      const label = this.labels.get(id);
      if (label) {
        label.isHovered = false;
        labelElement.style.transform = 'scale(1)';
      }
    });
    
    return {
      id,
      options,
      position,
      labelObject,
      popupObject,
      labelElement,
      popupElement,
      isHovered: false,
      isPopupVisible: false,
    };
  }

  /**
   * Create popup element with component details
   */
  private createPopupElement(options: CircuitLabelOptions, designator: string): HTMLDivElement {
    const popup = document.createElement('div');
    popup.className = 'circuit-component-popup';
    popup.style.pointerEvents = 'auto';
    
    const circuitElement = getCircuitElement(options.type);
    
    popup.innerHTML = `
      <div class="circuit-popup-header">
        <span class="circuit-popup-designator">${designator}</span>
        <span class="circuit-popup-title">${this.escapeHtml(options.name)}</span>
      </div>
      <div class="circuit-popup-type">${circuitElement.circuitElement} • ${options.type}</div>
      ${options.description ? `<div class="circuit-popup-body">${this.escapeHtml(options.description)}</div>` : ''}
      <div class="circuit-popup-pins">
        ${options.inputPorts && options.inputPorts.length > 0 ? `
          <div class="circuit-popup-pin-group">
            <div class="circuit-popup-pin-label">Inputs</div>
            ${options.inputPorts.map(port => `
              <div class="circuit-popup-pin">
                <span class="circuit-popup-pin-dot input"></span>
                ${this.escapeHtml(port)}
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${options.outputPorts && options.outputPorts.length > 0 ? `
          <div class="circuit-popup-pin-group">
            <div class="circuit-popup-pin-label">Outputs</div>
            ${options.outputPorts.map(port => `
              <div class="circuit-popup-pin">
                <span class="circuit-popup-pin-dot output"></span>
                ${this.escapeHtml(port)}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    
    // Prevent click from closing popup
    popup.addEventListener('click', (e) => e.stopPropagation());
    
    return popup;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update label content
   */
  private updateLabelContent(labelData: LabelData, options: CircuitLabelOptions): void {
    // Update designator if index changed
    if (options.index !== labelData.options.index) {
      const circuitElement = getCircuitElement(options.type);
      const designator = generateComponentLabel(circuitElement.prefix, options.index);
      const designatorSpan = labelData.labelElement.querySelector('.circuit-label-designator');
      if (designatorSpan) {
        designatorSpan.textContent = designator;
      }
    }
    
    // Update selection state
    if (options.selected) {
      labelData.labelElement.style.color = '#00bcd4';
    } else if (options.hasError) {
      labelData.labelElement.style.color = '#ff5252';
    } else if (options.hasWarning) {
      labelData.labelElement.style.color = '#ffab40';
    } else {
      labelData.labelElement.style.color = '#ffffff';
    }
    
    labelData.options = options;
  }

  /**
   * Update label position
   */
  private updateLabelPosition(labelData: LabelData): void {
    // Transform position for Three.js coordinate system
    const threePos = this.toThreeCoords(labelData.position);
    
    // Label below component (in Three.js coords)
    labelData.labelObject.position.set(
      threePos.x,
      threePos.y - 50,
      5
    );
    
    // Popup to the right of component
    labelData.popupObject.position.set(
      threePos.x + 120,
      threePos.y,
      10
    );
  }

  /**
   * Toggle popup visibility
   */
  togglePopup(id: string): void {
    const labelData = this.labels.get(id);
    if (!labelData) return;
    
    // Hide other popups first
    if (this.activePopup && this.activePopup !== id) {
      this.hidePopup(this.activePopup);
    }
    
    if (labelData.isPopupVisible) {
      this.hidePopup(id);
    } else {
      this.showPopup(id);
    }
  }

  /**
   * Show popup for a component
   */
  showPopup(id: string): void {
    const labelData = this.labels.get(id);
    if (!labelData) return;
    
    labelData.popupObject.visible = true;
    labelData.isPopupVisible = true;
    this.activePopup = id;
    
    // Animate in
    requestAnimationFrame(() => {
      labelData.popupElement.classList.add('visible');
    });
  }

  /**
   * Hide popup for a component
   */
  hidePopup(id: string): void {
    const labelData = this.labels.get(id);
    if (!labelData) return;
    
    labelData.popupElement.classList.remove('visible');
    
    // Hide after animation
    setTimeout(() => {
      if (!labelData.isPopupVisible) return; // May have been shown again
      labelData.popupObject.visible = false;
    }, 200);
    
    labelData.isPopupVisible = false;
    if (this.activePopup === id) {
      this.activePopup = null;
    }
  }

  /**
   * Hide all popups
   */
  hideAllPopups(): void {
    for (const id of this.labels.keys()) {
      this.hidePopup(id);
    }
  }

  /**
   * Remove a label
   */
  removeLabel(id: string): void {
    const labelData = this.labels.get(id);
    if (!labelData) return;
    
    this.labelsGroup.remove(labelData.labelObject);
    this.labelsGroup.remove(labelData.popupObject);
    labelData.labelElement.remove();
    labelData.popupElement.remove();
    this.labels.delete(id);
  }

  /**
   * Update zoom level
   */
  updateZoom(zoom: number): void {
    this.currentZoom = zoom;
    
    // Scale labels inversely with zoom to maintain readable size
    const scale = Math.max(0.5, Math.min(1.5, 1 / zoom));
    
    for (const labelData of this.labels.values()) {
      labelData.labelElement.style.transform = `scale(${scale})`;
      labelData.popupElement.style.transform = labelData.isPopupVisible 
        ? `scale(${scale})` 
        : `translateY(-10px) scale(${scale * 0.95})`;
    }
  }

  /**
   * Render the CSS2D layer
   */
  render(camera: THREE.Camera): void {
    if (this.css2dRenderer && this.scene) {
      this.css2dRenderer.render(this.scene, camera);
    }
  }

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.css2dRenderer?.setSize(width, height);
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.labelsGroup.visible = visible;
  }

  /**
   * Set interaction state - hides labels during pan/drag to prevent
   * visual glitches where labels appear to transition from origin
   */
  setInteracting(interacting: boolean): void {
    this.isInteracting = interacting;
    
    // Clear any pending show timeout
    if (this.showLabelsTimeout) {
      clearTimeout(this.showLabelsTimeout);
      this.showLabelsTimeout = null;
    }
    
    if (interacting) {
      // Immediately hide labels when interaction starts
      if (this.css2dRenderer) {
        this.css2dRenderer.domElement.style.opacity = '0';
        this.css2dRenderer.domElement.style.transition = 'opacity 0.05s ease-out';
      }
    } else {
      // Show labels with a small delay after interaction ends
      // This allows the CSS2DRenderer to update positions before showing
      this.showLabelsTimeout = setTimeout(() => {
        if (this.css2dRenderer && !this.isInteracting) {
          this.css2dRenderer.domElement.style.transition = 'opacity 0.15s ease-in';
          this.css2dRenderer.domElement.style.opacity = '1';
        }
      }, 50); // Small delay to allow position updates
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Clear any pending timeout
    if (this.showLabelsTimeout) {
      clearTimeout(this.showLabelsTimeout);
      this.showLabelsTimeout = null;
    }
    
    // Remove all labels
    for (const id of this.labels.keys()) {
      this.removeLabel(id);
    }
    
    // Remove labels group from scene
    if (this.scene) {
      this.scene.remove(this.labelsGroup);
    }
    
    // Remove CSS2D renderer element
    if (this.css2dRenderer) {
      this.css2dRenderer.domElement.remove();
    }
    
    // Remove style element
    if (this.styleElement) {
      this.styleElement.remove();
    }
    
    this.scene = null;
    this.css2dRenderer = null;
    this.container = null;
    this.styleElement = null;
  }
}
