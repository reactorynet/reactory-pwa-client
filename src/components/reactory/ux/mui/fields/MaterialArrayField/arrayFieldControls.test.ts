import { computeArrayControls } from './arrayFieldControls';

describe('computeArrayControls', () => {
  it('enables add and delete by default (optional array with items)', () => {
    const c = computeArrayControls({ itemCount: 2 });
    expect(c.addAllowed).toBe(true);
    expect(c.addDisabled).toBe(false);
    expect(c.removeAllowed).toBe(true);
    expect(c.canRemoveItem).toBe(true);
  });

  it('allows deleting the last item of an OPTIONAL array (min 0)', () => {
    const c = computeArrayControls({ itemCount: 1, required: false });
    expect(c.canRemoveItem).toBe(true); // 1 > 0
  });

  it('protects the required minimum: cannot delete the last item when required', () => {
    const c = computeArrayControls({ itemCount: 1, required: true });
    expect(c.requiredMinItems).toBe(1);
    expect(c.canRemoveItem).toBe(false); // 1 > 1 is false
    // but adding is still allowed
    expect(c.addAllowed).toBe(true);
    expect(c.addDisabled).toBe(false);
  });

  it('honours an explicit minItems', () => {
    expect(computeArrayControls({ itemCount: 2, minItems: 2 }).canRemoveItem).toBe(false);
    expect(computeArrayControls({ itemCount: 3, minItems: 2 }).canRemoveItem).toBe(true);
  });

  it('disables add once maxItems is reached', () => {
    expect(computeArrayControls({ itemCount: 3, maxItems: 3 }).addDisabled).toBe(true);
    expect(computeArrayControls({ itemCount: 2, maxItems: 3 }).addDisabled).toBe(false);
    // still rendered, just disabled
    expect(computeArrayControls({ itemCount: 3, maxItems: 3 }).addAllowed).toBe(true);
  });

  it('respects explicit opt-outs', () => {
    expect(computeArrayControls({ itemCount: 1, allowAdd: false }).addAllowed).toBe(false);
    expect(computeArrayControls({ itemCount: 1, addable: false }).addAllowed).toBe(false);
    expect(computeArrayControls({ itemCount: 1, canAdd: false }).addAllowed).toBe(false);
    expect(computeArrayControls({ itemCount: 2, allowDelete: false }).removeAllowed).toBe(false);
  });

  it('disables add and hides delete when readonly/disabled', () => {
    const ro = computeArrayControls({ itemCount: 2, readonly: true });
    expect(ro.addDisabled).toBe(true);
    expect(ro.removeAllowed).toBe(false);
    const dis = computeArrayControls({ itemCount: 2, disabled: true });
    expect(dis.addDisabled).toBe(true);
  });
});
