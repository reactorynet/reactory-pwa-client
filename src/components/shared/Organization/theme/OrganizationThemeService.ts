import Reactory from '@reactorynet/reactory-core';
import { ReactoryApiEventNames } from '../../../../api/ApiEventNames';
import OrganizationQueries from '../graph/queries';
import { resolveOrganizationTheme } from './resolveOrganizationTheme';
import {
  IOrganizationBranding,
  IThemeResolution,
  OrganizationThemeMode,
} from './types';

/**
 * The only API surface this service needs. Declared structurally so the
 * service can be unit tested with a plain object and so the (large) Reactory
 * SDK type does not have to be widened for every consumer.
 */
export interface IOrganizationThemeReactory {
  getUser?: () => any;
  getTheme?: () => Reactory.UX.IReactoryTheme;
  graphqlQuery?: (query: any, variables?: any) => Promise<any>;
  emit?: (event: string, payload?: any) => any;
  log?: (message: string, params?: unknown, level?: string) => void;
  /**
   * Installed on ReactoryApi by ORG-014. When absent the resolution still
   * returns its result; it simply cannot publish the override to getTheme().
   */
  setThemeOverride?: (theme: Reactory.UX.IReactoryTheme | null) => void;
}

export interface IOrganizationThemeServiceOptions {
  /** Upper bound for the branding fetch; a slow organization must not stall boot. */
  timeoutMs?: number;
  storage?: Storage | null;
}

/** The key `useOrganization.setDefaultOrganization` already persists to. */
export const DEFAULT_ORGANIZATION_STORAGE_KEY = 'CoreDefaultOrganization';

/** Written by `App.onSystemThemeChanged` and the header's mode toggle. */
export const THEME_MODE_STORAGE_KEY = '$reactory$theme_mode';

/**
 * Raised (AMQ) by the admin organization surfaces after an organization - and
 * therefore potentially its branding - has been saved. The server's own
 * OrganizationOverviewTab publishes it as both the event id and the channel.
 */
export const ORGANIZATION_UPDATED_EVENT = 'core.OrganizationUpdatedEvent';

/** Bounded so an unreachable branding query cannot delay the authenticated tree. */
export const DEFAULT_THEME_RESOLUTION_TIMEOUT_MS = 2500;

const LIGHT: OrganizationThemeMode = 'light';
const DARK: OrganizationThemeMode = 'dark';

/**
 * Resolves and publishes the active organization's theme (ORG-014).
 *
 * Order of resolution lives in `resolveOrganizationTheme`; this class owns the
 * I/O around it:
 *
 *  - fetches the organization branding with one query,
 *  - caches the *organization document* (never a resolved theme) for the
 *    session so `themeMode: 'os'` changes and `onThemeChanged` re-application
 *    need no network round trip,
 *  - publishes the resolved theme through `reactory.setThemeOverride()`, which
 *    makes `reactory.getTheme()` - and therefore `App.applyTheme` - the single
 *    source of truth,
 *  - persists the active organization id under `CoreDefaultOrganization` and
 *    emits `onThemeChanged` so App re-applies without a page reload.
 *
 * Every public method is failure tolerant: it logs and falls back to the client
 * theme instead of throwing, because it runs during boot and during auth
 * transitions where a rejected promise would leave a blank screen.
 */
export class OrganizationThemeService {
  private cachedOrganization: IOrganizationBranding | null = null;
  private cachedOrganizationId: string | null = null;
  private lastResolution: IThemeResolution | null = null;
  private inFlight: Promise<IThemeResolution> | null = null;
  private inFlightOrganizationId: string | null = null;
  /**
   * The token the in-flight request was issued under. Joining is only safe when
   * that token is still current: after `reset()` or a no-organization resolve
   * the in-flight promise is already stale, and handing it to a new caller
   * would give that caller a discarded (client-theme) resolution instead of
   * fetching the branding it asked for.
   */
  private inFlightToken: number | null = null;
  /**
   * Monotonic token identifying the newest theme request. A response whose
   * token is no longer current is discarded instead of applied, so a slow
   * response for the *previous* organization can never overwrite the newly
   * selected organization's override or cache (last request wins, not last
   * response). Bumped by every public entry point, including `reset()`.
   */
  private requestToken = 0;

  constructor(
    private readonly reactory: IOrganizationThemeReactory,
    private readonly options: IOrganizationThemeServiceOptions = {},
  ) {}

  /** The last resolution this service published. Diagnostics/tests only. */
  getLastResolution(): IThemeResolution | null {
    return this.lastResolution;
  }

  /**
   * The organization the theme should be resolved for.
   *
   * Order: the organization this browser persisted (`CoreDefaultOrganization`,
   * written by `OrganizationSelector` via `setActiveOrganization`) and the
   * session is still a member of, then the server's active organization for the
   * session. A persisted id the current user is not a member of is ignored so
   * one user's choice cannot theme another user's session.
   *
   * An anonymous session never resolves an organization: the persisted choice
   * belongs to the previous user and must not theme the login screen.
   */
  getActiveOrganizationId(): string | null {
    if (this.getLoggedInContext() === null) return null;

    const serverOrganizationId = this.getServerOrganizationId();
    const persistedId = this.getPersistedOrganizationId();

    if (persistedId === null) return serverOrganizationId;

    const memberships = this.getMemberships();
    if (memberships !== null && memberships.length > 0) {
      const isMember = memberships.some(
        (membership: any) => membership?.organization?.id === persistedId,
      );
      if (isMember === false) return serverOrganizationId;
    }

    return persistedId;
  }

  getPersistedOrganizationId(): string | null {
    try {
      const value = this.getStorage()?.getItem(DEFAULT_ORGANIZATION_STORAGE_KEY);
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch (error) {
      this.warn('Could not read the persisted default organization', { error });
      return null;
    }
  }

  /**
   * Resolves the active organization's theme (or a deterministic fallback) and
   * publishes it. Never rejects.
   */
  async resolve(options: { force?: boolean; organizationId?: string | null } = {}): Promise<IThemeResolution> {
    const organizationId = options.organizationId === undefined
      ? this.getActiveOrganizationId()
      : options.organizationId;

    if (organizationId === null || organizationId === undefined || organizationId === '') {
      // No organization for this session: the client theme is the effective
      // theme, and App keeps its own default when there is no client theme.
      // Bump the token so a still-in-flight fetch for a previous session can
      // never resurrect an organization override afterwards. `inFlight` is
      // intentionally left in place but is no longer joinable - its token is
      // stale - so a later resolve starts a fresh request instead of taking
      // this discarded one.
      this.requestToken += 1;
      return this.apply(
        resolveOrganizationTheme({
          organization: null,
          clientTheme: this.getClientTheme(),
          systemMode: this.getSystemMode(),
        }),
      );
    }

    if (options.force !== true && this.cachedOrganization !== null && this.cachedOrganizationId === organizationId) {
      // A cached re-application is not a new server request, so it must NOT
      // take a token: doing so would invalidate a forced refresh that is still
      // in flight (the core.OrganizationUpdatedEvent path) and silently drop
      // the freshly saved branding. The in-flight response, when it lands, is
      // newer than this cached result and correctly overwrites it.
      return this.apply(this.buildResolution(this.cachedOrganization));
    }

    // Join an in-flight request for the *same* organization only while that
    // request is still the current one. Joining a stale request (after a
    // reset or a no-organization resolve) would hand this caller a discarded
    // resolution and leave an authenticated session on the client theme until
    // the next theme event.
    if (
      this.inFlight !== null
      && this.inFlightOrganizationId === organizationId
      && this.inFlightToken === this.requestToken
    ) {
      return this.inFlight;
    }

    const token = (this.requestToken += 1);
    const load = this.loadAndApply(organizationId, token);
    this.inFlight = load;
    this.inFlightOrganizationId = organizationId;
    this.inFlightToken = token;

    try {
      return await load;
    } finally {
      if (this.inFlight === load) {
        this.inFlight = null;
        this.inFlightOrganizationId = null;
        this.inFlightToken = null;
      }
    }
  }

  /**
   * The single callable for an organization switch. Persists the selection,
   * re-resolves (always from the server so a freshly edited theme is picked
   * up) and emits `onThemeChanged`, which App answers by re-applying the theme
   * and refreshing the user snapshot - no page reload.
   */
  async setActiveOrganization(organization: IOrganizationBranding | string): Promise<IThemeResolution> {
    const organizationId = typeof organization === 'string' ? organization : organization?.id;

    if (!organizationId) {
      this.warn('Ignoring a request to activate an organization without an id');
      return this.lastResolution ?? this.resolve();
    }

    this.persistOrganizationId(organizationId);

    // A caller that already holds the full document (with themes) can skip the
    // fetch; the selector only has the list projection, so it goes to server.
    if (typeof organization !== 'string' && Array.isArray(organization.themes)) {
      // Switching away must invalidate every response still in flight for the
      // organization we just left.
      this.requestToken += 1;
      this.cachedOrganization = organization;
      this.cachedOrganizationId = organizationId;
      const resolution = this.apply(this.buildResolution(organization));
      this.emitThemeChanged();
      return resolution;
    }

    this.cachedOrganization = null;
    this.cachedOrganizationId = null;

    const resolution = await this.resolve({ force: true, organizationId });
    this.emitThemeChanged();
    return resolution;
  }

  /**
   * Re-resolves from the server and emits `onThemeChanged`. This is the hook the
   * Branding tab uses after saving a theme, and the documented on-demand path
   * for any other consumer that changed organization branding.
   */
  async refreshOrganizationTheme(): Promise<IThemeResolution> {
    const resolution = await this.resolve({ force: true });
    this.emitThemeChanged();
    return resolution;
  }

  /**
   * Handles `onThemeChanged` (header mode toggle, Branding save, org switch).
   * Uses the cached organization document when it still matches the active
   * organization, so a plain mode toggle costs no network round trip.
   */
  async handleThemeChanged(): Promise<IThemeResolution> {
    return this.resolve();
  }

  /**
   * Drops the organization override so the client theme applies again. Used on
   * logout, where the session no longer has an organization.
   */
  reset(): IThemeResolution {
    // A logout must invalidate any pending branding response: otherwise a slow
    // boot-time fetch could publish an organization override onto the login
    // screen after the session ended.
    this.requestToken += 1;
    this.cachedOrganization = null;
    this.cachedOrganizationId = null;
    return this.apply(
      resolveOrganizationTheme({
        organization: null,
        clientTheme: this.getClientTheme(),
        systemMode: this.getSystemMode(),
      }),
    );
  }

  /**
   * Re-applies an organization theme that asked for `themeMode: 'os'` after the
   * OS preference changed. Reuses the platform listener in App.tsx (this method
   * is called from it) rather than registering a second one.
   *
   * @returns true when the theme was re-resolved and the caller must re-apply.
   */
  handleSystemModeChanged(): boolean {
    if (this.lastResolution === null || this.lastResolution.requestedMode !== 'os') return false;
    if (this.cachedOrganization === null) return false;
    if (this.cachedOrganizationId !== this.getActiveOrganizationId()) return false;

    this.apply(this.buildResolution(this.cachedOrganization));
    return true;
  }

  // ── internals ────────────────────────────────────────────────────────────

  private async loadAndApply(organizationId: string, token: number): Promise<IThemeResolution> {
    try {
      const organization = await this.fetchOrganization(organizationId);

      // Last request wins. A response that arrives after a newer selection (or
      // after a logout) is discarded: it must not publish an override or
      // replace the cache for the organization the user is now on.
      if (this.isStale(token)) {
        return this.discardStale(organizationId);
      }

      if (organization === null) {
        // The query succeeded but no organization came back (deleted, or not
        // visible to this user). Deterministic fallback, never an empty theme.
        this.cachedOrganization = null;
        this.cachedOrganizationId = null;
        this.warn(
          `No organization found for theme resolution (id "${organizationId}") - falling back to the client theme.`,
        );
        return this.apply(
          resolveOrganizationTheme({
            organization: null,
            clientTheme: this.getClientTheme(),
            systemMode: this.getSystemMode(),
          }),
        );
      }

      this.cachedOrganization = organization;
      this.cachedOrganizationId = organizationId;
      return this.apply(this.buildResolution(organization));
    } catch (error) {
      if (this.isStale(token)) {
        return this.discardStale(organizationId);
      }

      // Failure tolerance: a failed or slow fetch must never block boot or
      // leave a blank screen. Fall back to the client theme and log.
      this.cachedOrganization = null;
      this.cachedOrganizationId = null;
      const message = error instanceof Error ? error.message : String(error);
      this.warn(
        `Could not resolve the theme for organization "${organizationId}" (${message}) - falling back to the client theme.`,
        { organizationId },
      );
      return this.apply(
        resolveOrganizationTheme({
          organization: null,
          clientTheme: this.getClientTheme(),
          systemMode: this.getSystemMode(),
        }),
      );
    }
  }

  /**
   * True when another request has been started since `token` was issued.
   *
   * The token alone is the criterion: every public entry point
   * (`resolve`, `setActiveOrganization`, `reset`) takes a new token, so a
   * response is stale exactly when it is not the answer to the newest request.
   * Comparing organization ids as well would misclassify a legitimate forced
   * refresh for a different organization as stale.
   */
  private isStale(token: number): boolean {
    return token !== this.requestToken;
  }

  /**
   * Returns the currently published resolution without touching the override or
   * the cache. Used when a response lost the race; the caller (App) re-applies
   * from `reactory.getTheme()`, so the winner's theme is what renders.
   */
  private discardStale(organizationId: string): IThemeResolution {
    this.note(
      `Discarded a stale organization theme response for "${organizationId}"; a newer selection is active.`,
      { organizationId },
    );

    if (this.lastResolution !== null) return this.lastResolution;

    return resolveOrganizationTheme({
      organization: null,
      clientTheme: this.getClientTheme(),
      systemMode: this.getSystemMode(),
    });
  }

  /**
   * True when a `core.OrganizationUpdatedEvent` payload concerns the active
   * organization. The admin Branding tab publishes the event; payloads may be
   * empty (the server's own OrganizationOverviewTab publishes `{}`), in which
   * case the event is treated as relevant because there is only one active
   * organization in a session.
   */
  matchesOrganizationEvent(payload?: any): boolean {
    const activeOrganizationId = this.getActiveOrganizationId();
    if (activeOrganizationId === null) return false;

    const payloadId = payload?.organizationId ?? payload?.organization?.id ?? payload?.id ?? null;
    if (payloadId === null || payloadId === undefined || payloadId === '') return true;

    return `${payloadId}` === activeOrganizationId;
  }

  /**
   * Handles `core.OrganizationUpdatedEvent`: re-resolves from the server (the
   * theme documents themselves changed) and publishes, which emits
   * `onThemeChanged` so App re-applies without a reload. Returns `null` when the
   * event is for another organization.
   */
  async handleOrganizationUpdated(payload?: any): Promise<IThemeResolution | null> {
    if (this.matchesOrganizationEvent(payload) === false) {
      this.note('Ignoring core.OrganizationUpdatedEvent for another organization', { payload });
      return null;
    }

    return this.refreshOrganizationTheme();
  }

  private buildResolution(organization: IOrganizationBranding | null): IThemeResolution {
    const resolution = resolveOrganizationTheme({
      organization,
      clientTheme: this.getClientTheme(),
      systemMode: this.getSystemMode(),
    });

    if (resolution.warning) {
      this.warn(resolution.warning, { organizationId: organization?.id ?? null });
    }

    return resolution;
  }

  /**
   * Publishes the resolution to `ReactoryApi`. Only an organization theme is
   * published as an override; every fallback clears it so `getTheme()` returns
   * the server-resolved client theme again.
   */
  private apply(resolution: IThemeResolution): IThemeResolution {
    this.lastResolution = resolution;
    const override = resolution.source === 'organization' ? resolution.theme : null;

    if (typeof this.reactory.setThemeOverride === 'function') {
      try {
        this.reactory.setThemeOverride(override);
      } catch (error) {
        this.warn('Could not publish the resolved organization theme to the Reactory API', { error });
      }
    }

    return resolution;
  }

  private async fetchOrganization(organizationId: string): Promise<IOrganizationBranding | null> {
    if (typeof this.reactory.graphqlQuery !== 'function') {
      throw new Error('the Reactory API does not expose graphqlQuery');
    }

    const result = await this.withTimeout(
      this.reactory.graphqlQuery(OrganizationQueries.OrganizationTheme, { id: organizationId }),
      this.timeoutMs(),
    );

    if (result === null || result === undefined) return null;

    const error = (result as any).error;
    if (error) throw error instanceof Error ? error : new Error(String(error));

    const errors = (result as any).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      throw new Error(errors.map((entry: any) => entry?.message || String(entry)).join('; '));
    }

    return ((result as any).data?.CoreOrganization ?? null) as IOrganizationBranding | null;
  }

  private persistOrganizationId(organizationId: string): void {
    try {
      this.getStorage()?.setItem(DEFAULT_ORGANIZATION_STORAGE_KEY, organizationId);
    } catch (error) {
      // Persistence is a convenience for the next boot; the in-memory id is
      // still used for this session, so this is not fatal.
      this.warn('Could not persist the active organization', { organizationId, error });
    }
  }

  private emitThemeChanged(): void {
    if (typeof this.reactory.emit !== 'function') return;

    try {
      this.reactory.emit(ReactoryApiEventNames.onThemeChanged);
    } catch (error) {
      this.warn('Could not emit onThemeChanged after the organization theme was resolved', { error });
    }
  }

  /**
   * The client theme (resolution step 2): `reactory.getTheme()` is
   * `{ ...user.activeTheme, extensions }`, so reading `user.activeTheme` gives
   * the same theme without ever reading back this service's own override.
   * Reading `getTheme()` here would let one organization's theme become the
   * fallback for the next one - exactly the cache disagreement ORG-014 forbids.
   */
  private getClientTheme(): Reactory.UX.IReactoryTheme | null {
    try {
      const user = this.reactory.getUser?.();
      if (user) return (user.activeTheme as Reactory.UX.IReactoryTheme) ?? null;
    } catch (error) {
      this.warn('Could not read the client theme while resolving the organization theme', { error });
      return null;
    }

    // A host without a user snapshot falls back to getTheme(); in the shell
    // getUser() always exists, so this is only a safety net for embedders.
    if (typeof this.reactory.getTheme !== 'function') return null;

    try {
      return this.reactory.getTheme() ?? null;
    } catch (error) {
      this.warn('Could not read the client theme while resolving the organization theme', { error });
      return null;
    }
  }

  /**
   * Current OS colour scheme. `App.onSystemThemeChanged` already keeps the
   * storage key in sync; reading it means this module needs no second
   * `matchMedia` listener. `matchMedia` is only consulted when the key has not
   * been written yet.
   */
  getSystemMode(): OrganizationThemeMode {
    try {
      const stored = this.getStorage()?.getItem(THEME_MODE_STORAGE_KEY);
      if (stored === LIGHT || stored === DARK) return stored;
    } catch {
      // Ignore - fall through to matchMedia / the default.
    }

    try {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
      }
    } catch {
      // Ignore - non-browser environments fall through to the default.
    }

    return LIGHT;
  }

  private getLoggedInContext(): any | null {
    try {
      return this.reactory.getUser?.()?.loggedIn ?? null;
    } catch {
      return null;
    }
  }

  private getServerOrganizationId(): string | null {
    try {
      const organization = this.getLoggedInContext()?.organization;
      const id = organization?.id;
      return typeof id === 'string' && id.length > 0 ? id : null;
    } catch {
      return null;
    }
  }

  private getMemberships(): any[] | null {
    try {
      const memberships = this.reactory.getUser?.()?.loggedIn?.memberships;
      return Array.isArray(memberships) ? memberships : null;
    } catch {
      return null;
    }
  }

  private getStorage(): Storage | null {
    if (this.options.storage !== undefined) return this.options.storage;
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  private timeoutMs(): number {
    const configured = this.options.timeoutMs;
    return typeof configured === 'number' && configured >= 0
      ? configured
      : DEFAULT_THEME_RESOLUTION_TIMEOUT_MS;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (!(timeoutMs > 0)) return promise;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`the organization branding query timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  /** Informational log: expected control flow (races, unrelated events). */
  private note(message: string, params?: unknown): void {
    if (typeof this.reactory.log !== 'function') return;

    try {
      this.reactory.log(message, params, 'info');
    } catch {
      // Logging is best effort.
    }
  }

  private warn(message: string, params?: unknown): void {
    if (typeof this.reactory.log !== 'function') return;

    try {
      // `reactory.log(message, params, 'warn')` is the shell's convention for a
      // warning (see App.tsx); it must never be the reason resolution fails.
      this.reactory.log(message, params, 'warn');
    } catch {
      // Logging is best effort.
    }
  }
}

export default OrganizationThemeService;
