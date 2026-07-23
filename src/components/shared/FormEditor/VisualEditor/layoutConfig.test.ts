/**
 * Unit tests for the layout config parse/serialize helpers that power the
 * Layout Designer dialog.
 */

import {
  getLayoutFamily,
  parseTabConfig,
  parseGridConfig,
  buildLayoutPatch,
} from './layoutConfig';

describe('getLayoutFamily', () => {
  it('classifies tab, grid and object layouts', () => {
    expect(getLayoutFamily('TabbedLayout')).toBe('tabbed');
    expect(getLayoutFamily('AccordionLayout')).toBe('tabbed');
    expect(getLayoutFamily('GridLayout')).toBe('grid');
    expect(getLayoutFamily('ColumnLayout')).toBe('grid');
    expect(getLayoutFamily('ObjectField')).toBe('object');
    expect(getLayoutFamily(undefined)).toBe('object');
  });
});

describe('tabbed layout round-trip', () => {
  // Mirrors the real Application uiSchema tabbed example.
  const tabbedUISchema = {
    'ui:field': 'TabbedLayout',
    'ui:tab-layout': [
      { field: 'overview', icon: 'dashboard', title: 'Overview' },
      { field: 'settings', icon: 'settings', title: 'Settings' },
    ],
    'ui:tab-options': { useRouter: true, path: '/applications/${id}?tab=${tab_id}' },
    'ui:options': { activeTab: 'query', activeTabKey: 'tab' },
    overview: { 'ui:widget': 'ApplicationOverviewPanel' },
  };

  it('parses the tab configuration', () => {
    const cfg = parseTabConfig(tabbedUISchema);
    expect(cfg.tabs).toEqual([
      { field: 'overview', icon: 'dashboard', title: 'Overview' },
      { field: 'settings', icon: 'settings', title: 'Settings' },
    ]);
    expect(cfg.useRouter).toBe(true);
    expect(cfg.path).toBe('/applications/${id}?tab=${tab_id}');
    expect(cfg.activeTab).toBe('query');
    expect(cfg.activeTabKey).toBe('tab');
  });

  it('rebuilds an equivalent patch and preserves unrelated ui:options', () => {
    const cfg = parseTabConfig(tabbedUISchema);
    const patch = buildLayoutPatch('TabbedLayout', 'tabbed', tabbedUISchema['ui:options'], cfg, parseGridConfig({}));

    expect(patch.set['ui:field']).toBe('TabbedLayout');
    expect(patch.set['ui:tab-layout']).toEqual(tabbedUISchema['ui:tab-layout']);
    expect(patch.set['ui:tab-options']).toEqual({ useRouter: true, path: '/applications/${id}?tab=${tab_id}' });
    expect(patch.set['ui:options']).toEqual({ activeTab: 'query', activeTabKey: 'tab' });
    // Switching away from grid must clear grid keys.
    expect(patch.remove).toEqual(expect.arrayContaining(['ui:grid-layout', 'ui:grid-options']));
  });

  it('omits empty tab fields and drops default tab-options', () => {
    const cfg = parseTabConfig({});
    cfg.tabs = [{ field: 'a', icon: '', title: '' }, { field: '', icon: 'x', title: 'skip' }];
    const patch = buildLayoutPatch('TabbedLayout', 'tabbed', {}, cfg, parseGridConfig({}));
    expect(patch.set['ui:tab-layout']).toEqual([{ field: 'a' }]); // empty icon/title omitted, empty field dropped
    expect(patch.remove).toContain('ui:tab-options'); // no router / path → removed
    expect(patch.remove).toContain('ui:options'); // no active tab settings → removed
  });
});

describe('grid layout round-trip', () => {
  const gridUISchema = {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      { first: { size: { xs: 12, md: 6 } }, last: { size: { xs: 12, md: 6 } } },
      { notes: { size: { xs: 12 } } },
    ],
    'ui:grid-options': { spacing: 2, container: 'Paper', elevation: 3 },
  };

  it('parses rows, cells, sizes and options', () => {
    const cfg = parseGridConfig(gridUISchema);
    expect(cfg.rows).toHaveLength(2);
    expect(cfg.rows[0].cells.map((c) => c.field)).toEqual(['first', 'last']);
    expect(cfg.rows[0].cells[0].size).toEqual({ xs: 12, md: 6 });
    expect(cfg.spacing).toBe(2);
    expect(cfg.container).toBe('Paper');
    expect(cfg.elevation).toBe(3);
  });

  it('rebuilds an equivalent grid-layout patch and clears tab keys', () => {
    const cfg = parseGridConfig(gridUISchema);
    const patch = buildLayoutPatch('GridLayout', 'grid', {}, parseTabConfig({}), cfg);
    expect(patch.set['ui:grid-layout']).toEqual(gridUISchema['ui:grid-layout']);
    expect(patch.set['ui:grid-options']).toEqual({ spacing: 2, container: 'Paper', elevation: 3 });
    expect(patch.remove).toEqual(expect.arrayContaining(['ui:tab-layout', 'ui:tab-options']));
  });

  it('clamps out-of-range breakpoint sizes and drops invalid ones', () => {
    const cfg = parseGridConfig({});
    cfg.rows = [{ cells: [{ field: 'a', size: { xs: 99 as any, md: 0 as any, lg: 4 } }] }];
    const patch = buildLayoutPatch('GridLayout', 'grid', {}, parseTabConfig({}), cfg);
    // xs=99 and md=0 are out of [1,12] and dropped; lg=4 kept.
    expect(patch.set['ui:grid-layout'][0].a.size).toEqual({ lg: 4 });
  });
});

describe('default / object layout', () => {
  it('removes ui:field and all layout keys', () => {
    const patch = buildLayoutPatch('ObjectField', 'object', {}, parseTabConfig({}), parseGridConfig({}));
    expect(patch.set['ui:field']).toBeUndefined();
    expect(patch.remove).toEqual(
      expect.arrayContaining(['ui:field', 'ui:tab-layout', 'ui:tab-options', 'ui:grid-layout', 'ui:grid-options']),
    );
  });
});
