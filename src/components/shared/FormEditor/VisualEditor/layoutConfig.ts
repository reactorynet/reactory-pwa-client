/**
 * Helpers for reading/writing the layout configuration that a ReactoryForm
 * uiSchema node carries via `ui:field`.
 *
 * A node (the form root, an object property, or an array's `items`) can select a
 * layout component through `ui:field`. Each layout family reads its own extra
 * uiSchema keys:
 *
 *   Tabbed family (TabbedLayout / AccordionLayout / SteppedLayout / ListLayout)
 *     ui:tab-layout   [{ field, icon, title }]
 *     ui:tab-options  { useRouter, path }
 *     ui:options      { activeTab, activeTabKey }
 *
 *   Grid family (GridLayout / ColumnLayout / PageLayout)
 *     ui:grid-layout  [ { <fieldName>: { size: { xs, sm, md, lg, xl } } } ]
 *     ui:grid-options { spacing, container, elevation }
 */

export const TAB_LAYOUT_FIELDS = [
  'TabbedLayout',
  'AccordionLayout',
  'SteppedLayout',
  'ListLayout',
];

export const GRID_LAYOUT_FIELDS = ['GridLayout', 'ColumnLayout', 'PageLayout'];

/** The value used to mean "no explicit ui:field" (default ObjectField). */
export const DEFAULT_LAYOUT = 'ObjectField';

/** Selectable ui:field values, in display order. */
export const LAYOUT_FIELD_OPTIONS = [
  DEFAULT_LAYOUT,
  ...TAB_LAYOUT_FIELDS,
  ...GRID_LAYOUT_FIELDS,
];

export type LayoutFamily = 'tabbed' | 'grid' | 'object';

export const getLayoutFamily = (uiField?: string): LayoutFamily => {
  if (uiField && TAB_LAYOUT_FIELDS.includes(uiField)) return 'tabbed';
  if (uiField && GRID_LAYOUT_FIELDS.includes(uiField)) return 'grid';
  return 'object';
};

// ── Tabbed layout ────────────────────────────────────────────────────────────

export interface TabDef {
  field: string;
  icon?: string;
  title?: string;
}

export interface TabLayoutConfig {
  tabs: TabDef[];
  useRouter: boolean;
  path: string;
  /** How the active tab is resolved: '' (state), 'query' or 'params'. */
  activeTab: string;
  activeTabKey: string;
}

export const parseTabConfig = (uiSchema: any): TabLayoutConfig => {
  const layout = Array.isArray(uiSchema?.['ui:tab-layout']) ? uiSchema['ui:tab-layout'] : [];
  const tabOptions = uiSchema?.['ui:tab-options'] || {};
  const options = uiSchema?.['ui:options'] || {};
  return {
    tabs: layout.map((t: any) => ({ field: t.field || '', icon: t.icon || '', title: t.title || '' })),
    useRouter: tabOptions.useRouter === true,
    path: typeof tabOptions.path === 'string' ? tabOptions.path : '',
    activeTab: typeof options.activeTab === 'string' ? options.activeTab : '',
    activeTabKey: typeof options.activeTabKey === 'string' ? options.activeTabKey : '',
  };
};

// ── Grid layout ──────────────────────────────────────────────────────────────

export interface GridSize {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface GridCell {
  field: string;
  size: GridSize;
  /** Preserve any other per-field grid props (sx, style, …) for round-tripping. */
  rest?: Record<string, any>;
}

export interface GridRow {
  cells: GridCell[];
}

export interface GridLayoutConfig {
  rows: GridRow[];
  spacing: number;
  container: string; // 'Paper' | 'div'
  elevation: number;
}

export const parseGridConfig = (uiSchema: any): GridLayoutConfig => {
  const layout = Array.isArray(uiSchema?.['ui:grid-layout']) ? uiSchema['ui:grid-layout'] : [];
  const gridOptions = uiSchema?.['ui:grid-options'] || {};
  const rows: GridRow[] = layout.map((rowObj: any) => {
    const cells: GridCell[] = [];
    Object.keys(rowObj || {}).forEach((fieldName) => {
      const value = rowObj[fieldName];
      if (!value || typeof value !== 'object') return;
      const { size, ...rest } = value;
      cells.push({ field: fieldName, size: (size as GridSize) || {}, rest });
    });
    return { cells };
  });
  return {
    rows,
    spacing: typeof gridOptions.spacing === 'number' ? gridOptions.spacing : 1,
    container: typeof gridOptions.container === 'string' ? gridOptions.container : 'Paper',
    elevation: typeof gridOptions.elevation === 'number' ? gridOptions.elevation : 1,
  };
};

// ── Serialisation to a uiSchema patch ────────────────────────────────────────

export interface LayoutPatch {
  /** ui: keys to set on the node. */
  set: Record<string, any>;
  /** ui: keys to delete from the node. */
  remove: string[];
}

const ALL_LAYOUT_KEYS = [
  'ui:tab-layout',
  'ui:tab-options',
  'ui:grid-layout',
  'ui:grid-options',
];

const cleanSize = (size: GridSize): GridSize => {
  const out: GridSize = {};
  (['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach((bp) => {
    const v = size[bp];
    if (typeof v === 'number' && v >= 1 && v <= 12) out[bp] = v;
  });
  return out;
};

/** Build the uiSchema patch (keys to set / remove) for the chosen layout. */
export const buildLayoutPatch = (
  uiField: string,
  family: LayoutFamily,
  existingOptions: Record<string, any>,
  tab: TabLayoutConfig,
  grid: GridLayoutConfig,
): LayoutPatch => {
  const set: Record<string, any> = {};
  const remove: string[] = [];

  // ui:field itself
  if (uiField === DEFAULT_LAYOUT) {
    remove.push('ui:field');
  } else {
    set['ui:field'] = uiField;
  }

  if (family === 'tabbed') {
    set['ui:tab-layout'] = tab.tabs
      .filter((t) => t.field)
      .map((t) => {
        const def: TabDef = { field: t.field };
        if (t.icon) def.icon = t.icon;
        if (t.title) def.title = t.title;
        return def;
      });

    if (tab.useRouter || tab.path) {
      const tabOptions: any = {};
      if (tab.useRouter) tabOptions.useRouter = true;
      if (tab.path) tabOptions.path = tab.path;
      set['ui:tab-options'] = tabOptions;
    } else {
      remove.push('ui:tab-options');
    }

    // Merge active-tab settings into ui:options, preserving other options.
    const nextOptions = { ...existingOptions };
    if (tab.activeTab) nextOptions.activeTab = tab.activeTab;
    else delete nextOptions.activeTab;
    if (tab.activeTabKey) nextOptions.activeTabKey = tab.activeTabKey;
    else delete nextOptions.activeTabKey;
    if (Object.keys(nextOptions).length > 0) set['ui:options'] = nextOptions;
    else remove.push('ui:options');

    remove.push('ui:grid-layout', 'ui:grid-options');
  } else if (family === 'grid') {
    set['ui:grid-layout'] = grid.rows.map((row) => {
      const rowObj: Record<string, any> = {};
      row.cells
        .filter((c) => c.field)
        .forEach((cell) => {
          rowObj[cell.field] = { ...(cell.rest || {}), size: cleanSize(cell.size) };
        });
      return rowObj;
    });
    set['ui:grid-options'] = {
      spacing: grid.spacing,
      container: grid.container,
      elevation: grid.elevation,
    };
    remove.push('ui:tab-layout', 'ui:tab-options');
  } else {
    // Plain object / default — strip all layout-specific keys.
    remove.push(...ALL_LAYOUT_KEYS);
  }

  return { set, remove };
};
