/**
 * React 19 drops `defaultProps` on function and memo components (React 18.3
 * warns about it). This applies a component's defaults the way React did:
 * a default is used only where the prop is `undefined`, so an explicit `null`
 * or `false` from the caller is kept.
 */
export const applyDefaultProps = <P extends object, D extends object>(props: P, defaults: D): P & D => {
  const resolved: Record<string, unknown> = { ...(props as Record<string, unknown>) };
  for (const key of Object.keys(defaults)) {
    if (resolved[key] === undefined) resolved[key] = (defaults as Record<string, unknown>)[key];
  }
  return resolved as P & D;
};
