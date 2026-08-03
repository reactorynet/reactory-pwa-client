/**
 * NodeRenderer — one InstancedMesh of unit quads with an SDF-circle fragment
 * shader (same technique as the WorkflowDesigner StepRenderer's rounded
 * rects, adapted for circles + icon atlas). Scales to thousands of nodes in
 * a single draw call.
 */

import * as THREE from 'three';
import { NODE_BODY_COLOR, NODE_TYPE_ICONS } from '../constants';
import { GraphNodeType } from '../types';
import {
  DEFAULT_NODE_RENDER_CONFIG,
  GraphNodeRenderConfig,
  IGraphNodeRenderer,
  NodeGeometryData,
} from './types';

const NODE_VERTEX_SHADER = `
  attribute vec3 instancePosition;
  attribute float instanceRadius;
  attribute vec3 instanceColor;
  attribute vec3 instanceRingColor;
  attribute float instanceRing;      // 0 = no ring
  attribute float instanceIcon;      // atlas column index, -1 = none
  attribute float instanceOpacity;

  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vRingColor;
  varying float vRing;
  varying float vIcon;
  varying float vOpacity;

  void main() {
    vUv = uv;
    vColor = instanceColor;
    vRingColor = instanceRingColor;
    vRing = instanceRing;
    vIcon = instanceIcon;
    vOpacity = instanceOpacity;

    vec3 scaled = position * instanceRadius * 2.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(scaled + instancePosition, 1.0);
  }
`;

const NODE_FRAGMENT_SHADER = `
  uniform sampler2D uIconAtlas;
  uniform float uIconCount;
  uniform float uRingWidth;   // fraction of radius
  uniform vec3 uBodyColor;    // black IC epoxy (PCB theme)

  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vRingColor;
  varying float vRing;
  varying float vIcon;
  varying float vOpacity;

  void main() {
    // Signed distance from circle edge in quad space (radius = 0.5).
    vec2 centered = vUv - 0.5;
    float dist = length(centered);
    float edge = fwidth(dist) * 1.5;

    float circle = 1.0 - smoothstep(0.5 - edge, 0.5, dist);
    if (circle < 0.01) discard;

    // PCB look: dark component body...
    vec3 color = uBodyColor;

    // ...with a copper/gold "pad" ring (type accent; selection overrides).
    if (vRing > 0.5) {
      float ringInner = 0.5 - uRingWidth;
      float ring = smoothstep(ringInner - edge, ringInner, dist);
      color = mix(color, vRingColor, ring);
    }

    // Icon glyph from the atlas, tinted with the type accent (bright over
    // the dark body — like a silkscreened part marking).
    if (vIcon >= 0.0 && uIconCount > 0.0) {
      // Icon occupies the middle 60% of the node.
      vec2 iconUv = (vUv - 0.5) / 0.6 + 0.5;
      if (iconUv.x >= 0.0 && iconUv.x <= 1.0 && iconUv.y >= 0.0 && iconUv.y <= 1.0) {
        vec2 atlasUv = vec2((vIcon + iconUv.x) / uIconCount, iconUv.y);
        float glyph = texture2D(uIconAtlas, atlasUv).a;
        color = mix(color, vColor, glyph * 0.9);
      }
    }

    gl_FragColor = vec4(color, circle * vOpacity);
  }
`;

const ICON_CELL = 64; // atlas cell size in px

/** Renders one Material Symbols glyph per node type into a 1-row atlas. */
const buildIconAtlas = (): { texture: THREE.Texture; index: Map<GraphNodeType, number> } => {
  const types = Object.keys(NODE_TYPE_ICONS) as GraphNodeType[];
  const canvas = document.createElement('canvas');
  canvas.width = ICON_CELL * types.length;
  canvas.height = ICON_CELL;
  const ctx = canvas.getContext('2d');
  const index = new Map<GraphNodeType, number>();

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    // Material Symbols ligatures; falls back to a plain dot when the font is
    // not loaded (the glyph simply rasterizes as text and gets alpha anyway).
    ctx.font = `${ICON_CELL * 0.72}px "Material Icons", "Material Symbols Outlined", sans-serif`;
    types.forEach((type, i) => {
      index.set(type, i);
      ctx.fillText(NODE_TYPE_ICONS[type], i * ICON_CELL + ICON_CELL / 2, ICON_CELL / 2 + 2);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  // Y flip: canvas rows run top-down, texture UVs bottom-up.
  texture.flipY = true;
  return { texture, index };
};

export class NodeRenderer implements IGraphNodeRenderer {
  private scene: THREE.Scene | null = null;
  private config: GraphNodeRenderConfig = { ...DEFAULT_NODE_RENDER_CONFIG };
  private mesh: THREE.InstancedMesh | null = null;
  private geometry: THREE.InstancedBufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private iconAtlas: { texture: THREE.Texture; index: Map<GraphNodeType, number> } | null = null;
  private capacity = 1024;
  private highlightId: number | null = null;
  private lastNodes: NodeGeometryData[] = [];

  /** Icon atlas column for a node type (set on geometry by the canvas hook). */
  iconIndexFor(type: GraphNodeType): number {
    return this.iconAtlas?.index.get(type) ?? -1;
  }

  initialize(scene: THREE.Scene, config?: Partial<GraphNodeRenderConfig>): void {
    this.scene = scene;
    this.config = { ...DEFAULT_NODE_RENDER_CONFIG, ...config };
    this.iconAtlas = buildIconAtlas();
    this.createMesh(this.capacity);
  }

  private createMesh(capacity: number): void {
    if (!this.scene || !this.iconAtlas) return;

    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    this.capacity = capacity;
    const base = new THREE.PlaneGeometry(1, 1);
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = base.index;
    this.geometry.attributes.position = base.attributes.position;
    this.geometry.attributes.uv = base.attributes.uv;

    this.geometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3));
    this.geometry.setAttribute('instanceRadius', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1));
    this.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3));
    this.geometry.setAttribute('instanceRingColor', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3));
    this.geometry.setAttribute('instanceRing', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1));
    this.geometry.setAttribute('instanceIcon', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1));
    this.geometry.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: NODE_VERTEX_SHADER,
      fragmentShader: NODE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uIconAtlas: { value: this.iconAtlas.texture },
        uIconCount: { value: this.iconAtlas.index.size },
        uRingWidth: { value: this.config.ringWidthRatio * 0.5 },
        uBodyColor: { value: new THREE.Color(NODE_BODY_COLOR) },
      },
    });

    this.mesh = new THREE.InstancedMesh(this.geometry as any, this.material, capacity);
    this.mesh.frustumCulled = false; // culling handled upstream via spatial hash
    this.mesh.name = 'GraphNodes';
    this.mesh.position.z = 1;
    this.scene.add(this.mesh);
  }

  updateNodes(nodes: NodeGeometryData[]): void {
    if (!this.geometry || !this.mesh) return;
    this.lastNodes = nodes;

    if (nodes.length > this.capacity) {
      const next = Math.max(nodes.length, this.capacity * 2);
      this.createMesh(next);
    }
    if (!this.geometry || !this.mesh) return;

    const position = this.geometry.getAttribute('instancePosition') as THREE.InstancedBufferAttribute;
    const radius = this.geometry.getAttribute('instanceRadius') as THREE.InstancedBufferAttribute;
    const color = this.geometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute;
    const ringColor = this.geometry.getAttribute('instanceRingColor') as THREE.InstancedBufferAttribute;
    const ring = this.geometry.getAttribute('instanceRing') as THREE.InstancedBufferAttribute;
    const icon = this.geometry.getAttribute('instanceIcon') as THREE.InstancedBufferAttribute;
    const opacity = this.geometry.getAttribute('instanceOpacity') as THREE.InstancedBufferAttribute;

    const tmpColor = new THREE.Color();
    nodes.forEach((node, i) => {
      // World Y is negated for screen-down coordinates (SceneManager convention).
      position.setXYZ(i, node.position.x, -node.position.y, 0);
      radius.setX(i, node.radius);
      tmpColor.set(node.color);
      color.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
      const hovered = this.highlightId === node.id && !node.selected && !node.focused;
      // Hover = bright copper (circuit theme trace hover).
      tmpColor.set(hovered ? 0xffab40 : node.ringColor || node.color);
      ringColor.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
      // PCB theme: every component has a pad ring (type accent); selection,
      // focus and hover just recolor it.
      ring.setX(i, 1);
      icon.setX(i, node.lodTier >= 1 ? node.iconIndex : -1);
      opacity.setX(i, node.dimmed ? this.configDimmedOpacity() : 1);
    });

    position.needsUpdate = true;
    radius.needsUpdate = true;
    color.needsUpdate = true;
    ringColor.needsUpdate = true;
    ring.needsUpdate = true;
    icon.needsUpdate = true;
    opacity.needsUpdate = true;

    (this.geometry as any).instanceCount = nodes.length;
    this.mesh.count = nodes.length;
  }

  private configDimmedOpacity(): number {
    return this.config.dimmedOpacity;
  }

  setHighlight(nodeId: number | null): void {
    if (this.highlightId === nodeId) return;
    this.highlightId = nodeId;
    this.updateNodes(this.lastNodes);
  }

  dispose(): void {
    if (this.mesh && this.scene) this.scene.remove(this.mesh);
    this.geometry?.dispose();
    this.material?.dispose();
    this.iconAtlas?.texture.dispose();
    this.mesh = null;
    this.geometry = null;
    this.material = null;
    this.iconAtlas = null;
    this.scene = null;
    this.lastNodes = [];
  }
}

export default NodeRenderer;
