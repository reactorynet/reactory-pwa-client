import {
  checkFieldPermission,
  readUiPermission,
  type PermissionResolveDeps,
} from '../../permissions/checkPermission';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

const grantingService = (granted: string[]) => ({
  hasAny: (roles: string[]) => roles.some((r) => granted.includes(r)),
});

const mkDeps = (granted: string[] | null): PermissionResolveDeps => {
  const reactory = createMockReactorySDK();
  if (granted !== null) {
    (reactory as unknown as { permissions: unknown }).permissions = grantingService(granted);
  }
  return { reactory };
};

describe('readUiPermission', () => {
  it('returns undefined when uiSchema has no permission directive', () => {
    expect(readUiPermission({})).toBeUndefined();
    expect(readUiPermission(undefined)).toBeUndefined();
  });

  it('reads from the top-level ui:permission key', () => {
    const p = readUiPermission({ 'ui:permission': { read: ['admin'] } });
    expect(p).toEqual({ read: ['admin'] });
  });

  it('reads from ui:options.permission', () => {
    const p = readUiPermission({ 'ui:options': { permission: { write: ['admin'], redact: 'mask' } } });
    expect(p).toEqual({ write: ['admin'], redact: 'mask' });
  });

  it('prefers ui:permission over ui:options.permission when both are present', () => {
    const p = readUiPermission({
      'ui:permission': { read: ['top-level'] },
      'ui:options': { permission: { read: ['nested'] } },
    });
    expect(p).toEqual({ read: ['top-level'] });
  });

  it('returns undefined when permission is not an object', () => {
    expect(readUiPermission({ 'ui:permission': 'admin' })).toBeUndefined();
  });
});

describe('checkFieldPermission', () => {
  it('allows everything when there is no permission directive', () => {
    const decision = checkFieldPermission({}, mkDeps([]));
    expect(decision).toEqual({ hide: false, readonly: false, redact: undefined });
  });

  it('allows everything when read+write arrays are empty', () => {
    const decision = checkFieldPermission(
      { 'ui:permission': { read: [], write: [] } },
      mkDeps([]),
    );
    expect(decision.hide).toBe(false);
    expect(decision.readonly).toBe(false);
  });

  it('hides when the principal lacks any read role', () => {
    const decision = checkFieldPermission(
      { 'ui:permission': { read: ['admin', 'hr.lead'] } },
      mkDeps(['user']),
    );
    expect(decision.hide).toBe(true);
  });

  it('grants read when the principal holds at least one listed role (OR semantics)', () => {
    const decision = checkFieldPermission(
      { 'ui:permission': { read: ['admin', 'hr.lead'] } },
      mkDeps(['hr.lead']),
    );
    expect(decision.hide).toBe(false);
  });

  it('marks readonly when write is denied but read is allowed', () => {
    const decision = checkFieldPermission(
      { 'ui:permission': { read: ['user', 'admin'], write: ['admin'] } },
      mkDeps(['user']),
    );
    expect(decision.hide).toBe(false);
    expect(decision.readonly).toBe(true);
  });

  it('does not require a write list (defaults to write-allowed)', () => {
    const decision = checkFieldPermission(
      { 'ui:permission': { read: ['user'] } },
      mkDeps(['user']),
    );
    expect(decision.readonly).toBe(false);
  });

  it('forwards redact mode when read is denied', () => {
    const decision = checkFieldPermission(
      { 'ui:permission': { read: ['admin'], redact: 'mask' } },
      mkDeps(['user']),
    );
    expect(decision).toEqual({ hide: true, readonly: false, redact: 'mask' });
  });

  it('clears redact when read is granted (no redaction needed)', () => {
    const decision = checkFieldPermission(
      { 'ui:permission': { read: ['user'], redact: 'mask' } },
      mkDeps(['user']),
    );
    expect(decision.redact).toBeUndefined();
  });

  it('reads from ui:options.permission as well as the top-level key', () => {
    const decision = checkFieldPermission(
      { 'ui:options': { permission: { read: ['admin'] } } },
      mkDeps(['admin']),
    );
    expect(decision.hide).toBe(false);
  });

  describe('fail-closed when permissions service is missing', () => {
    it('hides AND marks readonly when a directive is set but no service is available', () => {
      const decision = checkFieldPermission(
        { 'ui:permission': { read: ['admin'] } },
        mkDeps(null),
      );
      expect(decision).toEqual({
        hide: true,
        readonly: true,
        redact: undefined,
      });
    });

    it('logs the misconfiguration for diagnostics', () => {
      const reactory = createMockReactorySDK();
      checkFieldPermission(
        { 'ui:permission': { read: ['admin'] } },
        { reactory },
      );
      expect(reactory.logCalls.some((l) => l.message.includes('reactory.permissions service is missing'))).toBe(true);
    });

    it('does not fail closed when there is no directive (no service required)', () => {
      const decision = checkFieldPermission({}, mkDeps(null));
      expect(decision.hide).toBe(false);
      expect(decision.readonly).toBe(false);
    });
  });
});
