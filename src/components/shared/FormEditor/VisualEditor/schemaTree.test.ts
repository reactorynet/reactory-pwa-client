/**
 * Unit tests for the visual schema editor tree helpers. These cover the data
 * transformations behind the drag-and-drop nesting behaviour (the DnD wiring
 * itself is exercised in the browser).
 */

import {
  flattenSchema,
  navigateToField,
  addChildField,
  insertSibling,
  detachField,
  isContainerNode,
} from './schemaTree';

// address (object) → { city }, and tags (array) → items (object) → { label }
const sampleSchema = () => ({
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        city: { type: 'string', title: 'City' },
      },
      required: ['city'],
    },
    tags: {
      type: 'array',
      title: 'Tags',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
        },
      },
    },
  },
});

describe('flattenSchema', () => {
  it('produces depth-first rows with correct paths, depths and container flags', () => {
    const rows = flattenSchema(sampleSchema());
    expect(rows.map((r) => `${r.path}@${r.depth}`)).toEqual([
      'name@0',
      'address@0',
      'address.city@1',
      'tags@0',
      'tags.items@1',
      'tags.items.label@2',
    ]);

    const items = rows.find((r) => r.path === 'tags.items')!;
    expect(items.isArrayItem).toBe(true);
    expect(items.isContainer).toBe(true);

    const city = rows.find((r) => r.path === 'address.city')!;
    expect(city.parentPath).toBe('address');
    expect(city.isContainer).toBe(false);
  });
});

describe('navigateToField', () => {
  it('resolves object, nested object and array-item paths', () => {
    const s = sampleSchema();
    expect(navigateToField(s, 'address').title).toBe('Address');
    expect(navigateToField(s, 'address.city').title).toBe('City');
    expect(navigateToField(s, 'tags.items').type).toBe('object');
    expect(navigateToField(s, 'tags.items.label').type).toBe('string');
    expect(navigateToField(s, 'nope.missing')).toBeNull();
  });
});

describe('addChildField (nesting)', () => {
  it('nests a field into a nested object (object-in-object)', () => {
    const s = sampleSchema();
    const target = navigateToField(s, 'address');
    expect(isContainerNode(target)).toBe(true);
    expect(addChildField(target, { type: 'string', title: 'New String' })).toBe(true);
    const keys = Object.keys(s.properties.address.properties);
    expect(keys).toContain('city');
    expect(keys.length).toBe(2); // city + the new field
  });

  it("nests a field into an array's object item (the previously broken case)", () => {
    const s = sampleSchema();
    const target = navigateToField(s, 'tags.items');
    expect(addChildField(target, { type: 'number', title: 'Count' })).toBe(true);
    const itemProps = Object.keys(s.properties.tags.items.properties);
    expect(itemProps).toContain('label');
    expect(itemProps.length).toBe(2);
  });

  it('sets items on an empty array but not when items already exist', () => {
    const arr: any = { type: 'array' };
    expect(addChildField(arr, { type: 'object', properties: {} })).toBe(true);
    expect(arr.items.type).toBe('object');
    // second attempt is rejected — arrays hold a single items schema
    expect(addChildField(arr, { type: 'string' })).toBe(false);
  });

  it('does not nest into a scalar', () => {
    expect(addChildField({ type: 'string' }, { type: 'string' })).toBe(false);
  });
});

describe('insertSibling', () => {
  it('inserts a new field immediately after a scalar sibling', () => {
    const s = sampleSchema();
    expect(insertSibling(s, 'name', { type: 'boolean' })).toBe(true);
    const keys = Object.keys(s.properties);
    expect(keys[0]).toBe('name');
    expect(keys[1]).toMatch(/^field_/); // inserted right after name
    expect(keys).toContain('address');
  });

  it('refuses to add a sibling to an array item', () => {
    const s = sampleSchema();
    expect(insertSibling(s, 'tags.items', { type: 'string' })).toBe(false);
  });
});

describe('detachField', () => {
  it('removes a deeply nested field and clears it from required', () => {
    const s = sampleSchema();
    const detached = detachField(s, 'address.city');
    expect(detached?.key).toBe('city');
    expect(s.properties.address.properties.city).toBeUndefined();
    expect(s.properties.address.required).toEqual([]);
  });

  it("removes a field nested inside an array's object item", () => {
    const s = sampleSchema();
    const detached = detachField(s, 'tags.items.label');
    expect(detached?.field.type).toBe('string');
    expect(s.properties.tags.items.properties.label).toBeUndefined();
  });

  it('removes an array items schema', () => {
    const s = sampleSchema();
    expect(detachField(s, 'tags.items')?.field.type).toBe('object');
    expect(s.properties.tags.items).toBeUndefined();
  });
});
