/**
 * `useMyDemographics` — the self-service demographics data surface (ORG-034).
 *
 * The shared renderer in `reactory-core/demographic-form` is deliberately
 * transport agnostic: it renders definitions, reports edits and displays the
 * errors it is given. Everything below is therefore this section's job:
 *
 *  - read the enabled definitions, the caller's values and the organization's
 *    self-service policy for the **active organization**, and only those — in
 *    one parallel round trip, so the form's first paint already knows whether
 *    it may be edited;
 *  - never let one organization's data reach another. This is enforced twice:
 *    the **read** view is derived from the scope the loaded data actually
 *    belongs to (`loadedScope`), so a prop change cannot render the previous
 *    organization's answers even for one frame; and the **write** path is
 *    scope-guarded, so a mutation that resolves after the member moved on is
 *    discarded instead of being merged into the new organization's state;
 *  - save only the definitions the member actually answered, without a `user`
 *    field (the server writes for the caller and rejects a foreign id);
 *  - translate the server's field-level rejections onto the right fields, and
 *    treat a policy refusal as read-only rather than as a retryable error.
 *
 * Sensitive definitions render normally for their owner, but no value — sensitive
 * or not — is ever placed in a log line or a notification by this hook: the
 * notifications it raises are fixed strings and the log entry it writes carries
 * only the organization id.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  DemographicDefinition,
  DemographicErrors,
  DemographicValueChange,
  DemographicValues,
} from '../../../../../../plugins/reactory-core/demographic-form';
import { selectRenderableDefinitions } from '../../../../../../plugins/reactory-core/demographic-form';
import {
  MY_DEMOGRAPHICS,
  MY_SAVE_DEMOGRAPHICS,
  OPERATIONS,
  ORGANIZATION_DEMOGRAPHICS_POLICY,
  ORGANIZATION_DEMOGRAPHIC_DEFINITIONS,
} from '../graphql';
import {
  buildSavePayload,
  describeSaveFailure,
  envelopeErrorsOf,
  requiredFieldErrors,
  serverMessageOf,
  toValuesRecord,
} from '../utils';

/** Message shown when the save fails for a reason the server did not explain. */
const SAVE_FALLBACK_MESSAGE = 'Your demographics could not be saved.';
/** Message shown when the section has no GraphQL transport to talk to. */
const API_UNAVAILABLE_MESSAGE = 'The demographics service is not available right now.';
/** Message shown when the read failed without an explanation. */
const LOAD_FALLBACK_MESSAGE = 'Your demographics could not be loaded.';
/** Notification copy on a successful save. Never includes a value. */
const SAVE_SUCCESS_NOTIFICATION = 'Your demographics have been saved.';

export interface UseMyDemographicsOptions {
  reactory: any;
  /** The organization the profile shell is showing. */
  organizationId?: string | null;
  /** The membership driving the read/write, when one is selected. */
  membershipId?: string | null;
  /**
   * Host override for `OrganizationDemographicsPolicy.selfServiceEnabled`.
   *
   * The hook reads the policy itself; this wins when supplied, for a host that
   * already has the value (or needs to force read-only, e.g. a viewer role).
   */
  selfServiceEnabled?: boolean;
  /** Set false to defer the read (tests, lazy hosts). */
  autoLoad?: boolean;
}

export interface UseMyDemographicsResult {
  /** Enabled definitions for the active organization, in ordinal order. */
  definitions: DemographicDefinition[];
  /** Current form values, keyed by definition key. */
  values: DemographicValues;
  /** True while the definitions/values/policy read is in flight. */
  loading: boolean;
  /**
   * True once a read for the *current* scope has settled (successfully or not).
   *
   * The section gates the form on this so it paints once per scope, after the
   * policy is known. Without it the first paint of a fresh mount is an empty
   * "nothing configured" card that flips to the form a tick later.
   */
  hasLoaded: boolean;
  /** True while the save mutation is in flight, for the current scope only. */
  saving: boolean;
  /** A read failure, rendered as a banner. Never set by a write. */
  loadError: string | null;
  /** Inline server/local validation messages keyed by definition key. */
  fieldErrors: DemographicErrors;
  /** A form-level failure message (no field could be blamed). */
  formError: string | null;
  /**
   * True when self-service writes are not allowed: the host override is false,
   * the organization's policy read says false, or the server refused a save on
   * policy grounds. The section renders its read-only explanation from this.
   */
  selfServiceDisabled: boolean;
  /**
   * The raw policy read for the active scope: `null` until it lands, or when the
   * read is unavailable. Exposed for diagnostics; `selfServiceDisabled` is what
   * the UI uses.
   */
  policySelfServiceEnabled: boolean | null;
  /** Re-reads definitions and values for the active organization. */
  refresh: () => Promise<void>;
  /** Accept the renderer's next values record. */
  updateValues: (next: DemographicValues, change?: DemographicValueChange) => void;
  /** Validate and write the answered definitions. Resolves true on success. */
  save: () => Promise<boolean>;
}

/**
 * Identity of a loaded scope: which organization's data belongs on screen.
 *
 * Both halves matter. Switching organization must refetch, and switching
 * membership within one organization selects a different member's answers.
 */
const scopeOf = (organizationId?: string | null, membershipId?: string | null): string =>
  `${organizationId || ''}::${membershipId || ''}`;

const EMPTY_VALUES: DemographicValues = {};
const EMPTY_DEFINITIONS: DemographicDefinition[] = [];
const EMPTY_ERRORS: DemographicErrors = {};

/**
 * Read `OrganizationDemographicsPolicy.selfServiceEnabled` for one organization.
 *
 * `Organization.demographicsPolicy` is a USER-readable field resolved by
 * `DemographicResolver.organizationPolicy` (and defaulted server-side), so a
 * member can know the policy *before* attempting a write. Every failure mode —
 * no transport, a rejected call, a GraphQL error envelope, an organization the
 * caller cannot see, a payload without the field — resolves to `null`, which the
 * caller treats as "unknown": the server remains authoritative and a refusal on
 * save still produces the same read-only state.
 */
export const readSelfServicePolicy = async (
  reactory: any,
  organizationId: string,
): Promise<boolean | null> => {
  if (!reactory || typeof reactory.graphqlQuery !== 'function' || !organizationId) return null;

  try {
    const result = await reactory.graphqlQuery(
      ORGANIZATION_DEMOGRAPHICS_POLICY,
      { organizationId },
      { fetchPolicy: 'network-only' },
    );

    if (envelopeErrorsOf(result)) return null;

    const organization =
      result && result.data ? result.data[OPERATIONS.organizationDemographicsPolicy] : null;
    const value = organization?.demographicsPolicy?.selfServiceEnabled;

    return typeof value === 'boolean' ? value : null;
  } catch {
    return null;
  }
};

export const useMyDemographics = (
  options: UseMyDemographicsOptions,
): UseMyDemographicsResult => {
  const {
    reactory,
    organizationId,
    membershipId,
    selfServiceEnabled: selfServiceOverride,
    autoLoad = true,
  } = options || ({} as UseMyDemographicsOptions);

  const activeOrganizationId = organizationId ? `${organizationId}` : '';
  const scope = scopeOf(activeOrganizationId, membershipId);

  const [definitions, setDefinitions] = useState<DemographicDefinition[]>(EMPTY_DEFINITIONS);
  const [values, setValues] = useState<DemographicValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  /**
   * The scope the state above actually describes. Render state is derived by
   * comparing this with the scope the props ask for, which is what removes the
   * one-frame window where a prop change had landed but the read effect had not
   * yet cleared the previous organization's answers.
   */
  const [loadedScope, setLoadedScope] = useState<string>('');
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DemographicErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [selfServiceBlocked, setSelfServiceBlocked] = useState<boolean>(false);
  const [policySelfServiceEnabled, setPolicySelfServiceEnabled] = useState<boolean | null>(null);

  const mountedRef = useRef<boolean>(true);
  const sequenceRef = useRef<number>(0);
  const scopeRef = useRef<string>('');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const read = useCallback(async (): Promise<void> => {
    // A new organization/membership invalidates everything on screen. Clearing
    // here — and, for anything the member can already see, by deriving the
    // render state from `loadedScope` — is what guarantees a previous
    // organization's answers are never rendered, validated or saved against
    // this one, even if the new read is slow or fails.
    const scopeChanged = scopeRef.current !== scope;
    scopeRef.current = scope;

    const sequence = sequenceRef.current + 1;
    sequenceRef.current = sequence;

    setLoadError(null);
    setFormError(null);
    setFieldErrors({});

    if (scopeChanged) {
      setValues(EMPTY_VALUES);
      setDefinitions(EMPTY_DEFINITIONS);
      setSelfServiceBlocked(false);
      // A write that was in flight belongs to the previous scope; its result is
      // discarded when it lands (see `save`) and its spinner must not follow the
      // member into the new organization.
      setSaving(false);
      // The policy belongs to the previous organization: forget it rather than
      // letting org A's read-only state govern org B's form.
      setPolicySelfServiceEnabled(null);
      setHasLoaded(false);
    }

    if (!activeOrganizationId) {
      setDefinitions(EMPTY_DEFINITIONS);
      setValues(EMPTY_VALUES);
      // "No organization" *is* the settled state for that scope: there is
      // nothing to fetch. Stamping it keeps a save's "select an organization"
      // message visible instead of deriving it away, while `hasLoaded` stays
      // false so the section never claims a form is ready.
      setLoadedScope(scope);
      setHasLoaded(false);
      setLoading(false);
      return;
    }

    if (!reactory || typeof reactory.graphqlQuery !== 'function') {
      setLoadError(API_UNAVAILABLE_MESSAGE);
      // Also a settled read for this scope — otherwise the banner would be
      // gated behind a spinner that never resolves.
      setLoadedScope(scope);
      setHasLoaded(true);
      setLoading(false);
      return;
    }

    setLoading(true);

    const valueVariables: Record<string, any> = { organizationId: activeOrganizationId };
    if (membershipId) valueVariables.membershipId = `${membershipId}`;

    try {
      // Definitions, values and the policy are read together: rendering the form
      // with one and not the others would flash empty fields over stored answers
      // (or show an editable form for an organization that forbids edits).
      const [definitionsResult, valuesResult, policyResult] = await Promise.all([
        reactory.graphqlQuery(
          ORGANIZATION_DEMOGRAPHIC_DEFINITIONS,
          { organizationId: activeOrganizationId, includeDisabled: false },
          { fetchPolicy: 'network-only' },
        ),
        reactory.graphqlQuery(MY_DEMOGRAPHICS, valueVariables, { fetchPolicy: 'network-only' }),
        readSelfServicePolicy(reactory, activeOrganizationId),
      ]);

      if (sequence !== sequenceRef.current || !mountedRef.current) return;

      // A policy read that failed leaves `null` (assume the server default,
      // enabled) and never fails the screen: the write still reports a refusal.
      setPolicySelfServiceEnabled(policyResult);

      // `envelopeErrorsOf`, not "is there a message": an error object without
      // text is still a failure.
      const definitionsFailure = envelopeErrorsOf(definitionsResult);
      const valuesFailure = envelopeErrorsOf(valuesResult);

      if (definitionsFailure || valuesFailure) {
        setLoadError(
          serverMessageOf(definitionsFailure || valuesFailure) || LOAD_FALLBACK_MESSAGE,
        );
        // Apply whatever did arrive so a partial failure still shows something
        // useful; the banner explains the gap.
      }

      const definitionPayload =
        definitionsResult && definitionsResult.data
          ? definitionsResult.data[OPERATIONS.organizationDemographicDefinitions]
          : null;
      const valuePayload =
        valuesResult && valuesResult.data ? valuesResult.data[OPERATIONS.myDemographics] : null;

      setDefinitions(Array.isArray(definitionPayload) ? definitionPayload : []);
      setValues(toValuesRecord(Array.isArray(valuePayload) ? valuePayload : []));
      setLoadedScope(scope);
      setHasLoaded(true);
    } catch (caught: any) {
      if (sequence !== sequenceRef.current || !mountedRef.current) return;
      setDefinitions(EMPTY_DEFINITIONS);
      setValues(EMPTY_VALUES);
      setLoadError(serverMessageOf(caught) || LOAD_FALLBACK_MESSAGE);
      setLoadedScope(scope);
      setHasLoaded(true);
    } finally {
      if (sequence === sequenceRef.current && mountedRef.current) setLoading(false);
    }
  }, [activeOrganizationId, membershipId, reactory, scope]);

  useEffect(() => {
    if (!autoLoad) return;
    void read();
  }, [autoLoad, read]);

  const updateValues = useCallback((next: DemographicValues, change?: DemographicValueChange) => {
    setValues(next || {});
    setFormError(null);

    if (!change || !change.key) return;

    // Editing a field clears its inline server/local error immediately, so the
    // member sees the message disappear with the correction that fixes it.
    setFieldErrors((previous) => {
      if (!previous || previous[change.key] === undefined) return previous;
      const nextErrors = { ...previous };
      delete nextErrors[change.key];
      return nextErrors;
    });
  }, []);

  const applySaveFailure = useCallback((caught: any, sentKeys: string[]): void => {
    const failure = describeSaveFailure(caught, sentKeys);

    if (failure.selfServiceDisabled) {
      // A policy refusal is a state, not an error: the section switches to its
      // read-only explanation and keeps the values on screen.
      setSelfServiceBlocked(true);
      setFieldErrors({});
      setFormError(null);
      return;
    }

    const mappedKeys = Object.keys(failure.fieldErrors);
    setFieldErrors(failure.fieldErrors);

    if (mappedKeys.length > 0) {
      // Every message has a field to sit under: a form-level banner would only
      // repeat them. Anything the server could not attribute still surfaces.
      setFormError(failure.unmapped.length > 0 ? failure.unmapped[0] : null);
      return;
    }

    setFormError(failure.message || failure.unmapped[0] || SAVE_FALLBACK_MESSAGE);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setFormError(null);
    setFieldErrors({});

    if (!activeOrganizationId) {
      setFormError('Select an organization before saving your demographics.');
      return false;
    }

    /**
     * Anchor the write to the scope it was started for.
     *
     * Both are read from refs, not from the closure: `read()` rewrites
     * `scopeRef` the instant the organization or membership changes, and bumps
     * `sequenceRef` on every read, so a mutation that is still in flight when
     * the member switches organization is detectable when its response lands.
     * Being detectable is what stops org A's saved values, its field errors and
     * a policy refusal aimed at org A from appearing over org B's form.
     */
    const startScopeToken = scopeRef.current;
    const startSequence = sequenceRef.current;
    const stillCurrentScope = (): boolean =>
      mountedRef.current &&
      scopeRef.current === startScopeToken &&
      sequenceRef.current === startSequence;

    const renderable = selectRenderableDefinitions(definitions);

    // Required fields block the save; optional ones may be written partially.
    const missingRequired = requiredFieldErrors(renderable, values);
    if (Object.keys(missingRequired).length > 0) {
      setFieldErrors(missingRequired);
      setFormError('Please complete the required fields before saving.');
      return false;
    }

    const payload = buildSavePayload(renderable, values);
    if (payload.length === 0) {
      // Nothing answered: there is nothing to write, and an empty mutation
      // would only produce an empty result.
      return true;
    }

    if (!reactory || typeof reactory.graphqlMutation !== 'function') {
      setFormError(API_UNAVAILABLE_MESSAGE);
      return false;
    }

    const variables: Record<string, any> = {
      organizationId: activeOrganizationId,
      values: payload,
    };
    if (membershipId) variables.membershipId = `${membershipId}`;

    const sentKeys = payload.map((entry) => entry.key);

    setSaving(true);
    try {
      const result = await reactory.graphqlMutation(MY_SAVE_DEMOGRAPHICS, variables, {
        fetchPolicy: 'network-only',
      });

      const envelopeFailure = envelopeErrorsOf(result);
      if (envelopeFailure) {
        // A rejection for the previous organization is not an error the member
        // should see over the new one.
        if (!stillCurrentScope()) return false;
        applySaveFailure(envelopeFailure, sentKeys);
        return false;
      }

      const savedValues =
        result && result.data ? result.data[OPERATIONS.mySaveDemographics] : null;

      // The write itself already happened, for the organization it was started
      // for; only the *state* it would paint is scope-dependent. Discarding the
      // merge is what stops org A's saved answer appearing over org B's form.
      if (stillCurrentScope() && Array.isArray(savedValues)) {
        // The mutation response is the truth: merge the server's records over
        // the local draft rather than assuming the payload was stored verbatim.
        const records = toValuesRecord(savedValues);
        setValues((previous) => ({ ...previous, ...records }));
      }

      // Fixed copy only — a value (sensitive or otherwise) must never be echoed
      // into a notification.
      if (reactory.createNotification) {
        reactory.createNotification(SAVE_SUCCESS_NOTIFICATION, { type: 'success' });
      }
      return true;
    } catch (caught: any) {
      // Same rule for the failure path: no field errors, no form banner and no
      // read-only flip when the scope moved under the write.
      if (!stillCurrentScope()) return false;
      applySaveFailure(caught, sentKeys);
      // Deliberately no error payload in the log line: it could carry values.
      if (reactory.log) {
        reactory.log('Demographics save failed', { organizationId: activeOrganizationId });
      }
      return false;
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [activeOrganizationId, applySaveFailure, definitions, membershipId, reactory, values]);

  /**
   * Does the state below describe the scope the props currently ask for?
   *
   * When it does not, the render view is the empty/unknown one: no definitions,
   * no values, no errors and no policy. That is what makes the stale frame
   * impossible — a prop change cannot paint the previous organization's answers
   * even before the read effect runs.
   */
  const scopeMatches = loadedScope === scope;

  const effectiveDefinitions = scopeMatches ? definitions : EMPTY_DEFINITIONS;
  const effectiveValues = scopeMatches ? values : EMPTY_VALUES;
  const effectiveFieldErrors = scopeMatches ? fieldErrors : EMPTY_ERRORS;
  const effectiveFormError = scopeMatches ? formError : null;
  const effectivePolicy = scopeMatches ? policySelfServiceEnabled : null;

  // The host override is scope-independent (it describes the viewer, not the
  // organization), so it applies even while the new scope's policy is unknown.
  const effectiveSelfService =
    typeof selfServiceOverride === 'boolean'
      ? selfServiceOverride
      : effectivePolicy === null
        ? true
        : effectivePolicy;

  return {
    definitions: effectiveDefinitions,
    values: effectiveValues,
    loading,
    hasLoaded: hasLoaded && scopeMatches,
    saving: saving && scopeMatches,
    loadError,
    fieldErrors: effectiveFieldErrors,
    formError: effectiveFormError,
    selfServiceDisabled:
      (scopeMatches && selfServiceBlocked) || effectiveSelfService === false,
    policySelfServiceEnabled: effectivePolicy,
    refresh: read,
    updateValues,
    save,
  };
};

export default useMyDemographics;
