/**
 * Form-definition resolution, extracted from `useFormDefinition` so the
 * retry/no-loop behaviour can be tested without mounting the whole form.
 *
 * Two failure modes are handled here:
 *
 * 1. `ReactoryApi.form(id)` throws when *no* form list has been loaded yet —
 *    which is exactly the state after a logout cleared the cache, or before the
 *    first authenticated list fetch. We load the list once and retry, instead of
 *    leaving the form permanently unresolved.
 * 2. The server answers `ReactoryFormGetById` with `null` (unknown form, or the
 *    caller lacks the role today). That is surfaced as a terminal error so the
 *    UI can offer an explicit Retry rather than an endless skeleton.
 *
 * Retry clears only this form's cached entry, so an unrelated cached list is
 * preserved.
 */

export interface FormResolutionCallbacks {
  /** Called before each resolution attempt. */
  onLoading?: () => void;
  /** Called with a definition that can be rendered. */
  onResolved: (form: any) => void;
  /** Called when resolution cannot complete. The message is user visible. */
  onError: (message: string) => void;
}

export interface FormResolutionRequest {
  reactory: any;
  formId: string;
  loadOptions?: any;
  callbacks: FormResolutionCallbacks;
}

const messageFor = (formId: string, error?: any): string => {
  if (error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }
  return `Form "${formId}" could not be resolved`;
};

/**
 * Resolve a form definition, fetching it by id when it is absent from (or still
 * incomplete in) the cached list.
 *
 * @param request - SDK, form id and callbacks.
 * @param attempt - guarded internal retry counter. Attempt 1 is the "list was
 *   empty, we loaded it and are trying again" pass; it never loads the list a
 *   second time, which is what keeps a repeated failure from looping.
 */
export const resolveFormDefinition = (
  request: FormResolutionRequest,
  attempt: number = 0,
): void => {
  const { reactory, formId, loadOptions, callbacks } = request;
  const { onLoading, onResolved, onError } = callbacks;

  if (onLoading) onLoading();

  const handleResult = (nextForm: any, formError?: Error) => {
    if (nextForm && !formError) {
      onResolved(nextForm);
      return;
    }
    onError(messageFor(formId, formError));
  };

  let cachedDefinition: any;
  try {
    cachedDefinition = reactory.form(formId, handleResult, loadOptions || {});
  } catch (resolutionError) {
    // No form list in the SDK yet. Load it once, then retry resolution.
    if (attempt === 0 && typeof reactory.forms === 'function') {
      Promise.resolve(reactory.forms(true))
        .then(() => resolveFormDefinition(request, attempt + 1))
        .catch((loadError) => onError(messageFor(formId, loadError)));
      return;
    }

    onError(messageFor(formId, resolutionError));
    return;
  }

  if (cachedDefinition === null || cachedDefinition === undefined) {
    // The by-id fetch is in flight; `handleResult` settles it.
    return;
  }

  // A complete cached definition (or one that is still being completed by the
  // by-id fetch above) can be rendered immediately.
  onResolved(cachedDefinition);
};

/**
 * Retry resolution after a failure: drop the cached/errored entry for this form
 * only, then resolve again.
 */
export const retryFormDefinitionResolution = (request: FormResolutionRequest): void => {
  const { reactory, formId } = request;

  if (reactory && typeof reactory.clearFormCache === 'function') {
    reactory.clearFormCache(formId);
  }

  resolveFormDefinition(request, 0);
};

/**
 * Handler invoked when the SDK reports that a session became available.
 *
 * Resolution is role-scoped on the server, so a definition obtained before a
 * login is not authoritative. Clearing the stage state and resolving again is
 * what lets a form that failed while logged out recover after the user logs
 * back in — the ticket's "logged out, then logged back in" criterion.
 */
export interface SessionAvailableDeps {
  /** Resets the granular loading stages (clears a prior error state). */
  resetLoadingState: () => void;
  /** Re-runs resolution. */
  resolve: () => void;
}

export const applySessionAvailable = (deps: SessionAvailableDeps): void => {
  deps.resetLoadingState();
  deps.resolve();
};

/**
 * Subscribes `handler` to the SDK's login event.
 *
 * Returns an unsubscribe function so the caller's effect cleanup removes the
 * exact handler reference it registered (an inline arrow would never match on
 * `off`, leaking the listener across mounts).
 *
 * A SDK without an `on` function (e.g. a bare mock) is tolerated: the returned
 * unsubscribe is a no-op.
 */
export const subscribeToSessionAvailable = (
  api: { on?: (...args: any[]) => any; off?: (...args: any[]) => any } | null | undefined,
  eventName: string,
  handler: () => void,
): (() => void) => {
  if (!api || typeof api.on !== 'function') return () => undefined;

  api.on(eventName, handler);

  return () => {
    if (typeof api.off === 'function') api.off(eventName, handler);
  };
};