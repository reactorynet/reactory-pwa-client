export const ensureFqn = (fqn?: string | null): string => {
  if (!fqn) {
    return '';
  }
  const trimmed = fqn.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.indexOf('@') > 0 ? trimmed : `${trimmed}@1.0.0`;
};

export const fqnMatches = (registered?: string | null, expected?: string | null): boolean => {
  if (!registered || !expected) {
    return false;
  }
  return registered === expected || ensureFqn(registered) === ensureFqn(expected);
};

export const parseFqnParts = (fqn?: string | null): { nameSpace: string; name: string; version: string } => {
  const ensured = ensureFqn(fqn);
  if (!ensured) {
    return { nameSpace: '', name: '', version: '' };
  }
  const [id, version = '1.0.0'] = ensured.split('@');
  const separator = id.lastIndexOf('.');
  if (separator < 0) {
    return { nameSpace: '', name: id, version };
  }
  return {
    nameSpace: id.slice(0, separator),
    name: id.slice(separator + 1),
    version,
  };
};

export const nearbyRegistryFqns = (
  register: Record<string, unknown> | undefined,
  fqn?: string | null,
  limit = 12,
): string[] => {
  if (!register || !fqn) {
    return [];
  }
  const { name, nameSpace } = parseFqnParts(fqn);
  const needle = (name || nameSpace || '').toLowerCase();
  if (!needle) {
    return [];
  }
  return Object.keys(register)
    .filter((key) => key.toLowerCase().includes(needle))
    .slice(0, limit);
};
