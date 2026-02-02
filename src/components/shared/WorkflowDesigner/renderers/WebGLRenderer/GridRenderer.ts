/**
 * GridRenderer - GPU-accelerated infinite grid
 * 
 * Renders an infinite grid using a custom shader that computes
 * grid lines procedurally, providing excellent performance regardless
 * of zoom level or pan position.
 */

import * as THREE from 'three';
import { IGridRenderer, GridConfig, DEFAULT_SCENE_CONFIG } from './types';
import { CanvasViewport } from '../../types';

// Vertex shader for infinite grid
const GRID_VERTEX_SHADER = `
  varying vec2 vWorldPosition;
  
  void main() {
    // Pass world position to fragment shader
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xy;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for infinite grid with anti-aliasing
const GRID_FRAGMENT_SHADER = `
  uniform float uCellSize;
  uniform float uPrimaryInterval;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform float uOpacity;
  uniform float uZoom;
  uniform float uFadeDistance;
  uniform vec2 uViewportCenter;
  
  varying vec2 vWorldPosition;
  
  // Anti-aliased grid line function
  float gridLine(float coord, float lineWidth) {
    float derivative = fwidth(coord);
    float halfWidth = lineWidth * 0.5;
    return smoothstep(halfWidth + derivative, halfWidth, abs(mod(coord + halfWidth, 1.0) - halfWidth));
  }
  
  void main() {
    // Scale position by cell size
    vec2 scaledPos = vWorldPosition / uCellSize;
    
    // Calculate line width based on zoom (thinner when zoomed out)
    float baseLineWidth = 0.02;
    float lineWidth = baseLineWidth / max(uZoom, 0.1);
    
    // Secondary grid lines
    float secondaryGrid = max(
      gridLine(scaledPos.x, lineWidth),
      gridLine(scaledPos.y, lineWidth)
    );
    
    // Primary grid lines (every N cells)
    vec2 primaryScaled = scaledPos / uPrimaryInterval;
    float primaryLineWidth = lineWidth * 1.5;
    float primaryGrid = max(
      gridLine(primaryScaled.x, primaryLineWidth),
      gridLine(primaryScaled.y, primaryLineWidth)
    );
    
    // Fade based on distance from viewport center
    float dist = length(vWorldPosition - uViewportCenter);
    float fade = 1.0 - smoothstep(uFadeDistance * 0.5, uFadeDistance, dist);
    
    // Also fade when zoomed out too far
    float zoomFade = smoothstep(0.05, 0.15, uZoom);
    fade *= zoomFade;
    
    // Combine grids
    vec3 color = mix(uSecondaryColor, uPrimaryColor, primaryGrid);
    float alpha = max(secondaryGrid, primaryGrid) * uOpacity * fade;
    
    // Discard fully transparent pixels for performance
    if (alpha < 0.01) discard;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export class GridRenderer implements IGridRenderer {
  private scene: THREE.Scene | null = null;
  private config: GridConfig;
  private gridMesh: THREE.Mesh | null = null;
  private gridMaterial: THREE.ShaderMaterial | null = null;
  private gridGeometry: THREE.PlaneGeometry | null = null;
  
  constructor(config: Partial<GridConfig> = {}) {
    this.config = { ...DEFAULT_SCENE_CONFIG.grid, ...config };
  }
  
  /**
   * Initialize the grid renderer
   */
  initialize(scene: THREE.Scene, config?: Partial<GridConfig>): void {
    this.scene = scene;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.createGrid();
  }
  
  /**
   * Create the grid mesh with shader material
   */
  private createGrid(): void {
    if (!this.scene) return;
    
    // Create a large plane that covers the visible area
    // Using a very large plane to simulate infinite grid
    const gridSize = this.config.fadeDistance * 4;
    this.gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
    
    // Create shader material
    this.gridMaterial = new THREE.ShaderMaterial({
      vertexShader: GRID_VERTEX_SHADER,
      fragmentShader: GRID_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uCellSize: { value: this.config.cellSize },
        uPrimaryInterval: { value: this.config.primaryInterval },
        uPrimaryColor: { value: new THREE.Color(this.config.primaryColor) },
        uSecondaryColor: { value: new THREE.Color(this.config.secondaryColor) },
        uOpacity: { value: this.config.opacity },
        uZoom: { value: 1.0 },
        uFadeDistance: { value: this.config.fadeDistance },
        uViewportCenter: { value: new THREE.Vector2(0, 0) }
      }
    });
    
    // Create mesh
    this.gridMesh = new THREE.Mesh(this.gridGeometry, this.gridMaterial);
    this.gridMesh.position.z = -1; // Behind everything else
    this.gridMesh.visible = this.config.visible;
    this.gridMesh.name = 'WorkflowGrid';
    
    this.scene.add(this.gridMesh);
  }
  
  /**
   * Update grid based on viewport changes
   */
  update(viewport: CanvasViewport): void {
    if (!this.gridMaterial || !this.gridMesh) return;
    
    const { zoom, panX, panY, bounds } = viewport;
    
    // Calculate viewport center in world coordinates
    const centerX = (bounds.width / 2 - panX) / zoom;
    const centerY = (bounds.height / 2 - panY) / zoom;
    
    // Update uniforms
    this.gridMaterial.uniforms.uZoom.value = zoom;
    this.gridMaterial.uniforms.uViewportCenter.value.set(centerX, -centerY);
    
    // Move grid to follow camera
    this.gridMesh.position.x = centerX;
    this.gridMesh.position.y = -centerY;
    
    // Scale grid based on zoom to ensure coverage
    const scale = Math.max(1, 1 / zoom) * 2;
    this.gridMesh.scale.set(scale, scale, 1);
  }
  
  /**
   * Set grid visibility
   */
  setVisible(visible: boolean): void {
    this.config.visible = visible;
    if (this.gridMesh) {
      this.gridMesh.visible = visible;
    }
  }
  
  /**
   * Update grid configuration
   */
  setConfig(config: Partial<GridConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.gridMaterial) {
      this.gridMaterial.uniforms.uCellSize.value = this.config.cellSize;
      this.gridMaterial.uniforms.uPrimaryInterval.value = this.config.primaryInterval;
      this.gridMaterial.uniforms.uPrimaryColor.value.set(this.config.primaryColor);
      this.gridMaterial.uniforms.uSecondaryColor.value.set(this.config.secondaryColor);
      this.gridMaterial.uniforms.uOpacity.value = this.config.opacity;
      this.gridMaterial.uniforms.uFadeDistance.value = this.config.fadeDistance;
    }
    
    if (this.gridMesh) {
      this.gridMesh.visible = this.config.visible;
    }
  }
  
  /**
   * Set grid colors from theme
   */
  setColors(primaryColor: number, secondaryColor: number): void {
    if (this.gridMaterial) {
      this.gridMaterial.uniforms.uPrimaryColor.value.set(primaryColor);
      this.gridMaterial.uniforms.uSecondaryColor.value.set(secondaryColor);
    }
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.gridMesh && this.scene) {
      this.scene.remove(this.gridMesh);
    }
    
    if (this.gridGeometry) {
      this.gridGeometry.dispose();
      this.gridGeometry = null;
    }
    
    if (this.gridMaterial) {
      this.gridMaterial.dispose();
      this.gridMaterial = null;
    }
    
    this.gridMesh = null;
    this.scene = null;
  }
}
