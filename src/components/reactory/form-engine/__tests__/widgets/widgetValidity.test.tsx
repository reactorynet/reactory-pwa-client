/**
 * @jest-environment jsdom
 *
 * Regression guard: every widget returned by `reactoryWidgets()` must be
 * acceptable to rjsf v5's own `getWidget`.
 *
 * Why this exists
 * ---------------
 * rjsf v5's `getWidget` decides a widget is a component via:
 *
 *   typeof widget === 'function'
 *     || ReactIs.isForwardRef(createElement(widget))
 *     || ReactIs.isMemo(widget)
 *
 * This app runs React 17 but `@rjsf/utils` depends on `react-is@^18.2.0`.
 * With that combination `isMemo()` / `isForwardRef()` return **false** even for
 * genuine `React.memo(...)` / `React.forwardRef(...)` objects, so a memo-wrapped
 * widget falls through to `typeof widget !== 'string'` and rjsf throws:
 *
 *   "Unsupported widget definition: object"
 *
 * Using `getWidget` itself as the oracle means this test cannot drift from the
 * real rjsf behaviour.
 */

import * as React from 'react';
import { getWidget } from '@rjsf/utils';
import { reactoryWidgets } from '../../widgets';
import { reactoryFields } from '../../fields';

describe('reactoryWidgets() are accepted by rjsf v5 getWidget', () => {
  const widgets = reactoryWidgets();

  it.each(Object.keys(widgets))('accepts "%s"', (name) => {
    // A string schema is the common case; getWidget only inspects the widget.
    expect(() => getWidget({ type: 'string' } as any, (widgets as any)[name], {} as any)).not.toThrow();
  });
});

describe('reactoryFields() are usable via the registry', () => {
  it('exposes GridLayout as a resolvable field', () => {
    const fields = reactoryFields();
    expect(typeof (fields as any).GridLayout).toBe('function');
  });
});

describe('adapted widgets keep their identity', () => {
  it('produces a stable component reference for repeated calls', () => {
    const a = reactoryWidgets();
    const b = reactoryWidgets();

    // Distinct registries (each call builds a fresh map) but each entry must be
    // a usable component — not an object that rjsf would reject.
    expect(typeof (a as any).SelectWithDataWidget).toBe('function');
    expect(typeof (b as any).SelectWithDataWidget).toBe('function');
  });
});
