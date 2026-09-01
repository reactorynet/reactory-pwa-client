/**
 * Responsible for generating the __index.ts
 * imports file for client-side plugins and widgets.
 */
import fs from 'fs';
import path from 'path';
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
 * Scan for local plugin directories inside src/components/plugins/
 */
const getLocalPluginDirectories = (): string[] => {
  const pluginsDir = resolvePluginsFolder();
  if (!fs.existsSync(pluginsDir)) return [];

  const excluded = ['index.ts', '__index.ts', 'pluginImportFactory.ts', 'README.md', '.DS_Store'];
  try {
    return fs.readdirSync(pluginsDir).filter((entry) => {
      if (excluded.includes(entry)) return false;
      const fullPath = path.join(pluginsDir, entry);
      return fs.statSync(fullPath).isDirectory();
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
