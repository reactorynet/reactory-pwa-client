/**
 * Build a Reactory-flavoured rjsf validator on top of @rjsf/validator-ajv8.
 *
 * Wraps `customizeValidator` from upstream with:
 *   - Default ajv options tuned for form rendering (allErrors, verbose, strict=false)
 *   - A localizer routed through `reactory.i18n.t` (see ./localizer.ts)
 *   - Reactory-specific custom formats (reactory-fqn, reactory-username, etc.)
 *
 * Per ADR-0002 we explicitly take a dependency on @rjsf/validator-ajv8 rather
 * than building our own ajv glue. This keeps async validators, the
 * additionalMetaSchemas hook, and precompiled validator support available
 * without us having to maintain them.
 */

import { customizeValidator } from '@rjsf/validator-ajv8';
import type { ValidatorType } from '@rjsf/utils';
import { localizerFor, type ReactoryLocalizerSdk } from './localizer';

export interface ReactoryValidatorOptions {
  /** Reactory SDK handle. Required so error messages can be localized. */
  reactory: ReactoryLocalizerSdk;
  /**
   * User-supplied custom formats. Merged on top of the engine's built-in set;
   * user keys win on conflict.
   */
  customFormats?: Record<string, string | RegExp | ((data: string) => boolean)>;
  /** Overrides to the underlying ajv constructor options. */
  ajvOptionsOverrides?: Record<string, unknown>;
  /**
   * Disable the localizer entirely. Tests sometimes assert on raw AJV
   * messages; production callers should leave this undefined.
   */
  disableLocalizer?: boolean;
}

/**
 * Engine-built-in custom formats. Each entry is a regex; anchored implicitly
 * by ajv when the format is applied. Add entries here when a Reactory schema
 * type becomes ubiquitous enough to warrant a shared format.
 */
export const REACTORY_BUILT_IN_FORMATS: Record<string, RegExp> = {
  // Fully Qualified Name: namespace.Name with optional @version (semver-ish).
  // Namespace: lowercase letter start, then word/dash chars.
  // Name: any letter start, then word/dash chars.
  // Version: alphanumerics, dots, dashes (loosely matches semver and tag names).
  'reactory-fqn': /^[a-z][\w-]*\.[A-Za-z][\w-]*(?:@[\w.-]+)?$/,
  // UUID v1-v5 (8-4-4-4-12 hex with version nibble in [1-5]).
  'reactory-uuid': /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
  // Tenant slug: lowercase letters, digits, dashes; 2..64 chars.
  'reactory-tenant-id': /^[a-z][a-z0-9-]{1,63}$/,
  // Username: letters, digits, dot, underscore, dash; 2..64 chars.
  'reactory-username': /^[A-Za-z0-9._-]{2,64}$/,
};

/**
 * Construct a fresh validator bound to the provided Reactory SDK. Each form
 * mount typically constructs its own validator (memoized at the
 * useReactoryForm layer) so locale and customFormats can vary per form.
 */
export function createReactoryValidator(
  options: ReactoryValidatorOptions,
): ValidatorType {
  const customFormats = {
    ...REACTORY_BUILT_IN_FORMATS,
    ...(options.customFormats ?? {}),
  };

  const ajvOptionsOverrides = {
    strict: false,
    allErrors: true,
    verbose: true,
    ...(options.ajvOptionsOverrides ?? {}),
  };

  const localizer = options.disableLocalizer ? undefined : localizerFor(options.reactory);

  return customizeValidator(
    {
      customFormats,
      ajvOptionsOverrides,
    },
    localizer,
  );
}
