/**
 * Runtime plugin smoke harness (MUI 9 / React 19 upgrade, Phase 0).
 *
 * Runtime plugins are built outside this repository and receive React, the
 * MUI bundle and `core.*` components from the client's registry at runtime,
 * so nothing typechecks them against the versions the client ships. This
 * suite loads every plugin entry the way the browser does (it registers
 * itself on `window.reactory.api`), renders each component it registers with
 * the real registry, and compares the outcome to `baseline.json`.
 *
 * The baseline is a ratchet: a plugin that loaded or rendered before must
 * still do so. Plugins that fail with the generic smoke props today are
 * recorded, not hidden, and do not fail the run. Refresh the baseline after an
 * intended change with `UPDATE_PLUGIN_BASELINE=1 yarn test:plugins`.
 */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { discoverPlugins, pluginsDir } from './discoverPlugins';
import { createPluginHost } from './pluginHost';

type Status = 'ok' | 'error' | 'skipped';

interface PluginOutcome {
  load: Status;
  loadError?: string;
  components: Record<string, { render: Status; error?: string }>;
}

type Baseline = Record<string, PluginOutcome>;

const BASELINE_FILE = path.join(__dirname, 'baseline.json');
const UPDATE = process.env.UPDATE_PLUGIN_BASELINE === '1';
const plugins = discoverPlugins();
const baseline: Baseline = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : {};
const outcomes: Baseline = {};

const firstLine = (err: unknown): string => String((err as Error)?.message ?? err).split('\n')[0].slice(0, 240);

const isRenderable = (fqn: string, component: unknown): boolean => {
  const name = fqn.split('@')[0].split('.').pop() || '';
  if (/^use[A-Z]/.test(name)) return false;
  if (typeof component === 'function') return true;
  return typeof component === 'object' && component !== null && '$$typeof' in component;
};

class Boundary extends React.Component<{ onError: (e: Error) => void; children?: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const theme = createTheme();

const noop = (): void => undefined;

/**
 * Generic prop sets, tried in order. The first is what a bare form widget
 * gets; the second adds the empty row/table data that MaterialTableWidget
 * hands to toolbars and detail panels. A component counts as rendered when
 * any set mounts without throwing.
 */
const propSets = (sdk: unknown): Array<Record<string, unknown>> => {
  const base = {
    reactory: sdk,
    api: sdk,
    formData: undefined,
    schema: { type: 'object', properties: {} },
    uiSchema: {},
    idSchema: { $id: 'plugin_smoke' },
    formContext: { reactory: sdk, formData: {} },
    onChange: noop,
  };
  return [
    base,
    {
      ...base,
      formData: {},
      rowData: {},
      data: { data: [], paging: { page: 1, pageSize: 10, total: 0, hasNext: false } },
      selectedRows: [],
      onDataChange: noop,
      onSelectionChange: noop,
      formContext: { reactory: sdk, formData: {}, $ref: {} },
    },
  ];
};

function renderComponent(Component: React.ComponentType<Record<string, unknown>>, sdk: unknown): string | undefined {
  let firstError: string | undefined;
  for (const props of propSets(sdk)) {
    const error = renderWith(Component, props);
    if (!error) return undefined;
    firstError = firstError || error;
  }
  return firstError;
}

function renderWith(Component: React.ComponentType<Record<string, unknown>>, props: Record<string, unknown>): string | undefined {
  let caught: string | undefined;
  try {
    act(() => {
      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <Boundary onError={(e) => { caught = firstLine(e); }}>
              <Component {...props} />
            </Boundary>
          </MemoryRouter>
        </ThemeProvider>,
      );
    });
  } catch (err) {
    caught = caught || firstLine(err);
  }
  cleanup();
  return caught;
}

describe('runtime plugin smoke harness', () => {
  let consoleError: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;

  beforeAll(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterAll(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    if (UPDATE) {
      const sorted = Object.keys(outcomes).sort().reduce<Baseline>((acc, k) => ({ ...acc, [k]: outcomes[k] }), {});
      fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
    }
    const all = Object.values(outcomes);
    const comps = all.flatMap((o) => Object.values(o.components));
    // eslint-disable-next-line no-console
    console.log(
      `[plugin-smoke] ${all.length} plugins from ${pluginsDir()}: ` +
        `${all.filter((o) => o.load === 'ok').length} loaded, ` +
        `${comps.filter((c) => c.render === 'ok').length}/${comps.length} components rendered, ` +
        `${comps.filter((c) => c.render === 'skipped').length} skipped (non-components)`,
    );
  });

  it('finds the runtime plugins', () => {
    if (plugins.length === 0) {
      throw new Error(
        `No runtime plugins found in ${pluginsDir()}. Check out reactory-data next to this repository or set REACTORY_PLUGINS_DIR.`,
      );
    }
    if (!UPDATE) {
      const unknown = plugins.map((p) => p.key).filter((k) => !baseline[k]);
      expect({ notInBaseline: unknown }).toEqual({ notInBaseline: [] });
    }
  });

  it.each(plugins.map((p) => [p.key, p] as const))('%s', (key, plugin) => {
    const { sdk, registered } = createPluginHost(theme);
    const outcome: PluginOutcome = { load: 'ok', components: {} };
    (window as unknown as { reactory?: unknown }).reactory = { api: sdk };

    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require(plugin.file);
      });
    } catch (err) {
      outcome.load = 'error';
      outcome.loadError = firstLine(err);
    }

    registered.forEach(({ fqn, component }) => {
      if (!isRenderable(fqn, component)) {
        outcome.components[fqn] = { render: 'skipped' };
        return;
      }
      const error = renderComponent(component as React.ComponentType<Record<string, unknown>>, sdk);
      outcome.components[fqn] = error ? { render: 'error', error } : { render: 'ok' };
    });

    delete (window as unknown as { reactory?: unknown }).reactory;
    outcomes[key] = outcome;
    if (UPDATE) return;

    const before = baseline[key];
    if (!before) return;
    const regressions: string[] = [];
    if (before.load === 'ok' && outcome.load !== 'ok') regressions.push(`load: ${outcome.loadError}`);
    Object.entries(before.components).forEach(([fqn, was]) => {
      const now = outcome.components[fqn];
      if (!now) {
        if (was.render !== 'error') regressions.push(`${fqn}: no longer registered`);
      } else if (was.render === 'ok' && now.render !== 'ok') {
        regressions.push(`${fqn}: ${now.error ?? now.render}`);
      }
    });
    expect(regressions).toEqual([]);
  });
});
