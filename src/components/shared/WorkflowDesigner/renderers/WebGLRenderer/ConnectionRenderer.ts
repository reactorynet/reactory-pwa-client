/**
 * ConnectionRenderer - GPU-accelerated bezier curve connections
 * 
 * Renders workflow connections as smooth bezier curves with optional
 * arrow heads. Uses mesh-based ribbon geometry for thick lines
 * (since WebGL linewidth is limited to 1 pixel on most platforms).
 */

import * as THREE from 'three';
import { 
  IConnectionRenderer, 
  ConnectionRenderConfig, 
  ConnectionGeometryData,
  ConnectionPreviewState,
  DEFAULT_SCENE_CONFIG 
} from './types';
import { Point } from '../../types';

/**
 * Calculate bezier control points for a smooth connection curve
 */
function calculateBezierControlPoints(
  start: Point, 
  end: Point, 
  tension: number = 0.5
): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  
  // Control point offset based on distance and tension
  const offset = Math.min(distance * tension, 150);
  
  // Horizontal bias for workflow-style connections
  const cp1: Point = {
    x: start.x + offset,
    y: start.y
  };
  
  const cp2: Point = {
    x: end.x - offset,
    y: end.y
  };
  
  return [cp1, cp2];
}

/**
 * Generate points along a cubic bezier curve
 */
function generateBezierCurve(
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point,
  segments: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    
    // Cubic bezier formula
    const x = mt3 * start.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * end.x;
    const y = mt3 * start.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * end.y;
    
    points.push(new THREE.Vector3(x, -y, 0)); // Flip Y for Three.js
  }
  
  return points;
}

/**
 * Create a ribbon (thick line) geometry from a series of points
 * This creates a mesh-based line that supports arbitrary width
 */
function createRibbonGeometry(
  points: THREE.Vector3[],
  width: number
): THREE.BufferGeometry {
  if (points.length < 2) {
    return new THREE.BufferGeometry();
  }
  
  const halfWidth = width / 2;
  const vertices: number[] = [];
  const indices: number[] = [];
  
  // Calculate normals and create ribbon vertices
  for (let i = 0; i < points.length; i++) {
    let normal: THREE.Vector3;
    
    if (i === 0) {
      // First point - use direction to next point
      const dir = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
      normal = new THREE.Vector3(-dir.y, dir.x, 0);
    } else if (i === points.length - 1) {
      // Last point - use direction from previous point
      const dir = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
      normal = new THREE.Vector3(-dir.y, dir.x, 0);
    } else {
      // Middle points - average the normals
      const dir1 = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
      const dir2 = new THREE.Vector3().subVectors(points[i + 1], points[i]).normalize();
      const avgDir = new THREE.Vector3().addVectors(dir1, dir2).normalize();
      normal = new THREE.Vector3(-avgDir.y, avgDir.x, 0);
    }
    
    // Create two vertices on either side of the center line
    const p1 = new THREE.Vector3().addVectors(
      points[i], 
      normal.clone().multiplyScalar(halfWidth)
    );
    const p2 = new THREE.Vector3().addVectors(
      points[i], 
      normal.clone().multiplyScalar(-halfWidth)
    );
    
    vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  }
  
  // Create triangle indices for the ribbon
  for (let i = 0; i < points.length - 1; i++) {
    const baseIndex = i * 2;
    // Two triangles per segment
    indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex + 1, baseIndex + 3, baseIndex + 2
    );
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * Create arrow head geometry at end of connection
 */
function createArrowHeadGeometry(
  endPoint: Point,
  direction: Point,
  size: number
): THREE.BufferGeometry {
  // Normalize direction
  const length = Math.hypot(direction.x, direction.y);
  if (length === 0) {
    return new THREE.BufferGeometry();
  }
  
  const nx = direction.x / length;
  const ny = direction.y / length;
  
  // Perpendicular vector
  const px = -ny;
  const py = nx;
  
  // Arrow points
  const tip = new THREE.Vector3(endPoint.x, -endPoint.y, 0);
  const left = new THREE.Vector3(
    endPoint.x - nx * size - px * size * 0.5,
    -(endPoint.y - ny * size - py * size * 0.5),
    0
  );
  const right = new THREE.Vector3(
    endPoint.x - nx * size + px * size * 0.5,
    -(endPoint.y - ny * size + py * size * 0.5),
    0
  );
  
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    tip.x, tip.y, tip.z,
    left.x, left.y, left.z,
    right.x, right.y, right.z
  ]);
  
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  
  return geometry;
}

export class ConnectionRenderer implements IConnectionRenderer {
  private scene: THREE.Scene | null = null;
  private config: ConnectionRenderConfig;
  
  // Connection meshes group
  private readonly connectionsGroup: THREE.Group;
  private readonly connectionMeshes: Map<string, THREE.Mesh> = new Map();
  private readonly arrowMeshes: Map<string, THREE.Mesh> = new Map();
  
  // Preview connection
  private previewMesh: THREE.Mesh | null = null;
  private previewArrow: THREE.Mesh | null = null;
  
  // Materials (reused across connections)
  private readonly defaultMaterial: THREE.MeshBasicMaterial;
  private readonly selectedMaterial: THREE.MeshBasicMaterial;
  private readonly errorMaterial: THREE.MeshBasicMaterial;
  private readonly previewMaterial: THREE.MeshBasicMaterial;
  private readonly arrowMaterial: THREE.MeshBasicMaterial;
  private readonly selectedArrowMaterial: THREE.MeshBasicMaterial;
  private readonly errorArrowMaterial: THREE.MeshBasicMaterial;
  
  constructor(config: Partial<ConnectionRenderConfig> = {}) {
    this.config = { ...DEFAULT_SCENE_CONFIG.connections, ...config };
    this.connectionsGroup = new THREE.Group();
    this.connectionsGroup.name = 'WorkflowConnections';
    
    // Initialize materials using MeshBasicMaterial for ribbon geometry
    this.defaultMaterial = new THREE.MeshBasicMaterial({
      color: this.config.defaultColor,
      side: THREE.DoubleSide,
    });
    
    this.selectedMaterial = new THREE.MeshBasicMaterial({
      color: this.config.selectedColor,
      side: THREE.DoubleSide,
    });
    
    this.errorMaterial = new THREE.MeshBasicMaterial({
      color: this.config.errorColor,
      side: THREE.DoubleSide,
    });
    
    this.previewMaterial = new THREE.MeshBasicMaterial({
      color: this.config.selectedColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    
    this.arrowMaterial = new THREE.MeshBasicMaterial({
      color: this.config.defaultColor,
      side: THREE.DoubleSide,
    });
    
    this.selectedArrowMaterial = new THREE.MeshBasicMaterial({
      color: this.config.selectedColor,
      side: THREE.DoubleSide,
    });
    
    this.errorArrowMaterial = new THREE.MeshBasicMaterial({
      color: this.config.errorColor,
      side: THREE.DoubleSide,
    });
  }
  
  /**
   * Initialize the connection renderer
   */
  initialize(scene: THREE.Scene, config?: Partial<ConnectionRenderConfig>): void {
    this.scene = scene;
    
    if (config) {
      this.config = { ...this.config, ...config };
      this.updateMaterials();
    }
    
    this.scene.add(this.connectionsGroup);
  }
  
  /**
   * Update material colors from config
   */
  private updateMaterials(): void {
    this.defaultMaterial.color.set(this.config.defaultColor);
    this.selectedMaterial.color.set(this.config.selectedColor);
    this.errorMaterial.color.set(this.config.errorColor);
    this.previewMaterial.color.set(this.config.selectedColor);
    this.arrowMaterial.color.set(this.config.defaultColor);
    this.selectedArrowMaterial.color.set(this.config.selectedColor);
    this.errorArrowMaterial.color.set(this.config.errorColor);
  }
  
  /**
   * Update all connections
   */
  updateConnections(connections: ConnectionGeometryData[]): void {
    // Track which connections we've seen
    const seenIds = new Set<string>();
    
    connections.forEach(connection => {
      seenIds.add(connection.id);
      this.updateConnection(connection);
    });
    
    // Remove connections that are no longer present
    this.connectionMeshes.forEach((_, id) => {
      if (!seenIds.has(id)) {
        this.removeConnection(id);
      }
    });
  }
  
  /**
   * Update or create a single connection
   */
  private updateConnection(connection: ConnectionGeometryData): void {
    const { id, startPoint, endPoint, controlPoints, selected, hasError, width } = connection;
    
    // Calculate control points if not provided
    const [cp1, cp2] = controlPoints.length >= 2 
      ? controlPoints 
      : calculateBezierControlPoints(startPoint, endPoint, this.config.curveTension);
    
    // Generate curve points
    const curvePoints = generateBezierCurve(
      startPoint, 
      cp1, 
      cp2, 
      endPoint, 
      this.config.curveSegments
    );
    
    // Select material based on state
    let material = this.defaultMaterial;
    let arrowMaterial = this.arrowMaterial;
    
    if (hasError) {
      material = this.errorMaterial;
      arrowMaterial = this.errorArrowMaterial;
    } else if (selected) {
      material = this.selectedMaterial;
      arrowMaterial = this.selectedArrowMaterial;
    }
    
    // Determine line width
    const lineWidth = width || (selected ? this.config.selectedLineWidth : this.config.lineWidth);
    
    // Get or create mesh
    let mesh = this.connectionMeshes.get(id);
    
    if (mesh) {
      // Dispose old geometry and create new one
      mesh.geometry.dispose();
      mesh.geometry = createRibbonGeometry(curvePoints, lineWidth);
      mesh.material = material;
    } else {
      // Create new mesh with ribbon geometry
      const geometry = createRibbonGeometry(curvePoints, lineWidth);
      mesh = new THREE.Mesh(geometry, material);
      mesh.name = `connection_${id}`;
      
      this.connectionMeshes.set(id, mesh);
      this.connectionsGroup.add(mesh);
    }
    
    // Update arrow head
    if (this.config.showArrows) {
      // Calculate direction at end point
      const lastPoint = curvePoints[curvePoints.length - 1];
      const prevPoint = curvePoints[curvePoints.length - 2];
      const direction: Point = {
        x: lastPoint.x - prevPoint.x,
        y: -(lastPoint.y - prevPoint.y) // Flip Y back
      };
      
      // Adjust end point to account for arrow
      const arrowEnd: Point = {
        x: endPoint.x,
        y: endPoint.y
      };
      
      let arrow = this.arrowMeshes.get(id);
      
      if (arrow) {
        // Update existing arrow
        arrow.geometry.dispose();
        arrow.geometry = createArrowHeadGeometry(arrowEnd, direction, this.config.arrowSize);
        arrow.material = arrowMaterial;
      } else {
        // Create new arrow
        const arrowGeometry = createArrowHeadGeometry(arrowEnd, direction, this.config.arrowSize);
        arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.name = `arrow_${id}`;
        
        this.arrowMeshes.set(id, arrow);
        this.connectionsGroup.add(arrow);
      }
    }
  }
  
  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    const mesh = this.connectionMeshes.get(connectionId);
    if (mesh) {
      this.connectionsGroup.remove(mesh);
      mesh.geometry.dispose();
      this.connectionMeshes.delete(connectionId);
    }
    
    const arrow = this.arrowMeshes.get(connectionId);
    if (arrow) {
      this.connectionsGroup.remove(arrow);
      arrow.geometry.dispose();
      this.arrowMeshes.delete(connectionId);
    }
  }
  
  /**
   * Highlight a connection (on hover)
   */
  highlightConnection(connectionId: string, highlight: boolean): void {
    const mesh = this.connectionMeshes.get(connectionId);
    if (mesh) {
      // Could implement hover effect here
      // For now, just change opacity slightly
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (highlight) {
        material.opacity = 0.8;
        material.transparent = true;
      } else {
        material.opacity = 1;
        material.transparent = false;
      }
      material.needsUpdate = true;
    }
  }
  
  /**
   * Set connection preview (during drag)
   */
  setPreview(preview: ConnectionPreviewState | null): void {
    // Clear existing preview
    if (this.previewMesh) {
      this.connectionsGroup.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
      this.previewMesh = null;
    }
    if (this.previewArrow) {
      this.connectionsGroup.remove(this.previewArrow);
      this.previewArrow.geometry.dispose();
      this.previewArrow = null;
    }
    
    if (!preview) return;
    
    const { startPoint, currentPoint } = preview;
    
    // Calculate control points
    const [cp1, cp2] = calculateBezierControlPoints(startPoint, currentPoint, this.config.curveTension);
    
    // Generate curve points
    const curvePoints = generateBezierCurve(
      startPoint,
      cp1,
      cp2,
      currentPoint,
      this.config.curveSegments
    );
    
    // Create preview mesh with ribbon geometry
    const geometry = createRibbonGeometry(curvePoints, this.config.lineWidth);
    this.previewMesh = new THREE.Mesh(geometry, this.previewMaterial);
    this.previewMesh.name = 'connection_preview';
    this.connectionsGroup.add(this.previewMesh);
    
    // Create preview arrow
    if (this.config.showArrows) {
      const end: Point = { x: currentPoint.x, y: currentPoint.y };
      const lastPoint = curvePoints[curvePoints.length - 1];
      const prevPoint = curvePoints[curvePoints.length - 2];
      const direction: Point = {
        x: lastPoint.x - prevPoint.x,
        y: -(lastPoint.y - prevPoint.y)
      };
      
      const arrowGeometry = createArrowHeadGeometry(
        end, 
        direction, 
        this.config.arrowSize
      );
      
      this.previewArrow = new THREE.Mesh(arrowGeometry, this.selectedArrowMaterial);
      this.previewArrow.name = 'arrow_preview';
      this.connectionsGroup.add(this.previewArrow);
    }
  }
  
  /**
   * Set configuration
   */
  setConfig(config: Partial<ConnectionRenderConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateMaterials();
  }
  
  /**
   * Get connection at screen position (for hit testing)
   * Returns connection ID or null
   */
  getConnectionAtPosition(
    worldPosition: Point, 
    threshold: number = 10
  ): string | null {
    // Check each connection's curve by examining the mesh geometry
    for (const [id, mesh] of this.connectionMeshes) {
      const geometry = mesh.geometry;
      const positions = geometry.getAttribute('position');
      
      if (!positions || positions.count < 4) continue;
      
      // Sample the center points of the ribbon (every other pair of vertices)
      for (let i = 0; i < positions.count - 2; i += 2) {
        // Get center point between the two vertices that form the ribbon width
        const p1x = (positions.getX(i) + positions.getX(i + 1)) / 2;
        const p1y = -(positions.getY(i) + positions.getY(i + 1)) / 2; // Flip Y back
        const p2x = (positions.getX(i + 2) + positions.getX(i + 3)) / 2;
        const p2y = -(positions.getY(i + 2) + positions.getY(i + 3)) / 2;
        
        const p1 = { x: p1x, y: p1y };
        const p2 = { x: p2x, y: p2y };
        
        const dist = this.pointToSegmentDistance(worldPosition, p1, p2);
        if (dist < threshold) {
          return id;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Calculate distance from point to line segment
   */
  private pointToSegmentDistance(point: Point, segStart: Point, segEnd: Point): number {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const lengthSq = dx * dx + dy * dy;
    
    if (lengthSq === 0) {
      // Segment is a point
      return Math.hypot(point.x - segStart.x, point.y - segStart.y);
    }
    
    // Project point onto line
    const t = Math.max(0, Math.min(1, 
      ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq
    ));
    
    const projX = segStart.x + t * dx;
    const projY = segStart.y + t * dy;
    
    return Math.hypot(point.x - projX, point.y - projY);
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    // Clear all connections
    this.connectionMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
    });
    this.connectionMeshes.clear();
    
    this.arrowMeshes.forEach((arrow) => {
      arrow.geometry.dispose();
    });
    this.arrowMeshes.clear();
    
    // Clear preview
    if (this.previewMesh) {
      this.previewMesh.geometry.dispose();
    }
    if (this.previewArrow) {
      this.previewArrow.geometry.dispose();
    }
    
    // Remove group from scene
    if (this.scene && this.connectionsGroup) {
      this.scene.remove(this.connectionsGroup);
    }
    
    // Dispose materials
    this.defaultMaterial.dispose();
    this.selectedMaterial.dispose();
    this.errorMaterial.dispose();
    this.previewMaterial.dispose();
    this.arrowMaterial.dispose();
    this.selectedArrowMaterial.dispose();
    this.errorArrowMaterial.dispose();
    
    this.scene = null;
  }
}
