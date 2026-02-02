/**
 * CircuitTraceRenderer - Renders connections as PCB traces
 * 
 * Creates copper-colored traces that follow Manhattan routing (horizontal
 * and vertical segments) like real PCB traces on a circuit board.
 */

import * as THREE from 'three';
import { CIRCUIT_COLORS, CIRCUIT_DIMENSIONS } from './CircuitTheme';
import type { ConnectionGeometryData } from './types';
import type { Point } from '../../types';

interface TraceMesh {
  id: string;
  group: THREE.Group;
  segments: THREE.Mesh[];
  solderPads: THREE.Mesh[];  // Track solder pads separately for proper cleanup
  isHovered: boolean;
  isSelected: boolean;
}

export class CircuitTraceRenderer {
  private readonly scene: THREE.Scene;
  private readonly tracesGroup: THREE.Group;
  private readonly traces: Map<string, TraceMesh> = new Map();
  
  // Materials
  private readonly materials: {
    copper: THREE.MeshBasicMaterial;
    copperHover: THREE.MeshBasicMaterial;
    copperSelected: THREE.MeshBasicMaterial;
    copperError: THREE.MeshBasicMaterial;
    soldermask: THREE.MeshBasicMaterial;
  };

  /**
   * Transform a point to Three.js coordinate system (negate Y)
   */
  private toThreeCoords(point: Point): Point {
    return { x: point.x, y: -point.y };
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.tracesGroup = new THREE.Group();
    this.tracesGroup.name = 'CircuitTraces';
    this.tracesGroup.position.z = -1; // Behind components
    this.scene.add(this.tracesGroup);
    
    // Create materials
    this.materials = {
      copper: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.traceCopper }),
      copperHover: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.traceHover }),
      copperSelected: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.traceSelected }),
      copperError: new THREE.MeshBasicMaterial({ color: CIRCUIT_COLORS.traceError }),
      soldermask: new THREE.MeshBasicMaterial({ 
        color: CIRCUIT_COLORS.boardBackground,
        transparent: true,
        opacity: 0.3
      }),
    };
  }

  /**
   * Update all traces
   */
  updateTraces(connections: ConnectionGeometryData[]): void {
    const currentIds = new Set(connections.map(c => c.id));
    
    // Remove traces that no longer exist
    for (const [id, trace] of this.traces) {
      if (!currentIds.has(id)) {
        this.tracesGroup.remove(trace.group);
        this.disposeTrace(trace);
        this.traces.delete(id);
      }
    }
    
    // Update or create traces
    connections.forEach(connection => {
      const existing = this.traces.get(connection.id);
      
      if (existing) {
        this.updateTrace(existing, connection);
      } else {
        const trace = this.createTrace(connection);
        this.traces.set(connection.id, trace);
        this.tracesGroup.add(trace.group);
      }
    });
  }

  /**
   * Create a new trace with Manhattan routing
   */
  private createTrace(connection: ConnectionGeometryData): TraceMesh {
    const group = new THREE.Group();
    group.name = `trace_${connection.id}`;
    
    // Calculate Manhattan route
    const waypoints = this.calculateManhattanRoute(
      connection.startPoint,
      connection.endPoint
    );
    
    // Create trace segments
    const segments = this.createTraceSegments(waypoints, connection);
    segments.forEach(segment => group.add(segment));
    
    // Create solder pads at start and end
    const solderPads: THREE.Mesh[] = [];
    this.createSolderPad(group, connection.startPoint, solderPads);
    this.createSolderPad(group, connection.endPoint, solderPads);
    
    return {
      id: connection.id,
      group,
      segments,
      solderPads,
      isHovered: false,
      isSelected: connection.selected,
    };
  }

  /**
   * Calculate routing waypoints with 45° diagonal support
   * Creates cleaner PCB-style traces with optional diagonal segments
   */
  private calculateManhattanRoute(start: Point, end: Point): Point[] {
    const waypoints: Point[] = [start];
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    // Minimum distance for routing decisions
    const minDist = 30;
    const diagonalLength = Math.min(absDx, absDy);
    
    if (absDx < minDist && absDy < minDist) {
      // Very close - direct diagonal line
      waypoints.push(end);
    } else if (absDy < minDist) {
      // Nearly horizontal - straight line
      waypoints.push(end);
    } else if (absDx < minDist) {
      // Nearly vertical - straight line
      waypoints.push(end);
    } else if (absDx > absDy * 2) {
      // Much more horizontal: horizontal -> 45° diagonal -> horizontal
      const diag = Math.min(diagonalLength, 40);
      const dirY = dy > 0 ? 1 : -1;
      const dirX = dx > 0 ? 1 : -1;
      
      // First horizontal segment
      const firstH = (absDx - diag) / 2;
      waypoints.push({ x: start.x + firstH * dirX, y: start.y });
      
      // Diagonal segment
      waypoints.push({ x: start.x + firstH * dirX + diag * dirX, y: start.y + diag * dirY });
      
      // Continue with remaining vertical if needed
      if (absDy > diag) {
        waypoints.push({ x: start.x + firstH * dirX + diag * dirX, y: end.y });
      }
      
      waypoints.push(end);
    } else if (absDy > absDx * 2) {
      // Much more vertical: vertical -> 45° diagonal -> vertical
      const diag = Math.min(diagonalLength, 40);
      const dirY = dy > 0 ? 1 : -1;
      const dirX = dx > 0 ? 1 : -1;
      
      // First vertical segment
      const firstV = (absDy - diag) / 2;
      waypoints.push({ x: start.x, y: start.y + firstV * dirY });
      
      // Diagonal segment
      waypoints.push({ x: start.x + diag * dirX, y: start.y + firstV * dirY + diag * dirY });
      
      // Continue with remaining horizontal if needed
      if (absDx > diag) {
        waypoints.push({ x: end.x, y: start.y + firstV * dirY + diag * dirY });
      }
      
      waypoints.push(end);
    } else {
      // Roughly equal: use 45° diagonal in the middle
      const dirY = dy > 0 ? 1 : -1;
      const dirX = dx > 0 ? 1 : -1;
      
      // Horizontal start segment
      const horzStart = (absDx - absDy) / 2;
      if (horzStart > 10) {
        waypoints.push({ x: start.x + horzStart * dirX, y: start.y });
      }
      
      // Full 45° diagonal to the end height
      waypoints.push({ x: end.x - (horzStart > 10 ? horzStart * dirX : 0), y: end.y });
      
      waypoints.push(end);
    }
    
    return waypoints;
  }

  /**
   * Get material based on connection state
   */
  private getMaterial(selected: boolean, hasError: boolean, isHover = false): THREE.MeshBasicMaterial {
    if (selected) return this.materials.copperSelected;
    if (isHover) return this.materials.copperHover;
    if (hasError) return this.materials.copperError;
    return this.materials.copper;
  }

  /**
   * Create trace segment meshes
   */
  private createTraceSegments(waypoints: Point[], connection: ConnectionGeometryData): THREE.Mesh[] {
    const segments: THREE.Mesh[] = [];
    const width = connection.selected 
      ? CIRCUIT_DIMENSIONS.traceWidthSelected 
      : CIRCUIT_DIMENSIONS.traceWidth;
    
    const material = this.getMaterial(connection.selected, connection.hasError);
    
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      
      // Create a rectangle for each segment
      const segment = this.createTraceSegment(start, end, width, material);
      segments.push(segment);
      
      // Create rounded corner at waypoint (except at start and end)
      if (i > 0) {
        const corner = this.createCornerPad(waypoints[i], width, material);
        segments.push(corner);
      }
    }
    
    return segments;
  }

  /**
   * Create a single trace segment
   */
  private createTraceSegment(
    start: Point, 
    end: Point, 
    width: number, 
    material: THREE.Material
  ): THREE.Mesh {
    // Transform to Three.js coordinate system
    const threeStart = this.toThreeCoords(start);
    const threeEnd = this.toThreeCoords(end);
    
    const dx = threeEnd.x - threeStart.x;
    const dy = threeEnd.y - threeStart.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    
    // Create rectangle geometry
    const geometry = new THREE.PlaneGeometry(length, width);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position at midpoint and rotate
    mesh.position.set(
      threeStart.x + dx / 2,
      threeStart.y + dy / 2,
      0
    );
    mesh.rotation.z = angle;
    
    return mesh;
  }

  /**
   * Create a rounded corner pad
   */
  private createCornerPad(point: Point, width: number, material: THREE.Material): THREE.Mesh {
    const threePoint = this.toThreeCoords(point);
    const geometry = new THREE.CircleGeometry(width / 2, 16);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(threePoint.x, threePoint.y, 0.1);
    return mesh;
  }

  /**
   * Create a solder pad at connection point
   * @param group - The THREE.Group to add the pad meshes to
   * @param point - The world position for the solder pad
   * @param solderPads - Optional array to collect the created meshes for tracking
   */
  private createSolderPad(group: THREE.Group, point: Point, solderPads?: THREE.Mesh[]): void {
    const threePoint = this.toThreeCoords(point);
    
    // Outer copper ring
    const outerGeometry = new THREE.CircleGeometry(CIRCUIT_DIMENSIONS.pinRadius * 1.5, 16);
    const outerMesh = new THREE.Mesh(outerGeometry, this.materials.copper.clone());
    outerMesh.position.set(threePoint.x, threePoint.y, 0.2);
    group.add(outerMesh);
    solderPads?.push(outerMesh);
    
    // Inner hole (dark)
    const innerGeometry = new THREE.CircleGeometry(CIRCUIT_DIMENSIONS.pinRadius * 0.5, 16);
    const innerMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    innerMesh.position.set(threePoint.x, threePoint.y, 0.3);
    group.add(innerMesh);
    solderPads?.push(innerMesh);
  }

  /**
   * Update an existing trace
   */
  private updateTrace(trace: TraceMesh, connection: ConnectionGeometryData): void {
    // Check if route changed
    const needsRebuild = this.traceNeedsRebuild(trace, connection);
    
    if (needsRebuild) {
      // Remove old segments
      trace.segments.forEach(segment => {
        trace.group.remove(segment);
        segment.geometry.dispose();
      });
      
      // Remove old solder pads - this was the bug causing pads to stay in place
      trace.solderPads.forEach(pad => {
        trace.group.remove(pad);
        pad.geometry.dispose();
        if (pad.material instanceof THREE.Material) {
          pad.material.dispose();
        }
      });
      
      // Calculate new route
      const waypoints = this.calculateManhattanRoute(
        connection.startPoint,
        connection.endPoint
      );
      
      // Create new segments
      trace.segments = this.createTraceSegments(waypoints, connection);
      trace.segments.forEach(segment => trace.group.add(segment));
      
      // Create new solder pads at updated positions
      trace.solderPads = [];
      this.createSolderPad(trace.group, connection.startPoint, trace.solderPads);
      this.createSolderPad(trace.group, connection.endPoint, trace.solderPads);
    }
    
    // Update visual state
    this.updateTraceState(trace, connection.selected, connection.hasError);
  }

  /**
   * Check if trace needs to be rebuilt
   */
  private traceNeedsRebuild(_trace: TraceMesh, _connection: ConnectionGeometryData): boolean {
    // For now, always rebuild. Could optimize by checking if points changed.
    return true;
  }

  /**
   * Update trace visual state
   */
  private updateTraceState(trace: TraceMesh, selected: boolean, hasError: boolean): void {
    trace.isSelected = selected;
    
    const material = this.getMaterial(selected, hasError, trace.isHovered);
    
    trace.segments.forEach(segment => {
      segment.material = material;
    });
  }

  /**
   * Set hover state
   */
  setHovered(connectionId: string, hovered: boolean): void {
    const trace = this.traces.get(connectionId);
    if (trace) {
      trace.isHovered = hovered;
      this.updateTraceState(trace, trace.isSelected, false);
    }
  }

  /**
   * Render a preview trace (while dragging a new connection)
   * Uses a brighter gold color with pulsing opacity for visibility
   */
  private previewTrace: THREE.Group | null = null;
  private previewAnimationFrame: number | null = null;
  private previewOpacity = 0.7;
  private previewOpacityDirection = -1;
  
  showPreviewTrace(start: Point, end: Point): void {
    this.hidePreviewTrace();
    
    this.previewTrace = new THREE.Group();
    this.previewTrace.name = 'preview_trace';
    
    const waypoints = this.calculateManhattanRoute(start, end);
    
    // Create bright preview material - gold/yellow for visibility
    const previewMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffd700,  // Bright gold
      transparent: true,
      opacity: 0.8
    });
    
    // Thicker trace for preview
    const previewWidth = CIRCUIT_DIMENSIONS.traceWidth * 1.5;
    
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segment = this.createTraceSegment(
        waypoints[i], 
        waypoints[i + 1], 
        previewWidth,
        previewMaterial
      );
      this.previewTrace.add(segment);
      
      if (i > 0) {
        const corner = this.createCornerPad(waypoints[i], previewWidth, previewMaterial);
        this.previewTrace.add(corner);
      }
    }
    
    // Add glowing end point indicator
    const endPos = this.toThreeCoords(end);
    const endIndicator = new THREE.Mesh(
      new THREE.CircleGeometry(12, 24),
      new THREE.MeshBasicMaterial({ 
        color: 0xffd700,
        transparent: true,
        opacity: 0.6
      })
    );
    endIndicator.position.set(endPos.x, endPos.y, 0.5);
    this.previewTrace.add(endIndicator);
    
    // Inner circle
    const innerIndicator = new THREE.Mesh(
      new THREE.CircleGeometry(6, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    innerIndicator.position.set(endPos.x, endPos.y, 0.6);
    this.previewTrace.add(innerIndicator);
    
    this.tracesGroup.add(this.previewTrace);
    
    // Start pulsing animation
    this.startPreviewAnimation();
  }
  
  private startPreviewAnimation(): void {
    const animate = () => {
      if (!this.previewTrace) return;
      
      // Pulse opacity between 0.5 and 1.0
      this.previewOpacity += 0.03 * this.previewOpacityDirection;
      if (this.previewOpacity <= 0.5) {
        this.previewOpacity = 0.5;
        this.previewOpacityDirection = 1;
      } else if (this.previewOpacity >= 1.0) {
        this.previewOpacity = 1.0;
        this.previewOpacityDirection = -1;
      }
      
      // Update all materials in the preview
      this.previewTrace.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = this.previewOpacity;
        }
      });
      
      this.previewAnimationFrame = requestAnimationFrame(animate);
    };
    
    animate();
  }

  hidePreviewTrace(): void {
    // Cancel animation
    if (this.previewAnimationFrame) {
      cancelAnimationFrame(this.previewAnimationFrame);
      this.previewAnimationFrame = null;
    }
    
    if (this.previewTrace) {
      this.tracesGroup.remove(this.previewTrace);
      this.previewTrace.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.previewTrace = null;
    }
  }

  /**
   * Dispose of a trace
   */
  private disposeTrace(trace: TraceMesh): void {
    trace.segments.forEach(segment => {
      segment.geometry.dispose();
    });
    
    // Also dispose solder pads
    trace.solderPads.forEach(pad => {
      pad.geometry.dispose();
      if (pad.material instanceof THREE.Material) {
        pad.material.dispose();
      }
    });
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.hidePreviewTrace();
    
    for (const trace of this.traces.values()) {
      this.tracesGroup.remove(trace.group);
      this.disposeTrace(trace);
    }
    this.traces.clear();
    
    Object.values(this.materials).forEach(m => m.dispose());
    
    this.scene.remove(this.tracesGroup);
  }
}
