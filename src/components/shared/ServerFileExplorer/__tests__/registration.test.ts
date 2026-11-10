import * as fs from 'fs';
import * as path from 'path';

import { ServerFileExplorer, ServerFileExplorerComponentDefinition } from '../index';
import { folderItemFromPath } from '../utils';

/**
 * Guards for core.ServerFileExplorer@1.0.0.
 *
 * The registration itself is a data object, so it can be asserted without
 * rendering. The payload the picker reports to `onFolderSelection` is built by
 * `folderItemFromPath`, which is also asserted here.
 */
describe('core.ServerFileExplorer@1.0.0 registration', () => {
  it('exposes the agreed FQN and the shared component', () => {
    expect(ServerFileExplorerComponentDefinition.nameSpace).toBe('core');
    expect(ServerFileExplorerComponentDefinition.name).toBe('ServerFileExplorer');
    expect(ServerFileExplorerComponentDefinition.version).toBe('1.0.0');
    expect(ServerFileExplorerComponentDefinition.component).toBe(ServerFileExplorer);
  });

  it('is limited to the roles the ReactoryServerFiles resolver requires', () => {
    // The resolver returns an error response for anyone without ADMIN or
    // DEVELOPER, so registering it for USER would only ever render an error.
    expect(ServerFileExplorerComponentDefinition.roles).toEqual(['ADMIN', 'DEVELOPER']);
  });

  it('is wrapped with the API so consumers do not have to thread reactory through', () => {
    expect(ServerFileExplorerComponentDefinition.wrapWithApi).toBe(true);
  });

  it('is listed in the client component registry so it registers at bootstrap', () => {
    // componentRegistery is a hand-maintained array; importing it would pull the
    // entire client graph into this unit test, so the list is checked as text.
    const registrySource = fs.readFileSync(path.resolve(__dirname, '../../../index.tsx'), 'utf8');

    expect(registrySource).toContain(
      "import { ServerFileExplorerComponentDefinition } from './shared/ServerFileExplorer';"
    );
    expect(registrySource).toMatch(/^ {2}ServerFileExplorerComponentDefinition,$/m);
  });
});

describe('folderItemFromPath', () => {
  it('preserves an absolute resolver path verbatim so consumers can persist it', () => {
    const folder = folderItemFromPath('/Users/example/repositories/reactory');

    expect(folder.fullPath).toBe('/Users/example/repositories/reactory');
    expect(folder.name).toBe('reactory');
    expect(folder.path).toBe('reactory');
    expect(folder.type).toBe('folder');
  });

  it('does not join or rewrite templated server paths', () => {
    // The resolver is the only party that may resolve ${...} templates; the
    // component must not guess at a filesystem path.
    expect(folderItemFromPath('${APP_DATA_ROOT}/workflows').fullPath).toBe('${APP_DATA_ROOT}/workflows');
  });

  it('normalises a trailing separator for the name but keeps the reported path', () => {
    const folder = folderItemFromPath('/Users/example/repositories/reactory/');

    expect(folder.name).toBe('reactory');
    expect(folder.fullPath).toBe('/Users/example/repositories/reactory/');
  });

  it('handles the filesystem root', () => {
    const folder = folderItemFromPath('/');

    expect(folder.name).toBe('/');
    expect(folder.fullPath).toBe('/');
  });
});
