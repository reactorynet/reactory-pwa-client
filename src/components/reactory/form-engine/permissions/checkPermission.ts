/**
 * RBAC-aware field permissions, per 08-enterprise-capabilities.md section 4.
 *
 * Authors annotate fields with:
 *
 *   uiSchema.<fieldName>['ui:options'].permission = {
 *     read?:   string[];          // roles that may see the field
 *     write?:  string[];          // roles that may edit the field
 *     redact?: 'mask' | 'omit' | 'placeholder'; // how to render disallowed
 *   }
 *
 * `checkFieldPermission` translates that into render-time decisions:
 *   - read denied  → `hide: true`
 *   - write denied → `readonly: true`
 *   - redact mode  → forwarded so a future widget-level redactor can
 *                    decide whether to render '***', omit, or show the
 *                    placeholder. Phase 3 wires hide/readonly only;
 *                    widget-level redaction is Phase 4.
 *
 * Fail-closed when ui:permission is set but no permissions service is
 * available — surfaces a misconfiguration loudly rather than silently
 * granting access.
 */

export type RedactMode = 'mask' | 'omit' | 'placeholder';

export interface UiPermission {
  read?: string[];
  write?: string[];
  redact?: RedactMode;
}

export interface PermissionsService {
  /**
   * Return true when the current principal holds the given role.
   * The `roles` array is OR-ed: any match grants access.
   */
  hasAny: (roles: string[]) => boolean;
}

export interface PermissionResolveDeps {
  reactory: {
    permissions?: PermissionsService;
    log?: (msg: string, params?: unknown) => void;
    debug?: (msg: string, params?: unknown) => void;
  };
}

export interface PermissionDecision {
  hide: boolean;
  readonly: boolean;
  redact: RedactMode | undefined;
}

const ALLOW_ALL: PermissionDecision = { hide: false, readonly: false, redact: undefined };

/**
 * Read a `ui:permission` directive from a uiSchema entry. Returns undefined
 * when the entry doesn't have one (the field is unrestricted).
 */
export function readUiPermission(
  uiSchema: Record<string, unknown> | undefined,
): UiPermission | undefined {
  if (!uiSchema) return undefined;
  const direct = uiSchema['ui:permission'] as UiPermission | undefined;
  if (direct && typeof direct === 'object') return direct;
  const options = uiSchema['ui:options'] as { permission?: UiPermission } | undefined;
  if (options?.permission && typeof options.permission === 'object') return options.permission;
  return undefined;
}

/**
 * Resolve a permission directive against the supplied permissions service.
 *
 * Returns the all-allow decision when there is no `ui:permission` directive
 * (the field is unrestricted by RBAC). Returns the all-deny decision when
 * a directive IS set but no permissions service is wired — fails closed on
 * misconfigured installs.
 */
export function checkFieldPermission(
  uiSchema: Record<string, unknown> | undefined,
  deps: PermissionResolveDeps,
): PermissionDecision {
  const permission = readUiPermission(uiSchema);
  if (!permission) return ALLOW_ALL;

  const svc = deps.reactory.permissions;
  if (!svc) {
    deps.reactory.log?.(
      '[form-engine] ui:permission directive set but reactory.permissions service is missing; ' +
        'field hidden + readonly to fail closed.',
      { permission },
    );
    return { hide: true, readonly: true, redact: permission.redact };
  }

  const readGrant = !permission.read || permission.read.length === 0
    ? true
    : svc.hasAny(permission.read);
  const writeGrant = !permission.write || permission.write.length === 0
    ? true
    : svc.hasAny(permission.write);

  return {
    hide: !readGrant,
    readonly: !writeGrant,
    redact: !readGrant ? permission.redact : undefined,
  };
}
