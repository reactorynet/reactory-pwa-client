import * as MaterialCore from '@mui/material';

/**
 * MUI 7 renamed `Grid2` to `Grid`. Plugins compiled outside this repo may
 * still destructure `Grid2` from the registry's MaterialCore, and would get
 * `undefined` (a render crash) without this alias. Remove it in the MUI 9
 * phase, one release after it starts warning.
 */
const REMOVED_ALIASES: Record<string, keyof typeof MaterialCore> = {
  Grid2: 'Grid',
};

const warned = new Set<string>();

export const withMaterialCoreAliases = <T extends object>(core: T): T =>
  new Proxy(core, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && !(prop in target) && prop in REMOVED_ALIASES) {
        const replacement = REMOVED_ALIASES[prop];
        if (!warned.has(prop)) {
          warned.add(prop);
          // eslint-disable-next-line no-console
          console.warn(
            `material-ui.MaterialCore.${prop} is deprecated and will be removed; use ${String(replacement)} instead.`,
          );
        }
        return Reflect.get(target, replacement, receiver);
      }
      return Reflect.get(target, prop, receiver);
    },
    has(target, prop) {
      return prop in REMOVED_ALIASES || Reflect.has(target, prop);
    },
  });

export const MaterialCoreCompat = withMaterialCoreAliases(MaterialCore);
