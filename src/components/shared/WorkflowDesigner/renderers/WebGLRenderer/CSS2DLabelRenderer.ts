/**
 * CSS2DLabelRenderer - HTML-based label rendering for workflow nodes
 * 
 * Uses Three.js CSS2DRenderer to render native HTML elements positioned
 * in 3D space. This provides crisp text at any zoom level, full CSS styling,
 * and proper card-like appearance for workflow nodes.
 */

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Point } from '../../types';

export interface NodeCardOptions {
  /** Node title/label */
  title: string;
  /** Node subtitle (e.g., step type) */
  subtitle?: string;
  /** Node icon (Material icon name or URL) */
  icon?: string;
  /** Background color */
  backgroundColor?: string;
  /** Border color */
  borderColor?: string;
  /** Text color */
  textColor?: string;
  /** Whether the node is selected */
  selected?: boolean;
  /** Whether the node has an error */
  hasError?: boolean;
  /** Whether the node has a warning */
  hasWarning?: boolean;
  /** Node width */
  width?: number;
  /** Node height */
  height?: number;
}

interface NodeData {
  id: string;
  options: NodeCardOptions;
  position: Point;
  css2dObject: CSS2DObject;
  element: HTMLDivElement;
}

const DEFAULT_NODE_OPTIONS: NodeCardOptions = {
  title: 'Node',
  backgroundColor: '#ffffff',
  borderColor: '#e0e0e0',
  textColor: '#333333',
  selected: false,
  hasError: false,
  hasWarning: false,
  width: 200,
  height: 80
};

export class CSS2DLabelRenderer {
  private scene: THREE.Scene | null = null;
  private css2dRenderer: CSS2DRenderer | null = null;
  // eslint-disable-next-line @typescript-eslint/prefer-readonly
  private nodesGroup: THREE.Group;
  // eslint-disable-next-line @typescript-eslint/prefer-readonly
  private nodes: Map<string, NodeData> = new Map();
  private currentZoom = 1;
  private container: HTMLElement | null = null;

  constructor() {
    this.nodesGroup = new THREE.Group();
    this.nodesGroup.name = 'WorkflowNodeCards';
  }

  /**
   * Initialize the CSS2D renderer
   */
  initialize(
    scene: THREE.Scene, 
    container: HTMLElement,
    camera: THREE.Camera
  ): void {
    this.scene = scene;
    this.container = container;
    this.scene.add(this.nodesGroup);

    // Create CSS2DRenderer
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(container.clientWidth, container.clientHeight);
    this.css2dRenderer.domElement.style.position = 'absolute';
    this.css2dRenderer.domElement.style.top = '0';
    this.css2dRenderer.domElement.style.left = '0';
    this.css2dRenderer.domElement.style.pointerEvents = 'none'; // Allow clicks to pass through to WebGL canvas
    this.css2dRenderer.domElement.style.zIndex = '10';
    this.css2dRenderer.domElement.classList.add('workflow-css2d-layer');
    
    container.appendChild(this.css2dRenderer.domElement);

    // Add global styles for node cards
    this.injectStyles();
  }

  /**
   * Inject CSS styles for node cards
   */
  private injectStyles(): void {
    const styleId = 'workflow-node-card-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .workflow-node-card {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        overflow: hidden;
        transition: box-shadow 0.2s ease, border-color 0.2s ease;
        pointer-events: auto;
        user-select: none;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }
      
      .workflow-node-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      }
      
      .workflow-node-card.selected {
        box-shadow: 0 0 0 2px #1976d2, 0 4px 12px rgba(25, 118, 210, 0.25);
      }
      
      .workflow-node-card.has-error {
        box-shadow: 0 0 0 2px #d32f2f, 0 4px 12px rgba(211, 47, 47, 0.25);
      }
      
      .workflow-node-card.has-warning {
        box-shadow: 0 0 0 2px #f57c00, 0 4px 12px rgba(245, 124, 0, 0.25);
      }
      
      .workflow-node-card-header {
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 36px;
      }
      
      .workflow-node-card-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.9);
        flex-shrink: 0;
      }
      
      .workflow-node-card-icon svg {
        width: 16px;
        height: 16px;
      }
      
      .workflow-node-card-content {
        flex: 1;
        min-width: 0;
        overflow: hidden;
      }
      
      .workflow-node-card-title {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 0;
      }
      
      .workflow-node-card-subtitle {
        font-size: 11px;
        opacity: 0.7;
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .workflow-node-card-body {
        padding: 0 12px 8px;
        flex: 1;
      }
      
      /* Port indicators */
      .workflow-node-ports {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
      }
      
      .workflow-node-port-left,
      .workflow-node-port-right {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #4caf50;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      
      .workflow-node-port-right {
        background: #2196f3;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create or update a node card
   */
  updateNode(
    id: string,
    position: Point,
    options: Partial<NodeCardOptions> = {}
  ): void {
    const mergedOptions = { ...DEFAULT_NODE_OPTIONS, ...options };
    
    let nodeData = this.nodes.get(id);
    
    if (nodeData) {
      // Update existing node
      this.updateNodeElement(nodeData.element, mergedOptions);
      nodeData.options = mergedOptions;
      nodeData.position = position;
      this.updateNodePosition(nodeData);
    } else {
      // Create new node
      nodeData = this.createNode(id, position, mergedOptions);
      this.nodes.set(id, nodeData);
      this.nodesGroup.add(nodeData.css2dObject);
    }
  }

  /**
   * Create a new node card
   */
  private createNode(
    id: string,
    position: Point,
    options: NodeCardOptions
  ): NodeData {
    const element = this.createNodeElement(options);
    
    const css2dObject = new CSS2DObject(element);
    css2dObject.name = `node_${id}`;
    
    const nodeData: NodeData = {
      id,
      options,
      position,
      css2dObject,
      element
    };
    
    this.updateNodePosition(nodeData);
    
    return nodeData;
  }

  /**
   * Create the HTML element for a node card
   */
  private createNodeElement(options: NodeCardOptions): HTMLDivElement {
    const element = document.createElement('div');
    this.updateNodeElement(element, options);
    return element;
  }

  /**
   * Update the HTML element content and styles
   */
  private updateNodeElement(element: HTMLDivElement, options: NodeCardOptions): void {
    const {
      title,
      subtitle,
      icon,
      backgroundColor,
      borderColor,
      textColor,
      selected,
      hasError,
      hasWarning,
      width,
      height
    } = options;

    // Build class list
    const classes = ['workflow-node-card'];
    if (selected) classes.push('selected');
    if (hasError) classes.push('has-error');
    if (hasWarning) classes.push('has-warning');
    element.className = classes.join(' ');

    // Apply styles
    element.style.width = `${width}px`;
    element.style.minHeight = `${height}px`;
    element.style.backgroundColor = backgroundColor || '#ffffff';
    element.style.borderColor = borderColor || '#e0e0e0';
    element.style.color = textColor || '#333333';
    element.style.border = `1px solid ${borderColor || '#e0e0e0'}`;

    // Build content
    const iconHtml = icon ? `
      <div class="workflow-node-card-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8" opacity="0.3"/>
        </svg>
      </div>
    ` : '';

    const subtitleHtml = subtitle ? `
      <div class="workflow-node-card-subtitle">${this.escapeHtml(subtitle)}</div>
    ` : '';

    element.innerHTML = `
      <div class="workflow-node-card-header">
        ${iconHtml}
        <div class="workflow-node-card-content">
          <div class="workflow-node-card-title" title="${this.escapeHtml(title)}">${this.escapeHtml(title)}</div>
          ${subtitleHtml}
        </div>
      </div>
    `;
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
   * Update node position in 3D space
   */
  private updateNodePosition(nodeData: NodeData): void {
    const { css2dObject, position, options } = nodeData;
    const width = options.width || 200;
    const height = options.height || 80;
    
    // Position at center of node in Three.js coordinate space (Y is flipped)
    css2dObject.position.set(
      position.x + width / 2,
      -(position.y + height / 2),
      1 // Slightly above the grid
    );
  }

  /**
   * Remove a node
   */
  removeNode(id: string): void {
    const nodeData = this.nodes.get(id);
    
    if (nodeData) {
      this.nodesGroup.remove(nodeData.css2dObject);
      nodeData.element.remove();
      this.nodes.delete(id);
    }
  }

  /**
   * Update zoom level
   */
  updateZoom(zoom: number): void {
    this.currentZoom = zoom;
    
    // Scale all node cards inversely with zoom to maintain consistent size
    this.nodes.forEach(nodeData => {
      const scale = 1 / zoom;
      nodeData.element.style.transform = `scale(${scale})`;
      nodeData.element.style.transformOrigin = 'center center';
    });
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
   * Resize the CSS2D renderer
   */
  resize(width: number, height: number): void {
    if (this.css2dRenderer) {
      this.css2dRenderer.setSize(width, height);
    }
  }

  /**
   * Set visibility of all nodes
   */
  setVisible(visible: boolean): void {
    this.nodesGroup.visible = visible;
  }

  /**
   * Update visibility based on zoom level
   */
  updateVisibilityForZoom(zoom: number): void {
    // Always show node cards, but could adjust detail level here
    this.nodesGroup.visible = true;
  }

  /**
   * Get all nodes
   */
  getNodes(): Map<string, NodeData> {
    return this.nodes;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Remove all nodes
    this.nodes.forEach((nodeData, id) => {
      this.nodesGroup.remove(nodeData.css2dObject);
      nodeData.element.remove();
    });
    this.nodes.clear();

    // Remove group from scene
    if (this.scene && this.nodesGroup) {
      this.scene.remove(this.nodesGroup);
    }

    // Remove CSS2D renderer element
    if (this.css2dRenderer) {
      this.css2dRenderer.domElement.remove();
    }

    this.scene = null;
    this.css2dRenderer = null;
    this.container = null;
  }
}
