import React from 'react';

/**
 * The set of icon components exposed by the Material module
 * (`Material.MaterialIcons`, i.e. `@mui/icons-material`).
 */
export type MaterialIconRegistry = Record<string, unknown>;

/** A Material icon component (or any component we can render as an element). */
export type ResolvedFormIcon = React.ElementType;

/**
 * Normalises a form icon identifier into the PascalCase export name used by
 * `@mui/icons-material`.
 *
 * Form authors write icons in whatever casing feels natural in YAML
 * ("SupervisedUserCircle", "table_view", "supervised-user-circle"), while the
 * icon package only exports the PascalCase name. Normalising here means a form
 * never needs to know about the icon package's naming rules.
 */
export const toMaterialIconName = (iconName: string): string =>
  (iconName || '')
    .trim()
    .split(/[\s._-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

/**
 * A value is usable as a component when React can render it: either a function
 * component / class, or an exotic component object (`React.memo`,
 * `React.forwardRef` - both carry a `$$typeof` symbol).
 */
const isRenderableComponent = (value: unknown): value is ResolvedFormIcon => {
  if (typeof value === 'function') return true;
  if (value && typeof value === 'object') {
    return '$$typeof' in (value as Record<string, unknown>);
  }
  return false;
};

/**
 * Resolves a form's `icon` identifier to a Material icon component.
 *
 * Resolution order:
 *   1. exact export name ("SupervisedUserCircle")
 *   2. normalised export name ("table_view" -> "TableView")
 *   3. case-insensitive match against the registry, so a form that declares
 *      "supervisedusercircle" still renders the right icon
 *
 * Returns `null` when the identifier is empty or cannot be resolved, which lets
 * the caller fall back to the form's initial letter. Resolution is intentionally
 * forgiving (it never throws) because the icon comes from user authored YAML.
 */
export const resolveFormIcon = (
  MaterialIcons: MaterialIconRegistry | null | undefined,
  iconName?: string | null
): ResolvedFormIcon | null => {
  if (!MaterialIcons || typeof MaterialIcons !== 'object') return null;
  if (typeof iconName !== 'string') return null;

  const identifier = iconName.trim();
  if (identifier.length === 0) return null;

  const candidates = [identifier, toMaterialIconName(identifier)].filter(
    (candidate) => candidate.length > 0
  );

  for (const candidate of candidates) {
    const icon = MaterialIcons[candidate];
    if (isRenderableComponent(icon)) return icon;
  }

  const requested = identifier.toLowerCase();
  for (const [exportName, icon] of Object.entries(MaterialIcons)) {
    if (exportName.toLowerCase() !== requested) continue;
    if (isRenderableComponent(icon)) return icon;
  }

  return null;
};

/**
 * Returns the form's image url (`avatar` is the image field on a form
 * definition) or `undefined` when the form has no usable image.
 */
export const getFormImageSrc = (form?: { avatar?: string | null } | null): string | undefined => {
  const src = form?.avatar;
  if (typeof src !== 'string') return undefined;
  const trimmed = src.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export default resolveFormIcon;
