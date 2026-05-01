/**
 * Public types and module augmentations exposed by the form engine.
 *
 * Importing this file (transitively) augments `Reactory.Forms.IReactoryForm`
 * with an `options.engine` field so per-form engine pinning is a real
 * typed concern rather than a stringly-typed extension.
 */

import type { FormEngine } from './hooks/useReactoryForm';

declare global {
  namespace Reactory {
    namespace Forms {
      interface IReactoryFormEngineOptions {
        /**
         * Pin the rendering engine for this form. Overrides the
         * `forms.useV5Engine` feature flag. Use 'fork' to keep a form on
         * the legacy renderer during the migration; use 'v5' to opt a
         * specific form into the new engine ahead of the global flip.
         */
        engine?: FormEngine;
      }

      interface IReactoryForm {
        /**
         * Form-engine specific options. Read by EngineDispatchedForm at
         * render time. See ADR-0006 (coexistence strategy) for the
         * rollout plan.
         */
        options?: IReactoryFormEngineOptions;
      }
    }
  }
}

export type { FormEngine };
