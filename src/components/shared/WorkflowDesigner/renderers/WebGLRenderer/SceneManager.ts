/**
 * SceneManager - Core Three.js scene setup and management
 * 
 * Handles WebGL renderer initialization, orthographic camera setup,
 * and frame rendering with performance monitoring.
 */

import * as THREE from 'three';
import {
  ISceneManager,
  SceneConfig,
  WebGLRendererConfig,
  WebGLPerformanceMetrics,
  DEFAULT_WEBGL_CONFIG,
  DEFAULT_SCENE_CONFIG
} from './types';
import { CanvasViewport } from '../../types';

export class SceneManager implements ISceneManager {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement | null = null;
  private config: SceneConfig;
  private rendererConfig: WebGLRendererConfig;
  
  // Viewport state
  private viewport: CanvasViewport = {
    zoom: 1,
    panX: 0,
    panY: 0,
    bounds: { x: 0, y: 0, width: 800, height: 600 }
  };
  
  // Performance tracking
  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsAccumulator = 0;
  private fps = 60;
  private frameStartTime = 0;
  private frameTime = 0;
  
  // Animation
  private animationFrameId: number | null = null;
  private isRunning = false;
  
  // Post-render callback for CSS2D rendering
  private postRenderCallback: (() => void) | null = null;
  
  // Resize callback for additional renderers
  private resizeCallback: ((width: number, height: number) => void) | null = null;
  
  constructor(
    config: Partial<SceneConfig> = {},
    rendererConfig: Partial<WebGLRendererConfig> = {}
  ) {
    this.config = { ...DEFAULT_SCENE_CONFIG, ...config };
    this.rendererConfig = { ...DEFAULT_WEBGL_CONFIG, ...rendererConfig };
    
    // Initialize Three.js objects
    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = null!; // Will be initialized in initialize()
  }
  
  /**
   * Initialize the scene with a container element
   */
  initialize(container: HTMLElement, config?: Partial<SceneConfig>): void {
    this.container = container;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Get container dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    
    // Update viewport bounds
    this.viewport.bounds = { x: 0, y: 0, width, height };
    
    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.rendererConfig.antialias,
      alpha: this.rendererConfig.alpha,
      powerPreference: this.rendererConfig.powerPreference,
      logarithmicDepthBuffer: this.rendererConfig.logarithmicDepthBuffer
    });
    
    this.renderer.setPixelRatio(this.rendererConfig.pixelRatio || window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(
      this.rendererConfig.backgroundColor ?? 0xfafafa,
      this.rendererConfig.alpha ? 0 : 1
    );
    
    // Enable scissor test for potential future optimizations
    this.renderer.setScissorTest(false);
    
    // Append canvas to container
    container.appendChild(this.renderer.domElement);
    
    // Set canvas style
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.outline = 'none';
    
    // Update camera for initial viewport
    this.updateCameraFromViewport();
    
    // Set up scene background
    this.scene.background = new THREE.Color(this.rendererConfig.backgroundColor ?? 0xfafafa);
    
    // Handle resize
    this.setupResizeObserver();
  }
  
  /**
   * Create orthographic camera for 2D rendering
   */
  private createCamera(): THREE.OrthographicCamera {
    const aspect = this.viewport.bounds.width / this.viewport.bounds.height;
    const frustumSize = this.viewport.bounds.height;
    
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      10000
    );
    
    // Position camera looking down at XY plane
    camera.position.set(0, 0, 1000);
    camera.lookAt(0, 0, 0);
    
    return camera;
  }
  
  /**
   * Update camera based on current viewport state
   */
  private updateCameraFromViewport(): void {
    const { zoom, panX, panY, bounds } = this.viewport;
    const { width, height } = bounds;
    
    // Calculate frustum size based on zoom
    // Lower zoom = larger frustum = more visible area
    const frustumHeight = height / zoom;
    const frustumWidth = width / zoom;
    
    // Update camera frustum
    this.camera.left = -frustumWidth / 2;
    this.camera.right = frustumWidth / 2;
    this.camera.top = frustumHeight / 2;
    this.camera.bottom = -frustumHeight / 2;
    
    // Pan the camera (in world coordinates)
    // panX and panY are in screen coordinates, convert to world
    const worldPanX = -panX / zoom;
    const worldPanY = panY / zoom;
    
    this.camera.position.x = worldPanX + frustumWidth / 2;
    this.camera.position.y = -(worldPanY + frustumHeight / 2);
    
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Set up resize observer for responsive canvas
   */
  private setupResizeObserver(): void {
    if (!this.container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.resize(width, height);
        }
      }
    });
    
    resizeObserver.observe(this.container);
  }
  
  /**
   * Resize the canvas and update camera
   */
  resize(width: number, height: number): void {
    if (!this.renderer) return;
    
    this.viewport.bounds.width = width;
    this.viewport.bounds.height = height;
    
    this.renderer.setSize(width, height);
    this.updateCameraFromViewport();
    
    // Call resize callback (for CSS2D renderer)
    if (this.resizeCallback) {
      this.resizeCallback(width, height);
    }
  }
  
  /**
   * Set resize callback (used for CSS2D rendering)
   */
  setResizeCallback(callback: ((width: number, height: number) => void) | null): void {
    this.resizeCallback = callback;
  }
  
  /**
   * Update the viewport (zoom, pan)
   */
  setViewport(viewport: CanvasViewport): void {
    this.viewport = { ...viewport };
    this.updateCameraFromViewport();
  }
  
  /**
   * Get current viewport
   */
  getViewport(): CanvasViewport {
    return { ...this.viewport };
  }
  
  /**
   * Get the Three.js scene
   */
  getScene(): THREE.Scene {
    return this.scene;
  }
  
  /**
   * Get the camera
   */
  getCamera(): THREE.OrthographicCamera {
    return this.camera;
  }
  
  /**
   * Get the renderer
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.renderer?.domElement ?? null;
  }
  
  /**
   * Render a single frame
   */
  render(): void {
    if (!this.renderer) return;
    
    this.frameStartTime = performance.now();
    
    this.renderer.render(this.scene, this.camera);
    
    // Call post-render callback (for CSS2D rendering)
    if (this.postRenderCallback) {
      this.postRenderCallback();
    }
    
    // Update performance metrics
    this.updatePerformanceMetrics();
  }
  
  /**
   * Set post-render callback (used for CSS2D rendering)
   */
  setPostRenderCallback(callback: (() => void) | null): void {
    this.postRenderCallback = callback;
  }
  
  /**
   * Get the container element
   */
  getContainer(): HTMLElement | null {
    return this.container;
  }
  
  /**
   * Start the render loop
   */
  startRenderLoop(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    
    const animate = () => {
      if (!this.isRunning) return;
      
      this.animationFrameId = requestAnimationFrame(animate);
      this.render();
    };
    
    animate();
  }
  
  /**
   * Stop the render loop
   */
  stopRenderLoop(): void {
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const now = performance.now();
    this.frameTime = now - this.frameStartTime;
    
    // Calculate FPS using moving average
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    this.fpsAccumulator += deltaTime;
    this.frameCount++;
    
    if (this.fpsAccumulator >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsAccumulator);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): WebGLPerformanceMetrics {
    const info = this.renderer?.info;
    
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      drawCalls: info?.render?.calls ?? 0,
      triangles: info?.render?.triangles ?? 0,
      textureMemory: info?.memory?.textures ?? 0,
      geometryMemory: info?.memory?.geometries ?? 0,
      totalMemory: (info?.memory?.textures ?? 0) + (info?.memory?.geometries ?? 0),
      visibleSteps: 0, // Will be updated by step renderer
      visibleConnections: 0 // Will be updated by connection renderer
    };
  }
  
  /**
   * Set background color
   */
  setBackgroundColor(color: number): void {
    if (this.scene) {
      this.scene.background = new THREE.Color(color);
    }
    if (this.renderer) {
      this.renderer.setClearColor(color);
    }
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const { width, height } = this.viewport.bounds;
    
    // Normalize screen coordinates to [-1, 1]
    const ndcX = (screenX / width) * 2 - 1;
    const ndcY = -(screenY / height) * 2 + 1;
    
    // Create vector and unproject
    const vector = new THREE.Vector3(ndcX, ndcY, 0);
    vector.unproject(this.camera);
    
    return { x: vector.x, y: -vector.y }; // Flip Y for screen coordinates
  }
  
  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const { width, height } = this.viewport.bounds;
    
    // Create vector and project
    const vector = new THREE.Vector3(worldX, -worldY, 0); // Flip Y for world coordinates
    vector.project(this.camera);
    
    // Convert from NDC to screen coordinates
    const screenX = ((vector.x + 1) / 2) * width;
    const screenY = ((-vector.y + 1) / 2) * height;
    
    return { x: screenX, y: screenY };
  }
  
  /**
   * Dispose all resources
   */
  dispose(): void {
    this.stopRenderLoop();
    
    // Dispose all scene children
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material?.dispose();
        }
      }
    });
    
    this.scene.clear();
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    
    this.container = null;
  }
}
