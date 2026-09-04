/**
 * GraphExplorer constants — node styling by type, LOD thresholds and sizes.
 */

import { GraphLinkType, GraphNodeType } from './types';

// ============================================================================
// PCB theme — matches the WorkflowDesigner circuit aesthetic (CircuitTheme.ts)
// ============================================================================

/** Dark green PCB board. */
export const BOARD_BACKGROUND = 0x1a472a;
/** Grid: etched copper-mask lines. */
export const BOARD_GRID_PRIMARY = 0x3d6a4d;
export const BOARD_GRID_SECONDARY = 0x2d5a3d;
/** Node body: black IC epoxy. */
export const NODE_BODY_COLOR = 0x1a1a1a;

/**
 * Type accent per node type — used for the node's ring ("pad") and its icon
 * glyph over the dark IC body. Copper/gold/silkscreen family with category
 * accents borrowed from the circuit theme.
 */
export const NODE_TYPE_COLORS: Record<GraphNodeType, number> = {
  SYSTEM: 0xffd700, // gold — the board's main packages
  FOLDER: 0xb87333, // copper
  FILE: 0xd2b48c, // resistor tan
  FUNCTION: 0x00e676, // seven-segment green
  PROCESS: 0x9c27b0, // relay coil purple
  DATASTORE: 0x00bcd4, // cyan
  ENDPOINT: 0xe535ab, // graphql pink
  DEPENDENCY: 0x808080, // silver pins
  CONTAINER: 0x5e35b1, // deep purple
  CLOUD: 0x4dd0e1,
  CONSUMER: 0xff9800, // transistor orange
  CONFIG: 0xdce775,
  CONNECTION: 0xb0bec5,
  INPUT: 0xaed581,
  OUTPUT: 0xff8a65,
  CHILD: 0xb39ddb,
  // Documentation family — silkscreen white through to label-tape tones, so
  // prose reads as a distinct layer over the copper/gold of code.
  DOCUMENT: 0xf5f5f5, // silkscreen white
  SECTION: 0xbcaaa4, // label tape
  TOPIC: 0x80cbc4, // teal tag
  RESOURCE: 0x90a4ae, // off-board slate
  // External tracker family — status-LED tones so work items read as a live
  // layer above the board: amber tickets, indigo boards, green sprints.
  TICKET: 0xffb300, // amber status LED
  BOARD: 0x5c6bc0, // indigo header strip
  SPRINT: 0x66bb6a, // active-cycle green
  PERSON: 0xf48fb1, // badge pink
  // Database family — cyan DATASTORE lineage, darkening with depth.
  SCHEMA: 0x26c6da, // cyan (schema tier)
  TABLE: 0x00acc1, // deeper cyan
  VIEW: 0x4dd0e1, // translucent cyan (derived relation)
  COLUMN: 0x80deea, // pale cyan leaf
  PROCEDURE: 0x00897b, // teal routine
  UNKNOWN: 0x808080,
};

/** Material Symbols glyph name per node type (rendered into the icon atlas). */
export const NODE_TYPE_ICONS: Record<GraphNodeType, string> = {
  SYSTEM: 'hub',
  FOLDER: 'folder',
  FILE: 'description',
  FUNCTION: 'function',
  PROCESS: 'settings',
  DATASTORE: 'database',
  ENDPOINT: 'api',
  DEPENDENCY: 'inventory_2',
  CONTAINER: 'deployed_code',
  CLOUD: 'cloud',
  CONSUMER: 'devices',
  CONFIG: 'tune',
  CONNECTION: 'cable',
  INPUT: 'input',
  OUTPUT: 'output',
  CHILD: 'subdirectory_arrow_right',
  DOCUMENT: 'article',
  SECTION: 'segment',
  TOPIC: 'label',
  RESOURCE: 'link',
  TICKET: 'task_alt',
  BOARD: 'view_kanban',
  SPRINT: 'timer',
  PERSON: 'person',
  SCHEMA: 'schema',
  TABLE: 'table_chart',
  VIEW: 'table_view',
  COLUMN: 'view_column',
  PROCEDURE: 'functions',
  UNKNOWN: 'help',
};

/** Base radius per node type (world units). */
export const NODE_TYPE_RADII: Partial<Record<GraphNodeType, number>> = {
  SYSTEM: 28,
  FOLDER: 18,
  FILE: 14,
  DOCUMENT: 14,
  FUNCTION: 10,
  SECTION: 10,
  TOPIC: 12,
  RESOURCE: 9,
  TICKET: 12,
  BOARD: 20,
  SPRINT: 16,
  PERSON: 10,
  SCHEMA: 20,
  TABLE: 14,
  VIEW: 14,
  COLUMN: 8,
  PROCEDURE: 10,
};
export const DEFAULT_NODE_RADIUS = 12;

/** Edge color per link type — copper traces with accent variants. */
export const LINK_TYPE_COLORS: Record<GraphLinkType, number> = {
  DEPENDENCY: 0xb87333, // copper
  CALL: 0xffab40, // bright copper
  INHERITS: 0x9c27b0,
  IMPLEMENTS: 0x7e57c2,
  REFERENCE: 0x808080, // silver
  SYMLINK: 0xffd700, // gold
  CONTAINS: 0x4d7a5d, // faint board-green trace
  INPUT: 0xaed581,
  OUTPUT: 0xff8a65,
  CONNECTION: 0x808080,
  INFERRED: 0x5d8a6d,
  DIRECT: 0xb87333,
  DOCUMENTS: 0xf5f5f5, // silkscreen white — prose describing code
  MENTIONS: 0x80cbc4, // teal, matching TOPIC
  EMBEDS: 0xbcaaa4, // label tape, matching SECTION
  // External tracker links — amber family, matching TICKET.
  BLOCKS: 0xe53935, // blocking red
  DUPLICATES: 0xffcc80, // faded amber (redundant work)
  RELATES: 0xffb300, // amber, matching TICKET
  PART_OF: 0x5c6bc0, // indigo, matching BOARD membership
  ASSIGNED_TO: 0xf48fb1, // badge pink, matching PERSON
  // Database links — cyan family, matching TABLE.
  FOREIGN_KEY: 0x00acc1,
  UNKNOWN: 0x808080,
};

/**
 * Link types drawn dashed (weak / synthesized / annotative relationships).
 * MENTIONS is dashed because a topic tag is a weaker claim than a real link.
 */
export const DASHED_LINK_TYPES: GraphLinkType[] = [
  'CONTAINS', 'REFERENCE', 'INFERRED', 'MENTIONS',
  // Membership and assignment are annotative rather than structural.
  'PART_OF', 'ASSIGNED_TO', 'RELATES',
];

/** Selection / focus / preview colors (circuit theme highlights). */
export const SELECTION_RING_COLOR = 0xffd700; // trace gold
export const FOCUS_RING_COLOR = 0x00bcd4; // cyan highlight
export const EDGE_SELECTED_COLOR = 0x00bcd4;
export const EDGE_PREVIEW_COLOR = 0xffd700;
/** Max simultaneously labelled edges (selection-incident). */
export const MAX_EDGE_LABELS = 24;

// ============================================================================
// Level of detail
// ============================================================================

/** Screen-space radius (px) below which a node renders as a bare dot. */
export const LOD_DOT_RADIUS_PX = 4;
/** Screen-space radius (px) above which a node shows its icon. */
export const LOD_ICON_RADIUS_PX = 10;
/** Screen-space radius (px) above which a node may show its label. */
export const LOD_LABEL_RADIUS_PX = 18;
/** Hard cap on simultaneously visible CSS2D labels. */
export const MAX_VISIBLE_LABELS = 150;

// ============================================================================
// Layout
// ============================================================================

/** Distance from parent at which expanded children fan out. */
export const EXPANSION_RADIUS_BASE = 120;
/** Extra radius per 10 children so large fans do not overlap. */
export const EXPANSION_RADIUS_PER_10_CHILDREN = 40;
/** Bounded refinement ticks after an expansion. */
export const EXPANSION_REFINE_TICKS = 60;
/** Time budget (ms per frame) for chunked global force layout. */
export const FORCE_FRAME_BUDGET_MS = 6;

/** Duration of expand/collapse/layout position tweens. */
export const ANIMATION_DURATION_MS = 320;
/** Duration of animated viewport moves (focus/fit). */
export const VIEWPORT_ANIMATION_MS = 380;

/** Spatial hash cell size (world units) for culling + hit tests. */
export const SPATIAL_HASH_CELL_SIZE = 128;

// ============================================================================
// 3D renderer
// ============================================================================

/** Default orbit distance from the target (world units — same scale as 2D). */
export const CAMERA_3D_DISTANCE = 900;
export const CAMERA_3D_MIN_DISTANCE = 60;
export const CAMERA_3D_MAX_DISTANCE = 6000;
export const CAMERA_3D_FOV = 55;
/** Vertical spacing between containment depths when spreading a 2D layout into 3D. */
export const Z_LAYER_SPACING = 140;
/** Node sphere radius multiplier relative to the 2D radius. */
export const NODE_3D_RADIUS_SCALE = 1.0;
/** Distance (world units) beyond which 3D labels are hidden. */
export const LABEL_3D_MAX_DISTANCE = 1400;
/** Hard cap on simultaneously visible 3D labels. */
export const MAX_VISIBLE_LABELS_3D = 120;
/** Default 3D scene background (dark navy, matching the chat viewer). */
export const SPACE_BACKGROUND = 0x0b0d17;
/** Overlay (host-injected) nodes render with this accent. */
export const OVERLAY_ACCENT_COLOR = 0xfff8e1;
