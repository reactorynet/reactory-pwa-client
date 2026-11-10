/**
 * Responsible for generating the __index.ts
 * imports file for client-side plugins and widgets.
 */
import * as fs from 'fs';
import * as path from 'path';
import Reactory from '@reactorynet/reactory-core';

interface IModuleDefinition {
  id: string;
  name: string;
  key: string;
  fqn: string;
  moduleEntry?: string;
  clientEntry?: string;
  [key: string]: any;
}

const getImportName = (moduleDef: IModuleDefinition): string => {
  let name = (moduleDef.fqn || moduleDef.id || moduleDef.name || 'plugin')
    .replace(/\./g, '_')
    .replace(/-/g, '__')
    .replace(/@/g, '_VER_')
    .replace(/\//g, '_');
  return `plugin_${name}`;
};

const resolvePluginsFolder = (): string => {
  return path.resolve(process.cwd(), 'src/components/plugins');
};

const resolveModulesDefinitionsFile = (): string | null => {
  const clientKey =
    process.env.REACT_APP_CLIENT_KEY ||
    process.env.REACTORY_CONFIG_ID ||
    'reactory';

  const modulesEnabled =
    process.env.MODULES_ENABLED ||
    `enabled-${clientKey}`;

  const candidates: string[] = [
    // Explicit environment variable if provided
    process.env.MODULES_FILE || '',
    // reactory-express-server sibling folder
    path.resolve(process.cwd(), `../reactory-express-server/src/modules/${modulesEnabled}.json`),
    path.resolve(process.cwd(), `../reactory-express-server/src/modules/enabled-reactory.json`),
    path.resolve(process.cwd(), `../reactory-express-server/src/modules/available.json`),
    // local client config or modules directory
    path.resolve(process.cwd(), `src/modules/${modulesEnabled}.json`),
    path.resolve(process.cwd(), `src/modules/enabled-reactory.json`),
    path.resolve(process.cwd(), `config/env/${clientKey}/modules.json`),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

export const getEnabledModuleDefinitions = (): IModuleDefinition[] => {
  const file = resolveModulesDefinitionsFile();
  if (file && fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data)) return data;
    } catch (err: any) {
      console.warn(`[pluginImportFactory] Warning: Failed to parse modules file ${file}:`, err.message);
    }
  }
  return [];
};

/**
 * Entry points a plugin directory may expose, in resolution order.
 *
 * `index.ts(x)` is the convention; the others are accepted so a plugin can ship
 * a compiled entry point or declare one in its own package.json.
 */
const PLUGIN_ENTRY_CANDIDATES = [
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'package.json',
];

/**
 * True when `pluginDir` contains something importable.
 *
 * The generator used to import EVERY directory under `plugins/`, which breaks the
 * client build the moment a directory has no entry point:
 *
 *     error TS2307: Cannot find module './some-dir' or its corresponding type declarations
 *
 * That is not hypothetical. `plugins/reactory-core` and (planned)
 * `plugins/reactory-communicator` are git submodules, so a fresh clone — or a
 * `git submodule update` that has not been run — leaves an EMPTY directory. The
 * generator then emits an import for it and the whole client fails to compile with
 * a message that names neither submodules nor the generator.
 *
 * Checking for an entry point makes an uninitialised submodule a no-op instead of
 * a build failure, and the skip is reported so the cause is visible.
 */
const hasPluginEntryPoint = (pluginDir: string): boolean =>
  PLUGIN_ENTRY_CANDIDATES.some((entry) => fs.existsSync(path.join(pluginDir, entry)));

/**
 * Scan for local plugin directories inside src/components/plugins/
 *
 * Directories without an entry point are skipped and reported: an empty one is
 * almost always an uninitialised submodule, which the operator can fix with
 * `git submodule update --init --recursive`.
 */
const getLocalPluginDirectories = (): string[] => {
  const pluginsDir = resolvePluginsFolder();
  if (!fs.existsSync(pluginsDir)) return [];

  const excluded = ['index.ts', '__index.ts', 'pluginImportFactory.ts', 'README.md', '.DS_Store'];
  try {
    return fs.readdirSync(pluginsDir).filter((entry) => {
      if (excluded.includes(entry)) return false;
      const fullPath = path.join(pluginsDir, entry);
      if (!fs.statSync(fullPath).isDirectory()) return false;
      if (!hasPluginEntryPoint(fullPath)) {
        console.warn(
          `[pluginImportFactory] Skipping './${entry}': no entry point ` +
            `(${PLUGIN_ENTRY_CANDIDATES.join(', ')}). ` +
            `If this is a plugin submodule, run: git submodule update --init --recursive`,
        );
        return false;
      }
      return true;
    });
  } catch {
    return [];
  }
};

const generateHeader = () => {
  return `/**
 * ©️ Reactory Client - Generated Code - Do not modify!
 * CODE-GENERATED: Do not modify!
 *
 * This file is generated with each startup and build based on the active client configuration.
 * See README.md in this folder for more details.
 */
import Reactory from '@reactorynet/reactory-core';
`;
};

/**
 * Generates src/components/plugins/__index.ts
 */
export const generatePluginIndex = (): { generated: boolean; pluginCount: number; path: string } => {
  const pluginsFolder = resolvePluginsFolder();
  const __index = path.join(pluginsFolder, '__index.ts');

  if (!fs.existsSync(pluginsFolder)) {
    fs.mkdirSync(pluginsFolder, { recursive: true });
  }

  const enabledModules = getEnabledModuleDefinitions();
  const localPlugins = getLocalPluginDirectories();

  const importStatements: string[] = [];
  const componentSpreadEntries: string[] = [];

  // 1. Process local plugin folders in src/components/plugins/
  localPlugins.forEach((pluginName) => {
    const importVar = `local_plugin_${pluginName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    importStatements.push(`import * as ${importVar} from './${pluginName}';`);
    componentSpreadEntries.push(
      `  ...(Array.isArray(${importVar}.default) ? ${importVar}.default : (${importVar}.components || []))`
    );
  });

  // 2. Process enabled modules that provide client plugins or components
  enabledModules.forEach((moduleDef) => {
    const importName = getImportName(moduleDef);

    // Check potential client entry points for module
    const clientPathCandidates = [
      moduleDef.clientEntry ? `./${moduleDef.clientEntry}` : null,
      `./${moduleDef.key}`,
      `./${moduleDef.id}`,
    ].filter(Boolean) as string[];

    for (const candidate of clientPathCandidates) {
      const fullPath = path.resolve(pluginsFolder, candidate);
      if (fs.existsSync(fullPath) || fs.existsSync(`${fullPath}.ts`) || fs.existsSync(`${fullPath}.tsx`)) {
        if (!importStatements.some((stmt) => stmt.includes(candidate))) {
          importStatements.push(`import * as ${importName} from '${candidate}';`);
          componentSpreadEntries.push(
            `  ...(Array.isArray(${importName}.default) ? ${importName}.default : (${importName}.components || []))`
          );
        }
        break;
      }
    }
  });

  let fileContents = generateHeader();

  if (importStatements.length > 0) {
    fileContents += `\n${importStatements.join('\n')}\n\n`;
    fileContents += `const pluginComponents: Reactory.Client.IReactoryComponentRegistryEntry<any>[] = [\n${componentSpreadEntries.join(',\n')}\n];\n\n`;
    fileContents += `export default pluginComponents;\n`;
  } else {
    fileContents += `\nconst pluginComponents: Reactory.Client.IReactoryComponentRegistryEntry<any>[] = [];\n\n`;
    fileContents += `export default pluginComponents;\n`;
  }

  let doWrite = true;
  if (fs.existsSync(__index)) {
    const existing = fs.readFileSync(__index, 'utf8');
    doWrite = existing !== fileContents;
  }

  if (doWrite) {
    fs.writeFileSync(__index, fileContents, 'utf8');
    console.log(`✨ [pluginImportFactory] Generated ${__index} (${componentSpreadEntries.length} plugins registered)`);
  } else {
    console.log(`ℹ️ [pluginImportFactory] ${__index} is up to date.`);
  }

  return {
    generated: doWrite,
    pluginCount: componentSpreadEntries.length,
    path: __index,
  };
};

export default generatePluginIndex;
