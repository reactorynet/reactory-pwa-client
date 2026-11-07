/**
 * Local type augmentation for `Reactory.Forms.IReactoryFormQueryErrorHandlerDefinition`.
 *
 * `useGraphQLDataManager` supports a form-definition hint that maps a server
 * `extensions` key onto a schema path so a mutation error can be rendered on
 * the offending field:
 *
 *   graphql.mutation.edit.onError.fieldMap = { classCode: 'code' }
 *
 * The `fieldMap` property is a pending addition to
 * `Reactory.Forms.IReactoryFormQueryErrorHandlerDefinition` in
 * `@reactorynet/reactory-core` (declared in `dist/types/forms/index.d.ts`).
 * Until that package ships it, this ambient declaration merges the property
 * into the global `Reactory.Forms` namespace so form definitions **in this
 * repository** type-check. It is declaration-merging only — no runtime code.
 *
 * Remove this file once the installed `@reactorynet/reactory-core` version
 * declares `fieldMap` (an identical optional property merges harmlessly, but
 * the augmentation would then be dead weight).
 *
 * NOTE: this file must stay free of imports/exports. The `Reactory` namespace
 * is declared globally by the core package; adding `export {}` would turn this
 * into a module and the merge would silently stop applying.
 */
declare namespace Reactory {
  export namespace Forms {
    export interface IReactoryFormQueryErrorHandlerDefinition {
      /**
       * Maps a server error identifier to a schema path, so a failed mutation
       * can highlight the offending field.
       *
       * Resolution in `useGraphQLDataManager`:
       *  - `errors[n].extensions.field` (also `fieldPath` / `path` /
       *    `argumentName`) is looked up in this map;
       *  - if the server sends no field, a key (or its destination path) found
       *    in the error message is used — which is what makes a plain
       *    `throw new Error("...")` resolver resolvable;
       *  - anything unmatched falls back to the form-level `_error`.
       *
       * @example { classCode: 'code' }
       */
      fieldMap?: Record<string, string>;
    }
  }
}
