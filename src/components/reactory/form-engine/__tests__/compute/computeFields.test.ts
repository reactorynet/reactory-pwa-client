import {
  collectComputeDirectives,
  getAtPath,
  setAtPath,
  applyComputedFields,
} from '../../compute/computeFields';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

describe('collectComputeDirectives', () => {
  it('returns empty list for an empty uiSchema', () => {
    expect(collectComputeDirectives({})).toEqual([]);
  });

  it('returns empty list for non-object inputs', () => {
    expect(collectComputeDirectives(undefined)).toEqual([]);
    expect(collectComputeDirectives(null)).toEqual([]);
    expect(collectComputeDirectives('string')).toEqual([]);
  });

  it('finds a top-level compute directive', () => {
    const fn = () => 1;
    const out = collectComputeDirectives({
      total: { 'ui:options': { compute: fn } },
    });
    expect(out).toEqual([{ path: 'total', directive: { compute: fn, computeOn: undefined } }]);
  });

  it('finds a nested compute directive with dotted path', () => {
    const fn = () => 1;
    const out = collectComputeDirectives({
      summary: {
        total: { 'ui:options': { compute: fn } },
      },
    });
    expect(out).toEqual([{ path: 'summary.total', directive: { compute: fn, computeOn: undefined } }]);
  });

  it('captures computeOn whitelist when supplied', () => {
    const fn = () => 1;
    const out = collectComputeDirectives({
      total: { 'ui:options': { compute: fn, computeOn: ['items'] } },
    });
    expect(out[0].directive.computeOn).toEqual(['items']);
  });

  it('ignores ui:* keys when traversing', () => {
    const fn = () => 1;
    const out = collectComputeDirectives({
      'ui:order': ['a', 'b'],
      'ui:options': { something: 1 },
      total: { 'ui:options': { compute: fn } },
    });
    expect(out.map((o) => o.path)).toEqual(['total']);
  });

  it('does not produce a directive for the root when there is no path prefix', () => {
    // A compute at the very root would have empty path; we skip those.
    const fn = () => 1;
    const out = collectComputeDirectives({ 'ui:options': { compute: fn } });
    expect(out).toEqual([]);
  });
});

describe('getAtPath', () => {
  it('returns the root for an empty path', () => {
    expect(getAtPath({ a: 1 }, '')).toEqual({ a: 1 });
  });

  it('reads single-segment paths', () => {
    expect(getAtPath({ a: 1 }, 'a')).toBe(1);
  });

  it('reads nested paths', () => {
    expect(getAtPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined when a segment is missing', () => {
    expect(getAtPath({ a: 1 }, 'a.b.c')).toBeUndefined();
  });

  it('returns undefined for null/undefined inputs', () => {
    expect(getAtPath(undefined, 'a')).toBeUndefined();
    expect(getAtPath(null, 'a')).toBeUndefined();
  });
});

describe('setAtPath', () => {
  it('sets a top-level value without mutating the input', () => {
    const before = { a: 1 };
    const after = setAtPath(before, 'a', 2);
    expect(after).toEqual({ a: 2 });
    expect(before).toEqual({ a: 1 });
  });

  it('creates intermediate objects when missing', () => {
    const after = setAtPath({}, 'a.b.c', 42);
    expect(after).toEqual({ a: { b: { c: 42 } } });
  });

  it('preserves sibling keys at every level', () => {
    const before = { a: { b: 1, c: 2 } };
    const after = setAtPath(before, 'a.c', 3);
    expect(after).toEqual({ a: { b: 1, c: 3 } });
  });

  it('returns the value unchanged for an empty path', () => {
    expect(setAtPath({ x: 1 }, '', 'replaced')).toBe('replaced');
  });
});

describe('applyComputedFields', () => {
  it('returns the input by reference when there are no directives', () => {
    const formData = { a: 1 };
    expect(applyComputedFields({}, formData, {})).toBe(formData);
  });

  it('returns the input by reference when no directive changes a value', () => {
    const formData = { total: 42 };
    const uiSchema = { total: { 'ui:options': { compute: () => 42 } } };
    expect(applyComputedFields(uiSchema, formData, {})).toBe(formData);
  });

  it('applies a single function directive', () => {
    const formData = { items: [{ price: 10 }, { price: 20 }], total: 0 };
    const uiSchema = {
      total: {
        'ui:options': {
          compute: ({ formData: f }: { formData: unknown }) => {
            const items = (f as { items?: Array<{ price: number }> }).items ?? [];
            return items.reduce((s, it) => s + it.price, 0);
          },
        },
      },
    };
    const out = applyComputedFields(uiSchema, formData, {}) as typeof formData;
    expect(out.total).toBe(30);
    expect(out).not.toBe(formData);
  });

  it('exposes formContext + currentValue + path to the compute function', () => {
    let captured: unknown;
    const uiSchema = {
      label: {
        'ui:options': {
          compute: (args: unknown) => {
            captured = args;
            return 'next';
          },
        },
      },
    };
    applyComputedFields(uiSchema, { label: 'prev' }, { tenant: 'acme' });
    expect(captured).toMatchObject({
      formData: { label: 'prev' },
      formContext: { tenant: 'acme' },
      currentValue: 'prev',
      path: 'label',
    });
  });

  it('chains multiple directives applying in declared order', () => {
    const formData = { a: 1, b: 0, c: 0 };
    const uiSchema = {
      b: { 'ui:options': { compute: ({ formData: f }: { formData: unknown }) => (f as { a: number }).a * 2 } },
      c: { 'ui:options': { compute: ({ formData: f }: { formData: unknown }) => (f as { b: number }).b + 10 } },
    };
    const out = applyComputedFields(uiSchema, formData, {}) as typeof formData;
    expect(out.b).toBe(2);
    expect(out.c).toBe(12); // sees the just-updated b
  });

  it('logs and skips a string-form compute (JSONata not yet supported)', () => {
    const reactory = createMockReactorySDK();
    const uiSchema = { total: { 'ui:options': { compute: '$sum(items.price)' } } };
    const formData = { total: undefined as number | undefined };
    const out = applyComputedFields(uiSchema, formData, {}, { reactory }) as typeof formData;
    expect(out).toBe(formData); // no change
    expect(reactory.logCalls.some((l) => l.message.includes('JSONata'))).toBe(true);
  });

  it('catches a throwing compute function and leaves the field unchanged', () => {
    const reactory = createMockReactorySDK();
    const uiSchema = {
      total: {
        'ui:options': {
          compute: () => {
            throw new Error('compute exploded');
          },
        },
      },
    };
    const formData = { total: 5 };
    const out = applyComputedFields(uiSchema, formData, {}, { reactory }) as typeof formData;
    expect(out.total).toBe(5);
    expect(reactory.logCalls.some((l) => l.message.includes('compute function at "total" threw'))).toBe(true);
  });

  it('handles non-function non-string compute values gracefully (no-op)', () => {
    const formData = { x: 1 };
    const uiSchema = { x: { 'ui:options': { compute: 42 as unknown as () => number } } };
    expect(applyComputedFields(uiSchema, formData, {})).toBe(formData);
  });

  it('applies to nested paths', () => {
    const formData = { summary: { total: 0 }, items: [{ p: 5 }] };
    const uiSchema = {
      summary: {
        total: {
          'ui:options': {
            compute: ({ formData: f }: { formData: unknown }) => {
              const items = (f as { items?: Array<{ p: number }> }).items ?? [];
              return items.reduce((s, it) => s + it.p, 0);
            },
          },
        },
      },
    };
    const out = applyComputedFields(uiSchema, formData, {}) as typeof formData;
    expect(out.summary.total).toBe(5);
  });
});
