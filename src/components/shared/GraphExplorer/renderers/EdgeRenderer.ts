/**
 * EdgeRenderer — all edges in a single LineSegments buffer (2 verts/edge,
 * vertex colors) plus one InstancedMesh of arrowhead triangles for directed
 * edges. This is the scaling divergence from the WorkflowDesigner's
 * per-connection bezier ribbon meshes: one draw call for the whole edge set.
 */

import * as THREE from 'three';
import { EDGE_PREVIEW_COLOR, EDGE_SELECTED_COLOR } from '../constants';
import { Point } from '../types';
import {
  DEFAULT_EDGE_RENDER_CONFIG,
  EdgeGeometryData,
  GraphEdgeRenderConfig,
  IGraphEdgeRenderer,
} from './types';

/** Dash pattern approximated by segmenting the line (LineDashedMaterial does
 * not work with vertex colors + merged buffers). */
const DASH_LENGTH = 8;
const GAP_LENGTH = 6;

export class EdgeRenderer implements IGraphEdgeRenderer {
  private scene: THREE.Scene | null = null;
  private config: GraphEdgeRenderConfig = { ...DEFAULT_EDGE_RENDER_CONFIG };

  private lines: THREE.LineSegments | null = null;
  private lineGeometry: THREE.BufferGeometry | null = null;
  private lineMaterial: THREE.LineBasicMaterial | null = null;

  private arrows: THREE.InstancedMesh | null = null;
  private arrowGeometry: THREE.BufferGeometry | null = null;
  private arrowMaterial: THREE.MeshBasicMaterial | null = null;
  private arrowCapacity = 1024;

  private preview: THREE.Line | null = null;

  initialize(scene: THREE.Scene, config?: Partial<GraphEdgeRenderConfig>): void {
    this.scene = scene;
    this.config = { ...DEFAULT_EDGE_RENDER_CONFIG, ...config };

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.lines.frustumCulled = false;
    this.lines.name = 'GraphEdges';
    this.lines.position.z = 0.5;
    scene.add(this.lines);

    this.createArrowMesh(this.arrowCapacity);
  }

  private createArrowMesh(capacity: number): void {
    if (!this.scene) return;
    if (this.arrows) {
      this.scene.remove(this.arrows);
      this.arrowGeometry?.dispose();
      this.arrowMaterial?.dispose();
    }
    this.arrowCapacity = capacity;
    // Unit triangle pointing +X, scaled per instance via matrix.
    this.arrowGeometry = new THREE.BufferGeometry();
    this.arrowGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0.5, 0, 0, -0.5, 0, 1, 0, 0], 3)
    );
    this.arrowMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 });
    this.arrows = new THREE.InstancedMesh(this.arrowGeometry, this.arrowMaterial, capacity);
    this.arrows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.arrows.frustumCulled = false;
    this.arrows.name = 'GraphEdgeArrows';
    this.arrows.position.z = 0.6;
    this.scene.add(this.arrows);
  }

  updateEdges(edges: EdgeGeometryData[]): void {
    if (!this.lineGeometry || !this.scene) return;

    // Build vertex + color arrays. Dashed edges emit multiple short segments.
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    const pushSegment = (from: Point, to: Point, c: THREE.Color) => {
      positions.push(from.x, -from.y, 0, to.x, -to.y, 0);
      colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    };

    let directedCount = 0;
    const directed: EdgeGeometryData[] = [];

    for (const edge of edges) {
      color.set(edge.selected ? EDGE_SELECTED_COLOR : edge.color);
      if (edge.dashed) {
        const dx = edge.target.x - edge.source.x;
        const dy = edge.target.y - edge.source.y;
        const length = Math.hypot(dx, dy);
        if (length < 1) continue;
        const ux = dx / length;
        const uy = dy / length;
        let travelled = 0;
        while (travelled < length) {
          const end = Math.min(travelled + DASH_LENGTH, length);
          pushSegment(
            { x: edge.source.x + ux * travelled, y: edge.source.y + uy * travelled },
            { x: edge.source.x + ux * end, y: edge.source.y + uy * end },
            color
          );
          travelled = end + GAP_LENGTH;
        }
      } else {
        pushSegment(edge.source, edge.target, color);
      }
      if (edge.directed) {
        directed.push(edge);
        directedCount++;
      }
    }

    this.lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.lineGeometry.computeBoundingSphere();

    // Arrowheads.
    if (directedCount > this.arrowCapacity) {
      this.createArrowMesh(Math.max(directedCount, this.arrowCapacity * 2));
    }
    if (!this.arrows) return;

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const positionV = new THREE.Vector3();
    const zAxis = new THREE.Vector3(0, 0, 1);

    directed.forEach((edge, i) => {
      const dx = edge.target.x - edge.source.x;
      const dy = -(edge.target.y - edge.source.y);
      const angle = Math.atan2(dy, dx);
      const size = this.config.arrowSize * (edge.selected ? 1.4 : 1);
      // Pull the tip back from the target center so it sits at the node rim
      // (the canvas hook already shortens edge endpoints by node radius).
      positionV.set(edge.target.x - Math.cos(angle) * size, -(edge.target.y) - Math.sin(angle) * size, 0);
      quaternion.setFromAxisAngle(zAxis, angle);
      scale.set(size, size, 1);
      matrix.compose(positionV, quaternion, scale);
      this.arrows!.setMatrixAt(i, matrix);
      this.arrows!.setColorAt(i, new THREE.Color(edge.selected ? EDGE_SELECTED_COLOR : edge.color));
    });

    this.arrows.count = directedCount;
    this.arrows.instanceMatrix.needsUpdate = true;
    if (this.arrows.instanceColor) this.arrows.instanceColor.needsUpdate = true;
  }

  setPreview(from: Point | null, to?: Point): void {
    if (!this.scene) return;
    if (!from || !to) {
      if (this.preview) {
        this.scene.remove(this.preview);
        this.preview.geometry.dispose();
        (this.preview.material as THREE.Material).dispose();
        this.preview = null;
      }
      return;
    }
    if (!this.preview) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        color: EDGE_PREVIEW_COLOR,
        transparent: true,
        opacity: 0.7,
      });
      this.preview = new THREE.Line(geometry, material);
      this.preview.frustumCulled = false;
      this.preview.position.z = 0.7;
      this.scene.add(this.preview);
    }
    this.preview.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([from.x, -from.y, 0, to.x, -to.y, 0], 3)
    );
    this.preview.geometry.computeBoundingSphere();
  }

  dispose(): void {
    if (this.scene) {
      if (this.lines) this.scene.remove(this.lines);
      if (this.arrows) this.scene.remove(this.arrows);
      if (this.preview) this.scene.remove(this.preview);
    }
    this.lineGeometry?.dispose();
    this.lineMaterial?.dispose();
    this.arrowGeometry?.dispose();
    this.arrowMaterial?.dispose();
    this.preview?.geometry.dispose();
    if (this.preview) (this.preview.material as THREE.Material).dispose();
    this.lines = null;
    this.arrows = null;
    this.preview = null;
    this.scene = null;
  }
}

export default EdgeRenderer;
