import * as fs from 'fs';
import * as path from 'path';

export interface PluginEntry {
  /** Stable key, relative to the plugins root: `src/<plugin>@<version>/<file>`. */
  key: string;
  /** Absolute path of the source entry rollup builds. */
  file: string;
  /** Name of the rollup config that declares this entry. */
  rollupConfig: string;
}

export const DEFAULT_PLUGINS_DIR = path.resolve(__dirname, '../../../reactory-data/plugins/__runtime__');

export const pluginsDir = (): string => path.resolve(process.env.REACTORY_PLUGINS_DIR || DEFAULT_PLUGINS_DIR);

const INPUT_PATTERN = /\binput:\s*["'`]([^"'`]+)["'`]/;

/**
 * The generated `rollup.<fqn>.js` configs are the source of truth for which
 * file is a plugin's entry: several plugins do not use `entry.tsx`. Their
 * `input` is an absolute path on the machine that generated them, so only the
 * part from `src/` on is kept and re-rooted at the plugins directory.
 */
export function discoverPlugins(root: string = pluginsDir()): PluginEntry[] {
  if (!fs.existsSync(root)) return [];
  const entries: PluginEntry[] = [];
  for (const name of fs.readdirSync(root).sort()) {
    if (!/^rollup\..+\.js$/.test(name) || name === 'rollup.config.js') continue;
    const match = INPUT_PATTERN.exec(fs.readFileSync(path.join(root, name), 'utf8'));
    if (!match) continue;
    const srcIndex = match[1].lastIndexOf('/src/');
    if (srcIndex < 0) continue;
    const key = match[1].slice(srcIndex + 1);
    const file = path.join(root, key);
    if (!fs.existsSync(file)) continue;
    entries.push({ key, file, rollupConfig: name });
  }
  return entries;
}
