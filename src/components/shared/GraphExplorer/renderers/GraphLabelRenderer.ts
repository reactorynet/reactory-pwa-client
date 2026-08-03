/**
 * GraphLabelRenderer — CSS2D labels with a hard visibility cap.
 *
 * Uses the three.js CSS2DRenderer (crisp text at any zoom) but only for LOD
 * tier-2 nodes, the selection and search hits — never more than
 * MAX_VISIBLE_LABELS at once, which is what keeps thousands-of-nodes graphs
 * usable where per-node HTML cards would not be.
 */

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MAX_VISIBLE_LABELS } from '../constants';
import { NodeGeometryData } from './types';

export class GraphLabelRenderer {
  private scene: THREE.Scene | null = null;
  private renderer: CSS2DRenderer | null = null;
  private labels = new Map<number, CSS2DObject>();

  initialize(scene: THREE.Scene, container: HTMLElement, width: number, height: number): void {
    this.scene = scene;
    this.renderer = new CSS2DRenderer();
    this.renderer.setSize(width, height);
    const dom = this.renderer.domElement;
    dom.style.position = 'absolute';
    dom.style.top = '0';
    dom.style.left = '0';
    dom.style.pointerEvents = 'none';
    container.appendChild(dom);
  }

  resize(width: number, height: number): void {
    this.renderer?.setSize(width, height);
  }

  render(camera: THREE.Camera): void {
    if (this.renderer && this.scene) {
      this.renderer.render(this.scene, camera);
    }
  }

  /** Sync labels to the current node set, respecting the LOD cap. */
  updateLabels(nodes: NodeGeometryData[]): void {
    if (!this.scene) return;

    const eligible = nodes
      .filter((n) => n.label && (n.lodTier >= 2 || n.selected || n.focused))
      .slice(0, MAX_VISIBLE_LABELS);
    const eligibleIds = new Set(eligible.map((n) => n.id));

    // Remove stale labels.
    for (const [id, label] of this.labels) {
      if (!eligibleIds.has(id)) {
        this.scene.remove(label);
        label.element.remove();
        this.labels.delete(id);
      }
    }

    for (const node of eligible) {
      let label = this.labels.get(node.id);
      if (!label) {
        const element = document.createElement('div');
        // Silkscreen styling: white monospace print on the dark board.
        element.style.cssText = [
          'padding: 1px 6px',
          'border-radius: 2px',
          'font: 10px/1.4 "Roboto Mono", "Courier New", monospace',
          'letter-spacing: 0.04em',
          'color: rgba(255,255,255,0.92)',
          'background: rgba(10, 30, 18, 0.65)',
          'text-shadow: 0 1px 2px rgba(0,0,0,0.6)',
          'white-space: nowrap',
          'pointer-events: none',
          'user-select: none',
        ].join(';');
        label = new CSS2DObject(element);
        label.center.set(0.5, 0); // anchor top-center under the node
        this.scene.add(label);
        this.labels.set(node.id, label);
      }
      if (label.element.textContent !== node.label) {
        label.element.textContent = node.label;
      }
      label.element.style.fontWeight = node.selected || node.focused ? '600' : '400';
      label.position.set(node.position.x, -(node.position.y + node.radius + 4), 2);
    }
  }

  dispose(): void {
    for (const label of this.labels.values()) {
      this.scene?.remove(label);
      label.element.remove();
    }
    this.labels.clear();
    this.renderer?.domElement.remove();
    this.renderer = null;
    this.scene = null;
  }
}

export default GraphLabelRenderer;
