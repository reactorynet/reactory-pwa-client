/**
 * Helpers for treating a JSON Schema as a tree for the visual schema editor.
 *
 * The editor renders the schema as a single flat, depth-indented list inside one
 * react-beautiful-dnd Droppable. rbd cannot reliably resolve nested Droppables
 * (when several overlap it falls back to an arbitrary distance heuristic) and it
 * forbids nested Draggables, so a flat list + `combine` (drop onto a container)
 * is the only reliable way to support arbitrary-depth nesting.
 *
 * Paths use dot notation and mirror the draggable/droppable id convention:
 *   "address"            → schema.properties.address
 *   "address.city"       → schema.properties.address.properties.city
 *   "tags.items"         → schema.properties.tags.items
 *   "tags.items.name"    → schema.properties.tags.items.properties.name
 */

export interface FlatRow {
  /** Dot path to this node from the schema root. */
  path: string;
  /** Dot path to the containing node ('' for a root-level field). */
  parentPath: string;
  /** The last path segment — the property key, or 'items' for array items. */
  displayKey: string;
  /** Nesting depth (0 = root level). Used for indentation. */
  depth: number;
  /** The schema node for this row. */
  field: any;
  /** True when this row is an array's `items` schema (not a normal property). */
  isArrayItem: boolean;
  /** True when this node can contain nested fields (object or array). */
  isContainer: boolean;
}

export const isContainerNode = (node: any): boolean =>
  node?.type === 'object' || node?.type === 'array';

/** Build the JSON schema for a brand new field of the given palette type. */
export const createFieldSchema = (type: string) => ({
  type,
  title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
  properties: type === 'object' ? {} : undefined,
});

/**
 * Depth-first flatten of the schema into an ordered list of rows. The order
 * matches the rendered order, so a row's array index equals its rbd Draggable
 * index.
 */
export const flattenSchema = (schema: any): FlatRow[] => {
  const rows: FlatRow[] = [];

  const recurse = (node: any, nodePath: string, depth: number) => {
    if (node?.type === 'object') {
      const props = node.properties || {};
      Object.keys(props).forEach((key) => {
        const field = props[key];
        const path = nodePath ? `${nodePath}.${key}` : key;
        rows.push({
          path,
          parentPath: nodePath,
          displayKey: key,
          depth,
          field,
          isArrayItem: false,
          isContainer: isContainerNode(field),
        });
        recurse(field, path, depth + 1);
      });
    } else if (node?.type === 'array' && node.items) {
      const path = nodePath ? `${nodePath}.items` : 'items';
      rows.push({
        path,
        parentPath: nodePath,
        displayKey: 'items',
        depth,
        field: node.items,
        isArrayItem: true,
        isContainer: isContainerNode(node.items),
      });
      recurse(node.items, path, depth + 1);
    }
  };

  recurse(schema, '', 0);
  return rows;
};

/**
 * Navigate to a node by its dot path. Handles both object properties and the
 * array `items` segment. Returns null when the path cannot be resolved.
 */
export const navigateToField = (root: any, path: string): any => {
  if (!path) return root;
  let current = root;
  for (const part of path.split('.')) {
    if (current?.properties && current.properties[part] !== undefined) {
      current = current.properties[part];
    } else if (current?.items && part === 'items') {
      current = current.items;
    } else {
      return null;
    }
  }
  return current;
};

/**
 * Add a child field into a container node.
 *   object → adds a new property (using preferredKey when free, else generated)
 *   array  → sets `items` (only when empty — arrays hold a single items schema)
 * Returns true on success.
 */
export const addChildField = (container: any, field: any, preferredKey?: string): boolean => {
  if (container?.type === 'object') {
    container.properties = container.properties || {};
    let key =
      preferredKey && container.properties[preferredKey] === undefined
        ? preferredKey
        : `field_${new Date().getTime()}`;
    while (container.properties[key] !== undefined) {
      key = `field_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
    }
    container.properties[key] = field;
    return true;
  }
  if (container?.type === 'array') {
    if (container.items) return false;
    container.items = field;
    return true;
  }
  return false;
};

/**
 * Insert a new field as a sibling immediately after the field at `siblingPath`,
 * preserving property order. No-op (returns false) when the sibling is an array
 * item or its parent is not an object. Returns true on success.
 */
export const insertSibling = (root: any, siblingPath: string, field: any): boolean => {
  const parts = siblingPath.split('.');
  const siblingKey = parts[parts.length - 1];
  if (siblingKey === 'items') return false; // array items have no siblings
  const parent = navigateToField(root, parts.slice(0, -1).join('.'));
  if (!parent?.properties) return false;

  const keys = Object.keys(parent.properties);
  const at = keys.indexOf(siblingKey);
  if (at < 0) return false;

  let newKey = `field_${new Date().getTime()}`;
  while (parent.properties[newKey] !== undefined) {
    newKey = `field_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
  }

  const ordered = [...keys];
  ordered.splice(at + 1, 0, newKey);
  const rebuilt: Record<string, any> = {};
  ordered.forEach((k) => { rebuilt[k] = k === newKey ? field : parent.properties[k]; });
  parent.properties = rebuilt;
  return true;
};

/**
 * Detach (remove) a field by path, returning { key, field } or null. Also
 * removes the key from the parent's `required` list. Handles array items.
 */
export const detachField = (root: any, path: string): { key: string; field: any } | null => {
  const parts = path.split('.');
  const key = parts[parts.length - 1];
  const parentPath = parts.slice(0, -1).join('.');
  const parent = navigateToField(root, parentPath);
  if (!parent) return null;

  if (key === 'items' && parent.items) {
    const field = parent.items;
    delete parent.items;
    return { key, field };
  }

  if (parent.properties && parent.properties[key] !== undefined) {
    const field = parent.properties[key];
    delete parent.properties[key];
    if (Array.isArray(parent.required)) {
      parent.required = parent.required.filter((k: string) => k !== key);
    }
    return { key, field };
  }

  return null;
};
