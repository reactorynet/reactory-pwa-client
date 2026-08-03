import { createPositionAnimator } from '../utils/positionAnimator';
import { createPositionStore } from '../hooks/useGraphStore';

describe('positionAnimator', () => {
  it('interpolates from -> to and completes exactly at the target', () => {
    const animator = createPositionAnimator();
    const store = createPositionStore();
    animator.animate(1, { x: 0, y: 0 }, { x: 100, y: 200 });

    const start = performance.now();
    const midActive = animator.step(store, start + 100);
    expect(midActive).toBe(true);
    const mid = store.get(1)!;
    expect(mid.x).toBeGreaterThan(0);
    expect(mid.x).toBeLessThan(100);

    const endActive = animator.step(store, start + 10_000);
    expect(endActive).toBe(false);
    expect(store.get(1)).toEqual({ x: 100, y: 200 });
    expect(animator.active).toBe(false);
  });

  it('eases out (moves faster early than late)', () => {
    const animator = createPositionAnimator();
    const store = createPositionStore();
    animator.animate(1, { x: 0, y: 0 }, { x: 100, y: 0 }, { duration: 100 });
    const start = performance.now();
    animator.step(store, start + 50);
    const halfway = store.get(1)!.x;
    // Ease-out cubic at t=0.5 is 0.875 — well past linear halfway.
    expect(halfway).toBeGreaterThan(60);
  });

  it('fires the batch onComplete exactly once, after all tweens finish', () => {
    const animator = createPositionAnimator();
    const store = createPositionStore();
    const onComplete = jest.fn();
    animator.animateMany(
      [
        { id: 1, from: { x: 0, y: 0 }, to: { x: 10, y: 0 } },
        { id: 2, from: { x: 0, y: 0 }, to: { x: 20, y: 0 } },
      ],
      { onComplete }
    );
    const start = performance.now();
    animator.step(store, start + 1);
    expect(onComplete).not.toHaveBeenCalled();
    animator.step(store, start + 10_000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('fires onComplete immediately for an empty batch', () => {
    const animator = createPositionAnimator();
    const onComplete = jest.fn();
    animator.animateMany([], { onComplete });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cancel stops a tween without writing further positions', () => {
    const animator = createPositionAnimator();
    const store = createPositionStore();
    store.set(1, { x: 0, y: 0 });
    animator.animate(1, { x: 0, y: 0 }, { x: 100, y: 0 });
    animator.cancel(1);
    const version = store.version;
    expect(animator.step(store, performance.now() + 10_000)).toBe(false);
    // step() with no tweens returns before touching the store.
    expect(store.version).toBe(version);
    expect(store.get(1)).toEqual({ x: 0, y: 0 });
  });

  it('replaces a running tween for the same id', () => {
    const animator = createPositionAnimator();
    const store = createPositionStore();
    animator.animate(1, { x: 0, y: 0 }, { x: 100, y: 0 });
    animator.animate(1, { x: 0, y: 0 }, { x: -50, y: 0 });
    animator.step(store, performance.now() + 10_000);
    expect(store.get(1)).toEqual({ x: -50, y: 0 });
  });
});
