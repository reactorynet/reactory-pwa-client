import * as MaterialCore from '@mui/material';
import { withMaterialCoreAliases } from '../materialCompat';

describe('withMaterialCoreAliases', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('resolves the removed Grid2 export to Grid for plugins that still destructure it', () => {
    const core = withMaterialCoreAliases(MaterialCore);
    const { Grid2 } = core as typeof core & { Grid2: unknown };
    expect(Grid2).toBe(MaterialCore.Grid);
    expect('Grid2' in core).toBe(true);
  });

  it('warns once per alias, not on every access', () => {
    let fresh: typeof withMaterialCoreAliases = withMaterialCoreAliases;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fresh = require('../materialCompat').withMaterialCoreAliases;
    });
    const core = fresh({ Grid: 'grid' }) as { Grid: string; Grid2?: string };
    expect(core.Grid2).toBe('grid');
    expect(core.Grid2).toBe('grid');
    const grid2Warnings = warn.mock.calls.filter(([msg]) => String(msg).includes('Grid2'));
    expect(grid2Warnings).toHaveLength(1);
  });

  it('passes every other export through unchanged', () => {
    const core = withMaterialCoreAliases(MaterialCore);
    expect(core.Button).toBe(MaterialCore.Button);
    expect(core.Grid).toBe(MaterialCore.Grid);
    expect((core as Record<string, unknown>).NotAnExport).toBeUndefined();
  });
});
