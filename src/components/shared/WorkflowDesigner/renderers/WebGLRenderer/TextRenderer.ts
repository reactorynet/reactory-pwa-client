/**
 * TextRenderer - Efficient text rendering for workflow labels
 * 
 * Uses canvas-based texture atlases for rendering text labels
 * efficiently in WebGL. Supports dynamic updates and proper
 * scaling at different zoom levels.
 */

import * as THREE from 'three';
import { ITextRenderer, TextLabelOptions } from './types';
import { Point } from '../../types';

interface LabelData {
  id: string;
  text: string;
  position: Point;
  options: TextLabelOptions;
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  /** Actual content width (before power-of-2 expansion) */
  contentWidth: number;
  /** Actual content height (before power-of-2 expansion) */
  contentHeight: number;
}

const DEFAULT_LABEL_OPTIONS: TextLabelOptions = {
  fontSize: 14,
  color: 0x333333,
  backgroundColor: 0xffffff,
  padding: 4,
  maxWidth: 180,
  align: 'center',
  verticalAlign: 'middle'
};

export class TextRenderer implements ITextRenderer {
  private scene: THREE.Scene | null = null;
  private labels: Map<string, LabelData> = new Map();
  private labelsGroup: THREE.Group;
  private currentZoom = 1;
  
  // Shared canvas for measuring text
  private measureCanvas: HTMLCanvasElement;
  private measureContext: CanvasRenderingContext2D;
  
  constructor() {
    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = 'WorkflowLabels';
    
    // Create canvas for text measurement
    this.measureCanvas = document.createElement('canvas');
    this.measureContext = this.measureCanvas.getContext('2d')!;
  }
  
  /**
   * Initialize the text renderer
   */
  initialize(scene: THREE.Scene): void {
    this.scene = scene;
    this.scene.add(this.labelsGroup);
  }
  
  /**
   * Add or update a text label
   */
  updateLabel(
    id: string, 
    text: string, 
    position: Point, 
    options: TextLabelOptions = {}
  ): void {
    const mergedOptions = { ...DEFAULT_LABEL_OPTIONS, ...options };
    
    let labelData = this.labels.get(id);
    
    if (labelData) {
      // Update existing label
      if (labelData.text !== text || JSON.stringify(labelData.options) !== JSON.stringify(mergedOptions)) {
        this.renderLabelTexture(labelData, text, mergedOptions);
        labelData.text = text;
        labelData.options = mergedOptions;
      }
      
      // Update position
      labelData.position = position;
      this.updateSpritePosition(labelData);
    } else {
      // Create new label
      labelData = this.createLabel(id, text, position, mergedOptions);
      this.labels.set(id, labelData);
      this.labelsGroup.add(labelData.sprite);
    }
  }
  
  /**
   * Remove a label
   */
  removeLabel(id: string): void {
    const labelData = this.labels.get(id);
    
    if (labelData) {
      this.labelsGroup.remove(labelData.sprite);
      labelData.texture.dispose();
      labelData.sprite.material.dispose();
      this.labels.delete(id);
    }
  }
  
  /**
   * Update all labels for current zoom level
   */
  updateZoom(zoom: number): void {
    this.currentZoom = zoom;
    
    // Update sprite scales to maintain consistent text size
    this.labels.forEach(labelData => {
      this.updateSpriteScale(labelData);
    });
  }
  
  /**
   * Create a new label
   */
  private createLabel(
    id: string,
    text: string,
    position: Point,
    options: TextLabelOptions
  ): LabelData {
    // Create canvas for this label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.name = `label_${id}`;
    sprite.renderOrder = 100; // Render on top
    
    const labelData: LabelData = {
      id,
      text,
      position,
      options,
      sprite,
      canvas,
      texture,
      contentWidth: 0,
      contentHeight: 0
    };
    
    // Render the texture
    this.renderLabelTexture(labelData, text, options);
    
    // Position the sprite
    this.updateSpritePosition(labelData);
    
    return labelData;
  }
  
  /**
   * Render text to the label's texture
   */
  private renderLabelTexture(
    labelData: LabelData,
    text: string,
    options: TextLabelOptions
  ): void {
    const { canvas, texture, sprite } = labelData;
    const context = canvas.getContext('2d')!;
    
    const fontSize = options.fontSize || 14;
    const padding = options.padding || 8;
    const maxWidth = options.maxWidth || 180;
    
    // Set font for measuring - need to set it before measuring
    const font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    
    // Use measure canvas for accurate measurement
    this.measureContext.font = font;
    
    // Measure text and handle wrapping
    const lines = this.wrapText(this.measureContext, text, maxWidth - padding * 2);
    const lineHeight = fontSize * 1.2;
    
    // Calculate actual content size
    let textWidth = 0;
    lines.forEach(line => {
      const metrics = this.measureContext.measureText(line);
      textWidth = Math.max(textWidth, metrics.width);
    });
    
    // Content dimensions (what we actually want to display)
    const contentWidth = Math.ceil(textWidth + padding * 2);
    const contentHeight = Math.ceil(lines.length * lineHeight + padding * 2);
    
    // Store content dimensions for scaling
    labelData.contentWidth = contentWidth;
    labelData.contentHeight = contentHeight;
    
    // Canvas dimensions (power of 2 for GPU)
    const canvasWidth = this.nextPowerOf2(contentWidth);
    const canvasHeight = this.nextPowerOf2(contentHeight);
    
    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Clear canvas with transparency
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw background (optional) - draw at content size, not canvas size
    if (options.backgroundColor !== undefined) {
      const bgColor = this.hexToRgba(options.backgroundColor, 0.9);
      context.fillStyle = bgColor;
      
      // Rounded rectangle at content size
      const radius = 4;
      context.beginPath();
      context.roundRect(0, 0, contentWidth, contentHeight, radius);
      context.fill();
    }
    
    // Draw text - reset font after canvas resize
    context.font = font;
    context.fillStyle = this.hexToRgba(options.color || 0x333333, 1);
    context.textAlign = options.align || 'center';
    context.textBaseline = 'top';
    
    const textX = options.align === 'left' 
      ? padding 
      : options.align === 'right'
        ? contentWidth - padding
        : contentWidth / 2;
    
    lines.forEach((line, index) => {
      context.fillText(line, textX, padding + index * lineHeight);
    });
    
    // Update texture - set UV repeat to only show the content portion
    texture.needsUpdate = true;
    texture.repeat.set(contentWidth / canvasWidth, contentHeight / canvasHeight);
    texture.offset.set(0, 1 - (contentHeight / canvasHeight)); // Offset to show top-left content
    
    // Sprite scale will be set by updateSpriteScale based on content dimensions
  }
  
  /**
   * Update sprite position in 3D space
   */
  private updateSpritePosition(labelData: LabelData): void {
    const { sprite, position, options } = labelData;
    
    // Position in Three.js coordinate space (Y is flipped)
    sprite.position.set(
      position.x,
      -position.y,
      0.5 // Slightly in front of steps
    );
    
    this.updateSpriteScale(labelData);
  }
  
  /**
   * Update sprite scale based on zoom level
   */
  private updateSpriteScale(labelData: LabelData): void {
    const { sprite, contentWidth, contentHeight } = labelData;
    
    // Keep text at consistent screen size regardless of zoom
    // By dividing by zoom, text stays the same screen size when zooming
    const scale = 1 / this.currentZoom;
    
    // Use content dimensions (not power-of-2 canvas dimensions) for proper sizing
    sprite.scale.set(
      contentWidth * scale,
      contentHeight * scale,
      1
    );
  }
  
  /**
   * Wrap text to fit within max width
   */
  private wrapText(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = context.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [text];
  }
  
  /**
   * Get next power of 2
   */
  private nextPowerOf2(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(Math.max(n, 1))));
  }
  
  /**
   * Convert hex color to rgba string
   */
  private hexToRgba(hex: number, alpha: number): string {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  /**
   * Get all labels (for debugging)
   */
  getLabels(): Map<string, LabelData> {
    return this.labels;
  }
  
  /**
   * Set visibility of all labels
   */
  setVisible(visible: boolean): void {
    this.labelsGroup.visible = visible;
  }
  
  /**
   * Update visibility based on zoom (hide labels when zoomed out too far)
   */
  updateVisibilityForZoom(zoom: number): void {
    // Hide labels when zoomed out significantly
    const shouldShow = zoom > 0.3;
    this.labelsGroup.visible = shouldShow;
    
    // Optionally, show simplified labels at medium zoom
    if (zoom < 0.5 && zoom > 0.3) {
      // Could show truncated labels here
    }
  }
  
  /**
   * Dispose all resources
   */
  dispose(): void {
    // Remove and dispose all labels
    this.labels.forEach((labelData, id) => {
      this.labelsGroup.remove(labelData.sprite);
      labelData.texture.dispose();
      labelData.sprite.material.dispose();
    });
    
    this.labels.clear();
    
    // Remove group from scene
    if (this.scene && this.labelsGroup) {
      this.scene.remove(this.labelsGroup);
    }
    
    this.scene = null;
  }
}
